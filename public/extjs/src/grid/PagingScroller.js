/**
 * This class monitors scrolling of the {@link Ext.view.Table TableView} within a
 * {@link Ext.grid.Panel GridPanel} which is using a buffered store to only cache
 * and render a small section of a very large dataset.
 *
 * The GridPanel will instantiate this to perform monitoring, this class should
 * never be instantiated by user code.
 */
Ext.define('Ext.grid.PagingScroller', {

    /**
     * @cfg
     * @deprecated This config is now ignored.
     */
    percentageFromEdge: 0.35,

    /**
     * @cfg
     * The zone which causes a refresh of the rendered viewport. As soon as the edge
     * of the rendered grid is this number of rows from the edge of the viewport, the view is moved.
     */
    numFromEdge: 2,

    /**
     * @cfg
     * The number of extra rows to render on the trailing side of scrolling
     * **outside the {@link #numFromEdge}** buffer as scrolling proceeds.
     */
    trailingBufferZone: 5,

    /**
     * @cfg
     * The number of extra rows to render on the leading side of scrolling
     * **outside the {@link #numFromEdge}** buffer as scrolling proceeds.
     */
    leadingBufferZone: 15,

    /**
     * @cfg
     * This is the time in milliseconds to buffer load requests when scrolling the PagingScrollbar.
     */
    scrollToLoadBuffer: 200,

    // private. Initial value of zero.
    viewSize: 0,
    // private. Start at default value
    rowHeight: 21,
    // private. Table extent at startup time
    tableStart: 0,
    tableEnd: 0,

    constructor: function(config) {
        var me = this;
        me.variableRowHeight = config.variableRowHeight;
        me.bindView(config.view);
        Ext.apply(me, config);
        me.callParent(arguments);
    },

    bindView: function(view) {
        var me = this,
            viewListeners = {
                scroll: {
                    fn: me.onViewScroll,
                    element: 'el',
                    scope: me
                },
                render: me.onViewRender,
                resize: me.onViewResize,
                boxready: {
                    fn: me.onViewResize,
                    scope: me,
                    single: true
                },
                refresh: me.onViewRefresh,
                scope: me
            },
            storeListeners = {
                guaranteedrange: me.onGuaranteedRange,
                scope: me
            },
            gridListeners = {
                reconfigure: me.onGridReconfigure,
                scope: me
            };

        // If there are variable row heights, then in beforeRefresh, we have to find a common
        // row so that we can synchronize the table's top position after the refresh
        if (me.variableRowHeight) {
            viewListeners.beforerefresh = me.beforeViewRefresh;
        }

        // If we need unbinding...
        if (me.view) {
            me.view.el.un('scroll', me.onViewScroll, me); // un does not understand the element options
            me.view.un(viewListeners);
            me.store.un(storeListeners);
            if (me.grid) {
                me.grid.un(gridListeners);
            }
            delete me.view.refreshSize; // Remove the injected refreshSize implementation
        }

        me.view = view;
        me.grid = me.view.up('tablepanel');
        me.store = view.store;
        if (view.rendered) {
            me.viewSize = me.store.viewSize = Math.ceil(view.getHeight() / me.rowHeight) + me.trailingBufferZone + (me.numFromEdge * 2) + me.leadingBufferZone;
        }

        // During scrolling we do not need to refresh the height - the Grid height must be set by config or layout in order to create a scrollable
        // table just larger than that, so removing the layout call improves efficiency and removes the flicker when the
        // HeaderContainer is reset to scrollLeft:0, and then resynced on the very next "scroll" event.
        me.view.refreshSize = Ext.Function.createInterceptor(me.view.refreshSize, me.beforeViewrefreshSize, me);

        /**
         * @property {Number} position
         * Current pixel scroll position of the associated {@link Ext.view.Table View}.
         */
        me.position = 0;

        // We are created in View constructor. There won't be an ownerCt at this time.
        if (me.grid) {
            me.grid.on(gridListeners);
        } else {
            me.view.on({
                added: function() {
                    me.grid = me.view.up('tablepanel');
                    me.grid.on(gridListeners);
                },
                single: true
            });
        }

        me.view.on(me.viewListeners = viewListeners);
        me.store.on(storeListeners);
    },

    onGridReconfigure: function (grid) {
        this.bindView(grid.view);
    },

    // Ensure that the stretcher element is inserted into the View as the first element.
    onViewRender: function() {
        var me = this,
            el = me.view.el;

        el.setStyle('position', 'relative');
        me.stretcher = el.createChild({
            style:{
                position: 'absolute',
                width: '1px',
                height: 0,
                top: 0,
                left: 0
            }
        }, el.dom.firstChild);
    },

    onViewResize: function(view, width, height) {
        var me = this,
            newViewSize;

        newViewSize = Math.ceil(height / me.rowHeight) + me.trailingBufferZone + (me.numFromEdge * 2) + me.leadingBufferZone;
        if (newViewSize > me.viewSize) {
            me.viewSize = me.store.viewSize = newViewSize;
            me.handleViewScroll(me.lastScrollDirection || 1);
        }
    },

    // Used for variable row heights. Try to find the offset from scrollTop of a common row
    beforeViewRefresh: function() {
        var me = this,
            view = me.view,
            rows,
            direction = me.lastScrollDirection;

        me.commonRecordIndex = undefined;

        // If we are refreshing in response to a scroll,
        // And we know where the previous start was,
        // and we're not teleporting out of visible range
        if (direction && (me.previousStart !== undefined) && (me.scrollProportion === undefined)) {
            rows = view.getNodes();

            // We have scrolled downwards
            if (direction === 1) {

                // If the ranges overlap, we are going to be able to position the table exactly
                if (me.tableStart <= me.previousEnd) {
                    me.commonRecordIndex = rows.length - 1;

                }
            }
            // We have scrolled upwards
            else if (direction === -1) {

                // If the ranges overlap, we are going to be able to position the table exactly
                if (me.tableEnd >= me.previousStart) {
                    me.commonRecordIndex = 0;
                }
            }
            // Cache the old offset of the common row from the scrollTop
            me.scrollOffset = -view.el.getOffsetsTo(rows[me.commonRecordIndex])[1];

            // In the new table the common row is at a different index
            me.commonRecordIndex -= (me.tableStart - me.previousStart);
        } else {
            me.scrollOffset = undefined;
        }
    },

    // Used for variable row heights. Try to find the offset from scrollTop of a common row
    // Ensure, upon each refresh, that the stretcher element is the correct height
    onViewRefresh: function() {
        var me = this,
            store = me.store,
            newScrollHeight,
            view = me.view,
            viewEl = view.el,
            viewDom = viewEl.dom,
            rows,
            newScrollOffset,
            scrollDelta,
            table = viewEl.child('table', true),
            tableTop,
            scrollTop;

        // Scroll events caused by processing in here must be ignored, so disable for the duration
        me.disabled = true;

        // No scroll monitoring is needed if
        //    All data is in view OR
        //  Store is filtered locally.
        //    - scrolling a locally filtered page is obv a local operation within the context of a huge set of pages 
        //      so local scrolling is appropriate.
        if (store.getCount() === store.getTotalCount() || (store.isFiltered() && !store.remoteFilter)) {
            me.stretcher.setHeight(0);
            me.position = viewDom.scrollTop = 0;

            // Chrome's scrolling went crazy upon zeroing of the stretcher, and left the view's scrollTop stuck at -15
            // This is the only thing that fixes that
            table.style.position = 'absolute';

            // We remain disabled now because no scrolling is needed - we have the full dataset in the Store
            return;
        }

        me.stretcher.setHeight(newScrollHeight = me.getScrollHeight());

        scrollTop = viewDom.scrollTop;

        // Flag to the refreshSize interceptor that regular refreshSize postprocessing should be vetoed.
        me.isScrollRefresh = (scrollTop > 0);

        // If we have had to calculate the store position from the pure scroll bar position,
        // then we must calculate the table's vertical position from the scrollProportion
        if (me.scrollProportion !== undefined) {
            me.scrollProportion = scrollTop / (newScrollHeight - table.offsetHeight);
            table.style.position = 'absolute';
            table.style.top = (me.scrollProportion ? (newScrollHeight * me.scrollProportion) - (table.offsetHeight * me.scrollProportion) : 0) + 'px';
        }
        else {
            table.style.position = 'absolute';
            table.style.top = (tableTop = (me.tableStart||0) * me.rowHeight) + 'px';

            // ScrollOffset to a common row was calculated in beforeViewRefresh, so we can synch table position with how it was before
            if (me.scrollOffset) {
                rows = view.getNodes();
                newScrollOffset = -viewEl.getOffsetsTo(rows[me.commonRecordIndex])[1];
                scrollDelta = newScrollOffset - me.scrollOffset;
                me.position = (scrollTop += scrollDelta);
            }

            // If the table is not fully in view view, scroll to where it is in view.
            // This will happen when the page goes out of view unexpectedly, outside the
            // control of the PagingScroller. For example, a refresh caused by a remote sort or filter reverting
            // back to page 1.
            // Note that with buffered Stores, only remote sorting is allowed, otherwise the locally
            // sorted page will be out of order with the whole dataset.
            else if ((tableTop > scrollTop) || ((tableTop + table.offsetHeight) < scrollTop + viewDom.clientHeight)) {
                me.lastScrollDirection = -1;
                me.position = viewDom.scrollTop = tableTop;
            }
        }

        // Re-enable upon function exit
        me.disabled = false;
    },

    beforeViewrefreshSize: function() {
        // Veto the refreshSize if the refresh is due to a scroll.
        if (this.isScrollRefresh) {
            return (this.isScrollRefresh = false);
        }
    },

    onGuaranteedRange: function(range, start, end) {
        var me = this,
            ds = me.store;

        // this should never happen
        if (range.length && me.visibleStart < range[0].index) {
            return;
        }

        // Cache last table position in dataset so that if we are using variableRowHeight,
        // we can attempt to locate a common row to align the table on.
        me.previousStart = me.tableStart;
        me.previousEnd = me.tableEnd;

        me.tableStart = start;
        me.tableEnd = end;
        ds.loadRecords(range);
    },

    onViewScroll: function(e, t) {
        var me = this,
            view = me.view,
            lastPosition = me.position;

        me.position = view.el.dom.scrollTop;

        // Only check for nearing the edge if we are enabled.
        // If there is no paging to be done (Store's dataset is all in memory) we will be disabled.
        if (!me.disabled) {
            me.lastScrollDirection = me.position > lastPosition ? 1 : -1;
            // Check the position so we ignore horizontal scrolling
            if (lastPosition !== me.position) {
                me.handleViewScroll(me.lastScrollDirection);
            }
        }
    },

    handleViewScroll: function(direction) {
        var me                = this,
            store             = me.store,
            view              = me.view,
            viewSize          = me.viewSize,
            totalCount        = store.getTotalCount(),
            highestStartPoint = totalCount - viewSize,
            visibleStart      = me.getFirstVisibleRowIndex(),
            visibleEnd        = me.getLastVisibleRowIndex(),
            requestStart,
            requestEnd;

        // Only process if the total rows is larger than the visible page size
        if (totalCount >= viewSize) {

            // This is only set if we are using variable row height, and the thumb is dragged so that
            // There are no remaining visible rows to vertically anchor the new table to.
            // In this case we use the scrollProprtion to anchor the table to the correct relative
            // position on the vertical axis.
            me.scrollProportion = undefined;

            // We're scrolling up
            if (direction == -1) {
                if (visibleStart !== undefined) {
                    if (visibleStart < (me.tableStart + me.numFromEdge)) {
                        requestStart = Math.max(0, visibleEnd + me.trailingBufferZone - viewSize);
                    }
                }

                // The only way we can end up without a visible start is if, in variableRowHeight mode, the user drags
                // the thumb up out of the visible range. In this case, we have to estimate the start row index
                else {
                    // If we have no visible rows to orientate with, then use the scroll proportion
                    me.scrollProportion = view.el.dom.scrollTop / (view.el.dom.scrollHeight - view.el.dom.clientHeight);
                    requestStart = Math.max(0, totalCount * me.scrollProportion - (viewSize / 2) - me.numFromEdge - ((me.leadingBufferZone + me.trailingBufferZone) / 2));
                }
            }
            // We're scrolling down
            else {
                if (visibleStart !== undefined) {
                    if (visibleEnd > (me.tableEnd - me.numFromEdge)) {
                        requestStart = Math.max(0, visibleStart - me.trailingBufferZone);
                    }
                }

                // The only way we can end up without a visible end is if, in variableRowHeight mode, the user drags
                // the thumb down out of the visible range. In this case, we have to estimate the start row index
                else {
                    // If we have no visible rows to orientate with, then use the scroll proportion
                    me.scrollProportion = view.el.dom.scrollTop / (view.el.dom.scrollHeight - view.el.dom.clientHeight);
                    requestStart = totalCount * me.scrollProportion - (viewSize / 2) - me.numFromEdge - ((me.leadingBufferZone + me.trailingBufferZone) / 2);
                }
            }

            // We scrolled close to the edge and the Store needs reloading
            if (requestStart !== undefined) {
                // The calculation walked off the end; Request the highest possible chunk which starts on an even row count (Because of row striping)
                if (requestStart > highestStartPoint) {
                    requestStart = highestStartPoint & ~1;
                    requestEnd = totalCount - 1;
                }
                // Make sure first row is even to ensure correct even/odd row striping
                else {
                    requestStart = requestStart & ~1;
                    requestEnd = requestStart + viewSize - 1;
                }

                // If range is satsfied within the prefetch buffer, then just draw it from the prefetch buffer
                if (store.rangeCached(requestStart, requestEnd)) {
                    me.cancelLoad();
                    store.guaranteeRange(requestStart, requestEnd);
                }

                // Required range is not in the prefetch buffer. Ask the store to prefetch it.
                // We will recieve a guaranteedrange event when that is done.
                else {
                    me.attemptLoad(requestStart, requestEnd);
                }
            }
        }
    },

    getFirstVisibleRowIndex: function() {
        var me = this,
            store = me.store,
            view = me.view,
            scrollTop = view.el.dom.scrollTop,
            rows,
            count,
            i,
            rowBottom;

        if (me.variableRowHeight) {
            rows = view.getNodes();
            count = store.getCount();
            for (i = 0; i < count; i++) {
                rowBottom = Ext.fly(rows[i]).getOffsetsTo(view.el)[1] + rows[i].offsetHeight;

                // Searching for the first visible row, and off the bottom of the clientArea, then there's no visible first row!
                if (rowBottom > view.el.dom.clientHeight) {
                    return;
                }

                if (rowBottom > 0) {
                    return i + me.tableStart;
                }
            }
        } else {
            return Math.floor(scrollTop / me.rowHeight);
        }
    },

    getLastVisibleRowIndex: function() {
        var me = this,
            store = me.store,
            view = me.view,
            clientHeight = view.el.dom.clientHeight,
            rows,
            count,
            i,
            rowTop;

        if (me.variableRowHeight) {
            rows = view.getNodes();
            count = store.getCount();
            for (i = count - 1; i >= 0; i--) {
                rowTop = Ext.fly(rows[i]).getOffsetsTo(view.el)[1];

                // Searching for the last visible row, and off the top of the clientArea, then there's no visible last row!
                if (rowTop < 0) {
                    return;
                }
                if (rowTop < clientHeight) {
                    return i + me.tableStart;
                }
            }
        } else {
            return me.getFirstVisibleRowIndex() + Math.ceil(clientHeight / me.rowHeight) + 1;
        }
    },

    getScrollHeight: function() {
        var me = this,
            view   = me.view,
            table,
            firstRow,
            store  = me.store,
            deltaHeight = 0,
            doCalcHeight = !me.hasOwnProperty('rowHeight');

        if (me.variableRowHeight) {
            table = me.view.el.down('table', true);
            if (doCalcHeight) {
                me.initialTableHeight = table.offsetHeight;
                me.rowHeight = me.initialTableHeight / me.store.getCount();
            } else {
                deltaHeight = table.offsetHeight - me.initialTableHeight;
            }
        } else if (doCalcHeight) {
            firstRow = view.el.down(view.getItemSelector());
            if (firstRow) {
                me.rowHeight = firstRow.getHeight(false, true);
            }
        }

        return Math.floor(store.getTotalCount() * me.rowHeight) + deltaHeight;
    },

    attemptLoad: function(start, end) {
        var me = this;
        if (me.scrollToLoadBuffer) {
            if (!me.loadTask) {
                me.loadTask = new Ext.util.DelayedTask(me.doAttemptLoad, me, []);
            }
            me.loadTask.delay(me.scrollToLoadBuffer, me.doAttemptLoad, me, [start, end]);
        } else {
            me.store.guaranteeRange(start, end);
        }
    },

    cancelLoad: function() {
        if (this.loadTask) {
            this.loadTask.cancel();
        }
    },

    doAttemptLoad:  function(start, end) {
        this.store.guaranteeRange(start, end);
    },

    destroy: function() {
        var me = this,
            scrollListener = me.viewListeners.scroll;

        me.store.un({
            guaranteedrange: me.onGuaranteedRange,
            scope: me
        });
        me.view.un(me.viewListeners);
        if (me.view.rendered) {
            me.stretcher.remove();
            me.view.el.un('scroll', scrollListener.fn, scrollListener.scope);
        }
    }
});
