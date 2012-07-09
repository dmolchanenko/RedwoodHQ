/**
 * Base class from Ext.ux.TabReorderer.
 */
Ext.define('Ext.ux.BoxReorderer', {
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @cfg {String} itemSelector
     * <p>Optional. Defaults to <code>'.x-box-item'</code>
     * <p>A {@link Ext.DomQuery DomQuery} selector which identifies the encapsulating elements of child Components which participate in reordering.</p>
     */
    itemSelector: '.x-box-item',

    /**
     * @cfg {Mixed} animate
     * <p>Defaults to 300.</p>
     * <p>If truthy, child reordering is animated so that moved boxes slide smoothly into position.
     * If this option is numeric, it is used as the animation duration <b>in milliseconds</b>.</p>
     */
    animate: 100,

    constructor: function() {
        this.addEvents(
            /**
             * @event StartDrag
             * Fires when dragging of a child Component begins.
             * @param {Ext.ux.BoxReorderer} this
             * @param {Ext.container.Container} container The owning Container
             * @param {Ext.Component} dragCmp The Component being dragged
             * @param {Number} idx The start index of the Component being dragged.
             */
             'StartDrag',
            /**
             * @event Drag
             * Fires during dragging of a child Component.
             * @param {Ext.ux.BoxReorderer} this
             * @param {Ext.container.Container} container The owning Container
             * @param {Ext.Component} dragCmp The Component being dragged
             * @param {Number} startIdx The index position from which the Component was initially dragged.
             * @param {Number} idx The current closest index to which the Component would drop.
             */
             'Drag',
            /**
             * @event ChangeIndex
             * Fires when dragging of a child Component causes its drop index to change.
             * @param {Ext.ux.BoxReorderer} this
             * @param {Ext.container.Container} container The owning Container
             * @param {Ext.Component} dragCmp The Component being dragged
             * @param {Number} startIdx The index position from which the Component was initially dragged.
             * @param {Number} idx The current closest index to which the Component would drop.
             */
             'ChangeIndex',
            /**
             * @event Drop
             * Fires when a child Component is dropped at a new index position.
             * @param {Ext.ux.BoxReorderer} this
             * @param {Ext.container.Container} container The owning Container
             * @param {Ext.Component} dragCmp The Component being dropped
             * @param {Number} startIdx The index position from which the Component was initially dragged.
             * @param {Number} idx The index at which the Component is being dropped.
             */
             'Drop'
        );
        this.mixins.observable.constructor.apply(this, arguments);
    },

    init: function(container) {
        var me = this;
 
        me.container = container;
 
        // Set our animatePolicy to animate the start position (ie x for HBox, y for VBox)
        me.animatePolicy = {};
        me.animatePolicy[container.getLayout().names.x] = true;

        // Initialize the DD on first layout, when the innerCt has been created.
        me.container.afterLayout = Ext.Function.createSequence(me.container.afterLayout, me.afterFirstLayout, me);

        container.destroy = Ext.Function.createSequence(container.destroy, me.onContainerDestroy, me);
    },

    /**
     * @private Clear up on Container destroy
     */
    onContainerDestroy: function() {
        if (this.dd) {
            this.dd.unreg();
        }
    },

    afterFirstLayout: function() {
        var me = this,
            l = me.container.getLayout();

        // delete the sequence
        delete me.container.afterLayout;

        // Create a DD instance. Poke the handlers in.
        // TODO: Ext5's DD classes should apply config to themselves.
        // TODO: Ext5's DD classes should not use init internally because it collides with use as a plugin
        // TODO: Ext5's DD classes should be Observable.
        // TODO: When all the above are trus, this plugin should extend the DD class.
        me.dd = Ext.create('Ext.dd.DD', l.innerCt, me.container.id + '-reorderer');
        Ext.apply(me.dd, {
            animate: me.animate,
            reorderer: me,
            container: me.container,
            getDragCmp: this.getDragCmp,
            clickValidator: Ext.Function.createInterceptor(me.dd.clickValidator, me.clickValidator, me, false),
            onMouseDown: me.onMouseDown,
            startDrag: me.startDrag,
            onDrag: me.onDrag,
            endDrag: me.endDrag,
            getNewIndex: me.getNewIndex,
            doSwap: me.doSwap,
            findReorderable: me.findReorderable
        });

        // Decide which dimension we are measuring, and which measurement metric defines
        // the *start* of the box depending upon orientation.
        me.dd.dim = l.names.width;
        me.dd.startAttr = l.names.left;
        me.dd.endAttr = l.names.right;
    },

    getDragCmp: function(e) {
        return this.container.getChildByElement(e.getTarget(this.itemSelector, 10));
    },

    // check if the clicked component is reorderable
    clickValidator: function(e) {
        var cmp = this.getDragCmp(e);

        // If cmp is null, this expression MUST be coerced to boolean so that createInterceptor is able to test it against false
        return !!(cmp && cmp.reorderable !== false);
    },

    onMouseDown: function(e) {
        var me = this,
            container = me.container,
            containerBox,
            cmpEl,
            cmpBox;

        // Ascertain which child Component is being mousedowned
        me.dragCmp = me.getDragCmp(e);
        if (me.dragCmp) {
            cmpEl = me.dragCmp.getEl();
            me.startIndex = me.curIndex = container.items.indexOf(me.dragCmp);

            // Start position of dragged Component
            cmpBox = cmpEl.getPageBox();

            // Last tracked start position
            me.lastPos = cmpBox[this.startAttr];

            // Calculate constraints depending upon orientation
            // Calculate offset from mouse to dragEl position
            containerBox = container.el.getPageBox();
            if (me.dim === 'width') {
                me.minX = containerBox.left;
                me.maxX = containerBox.right - cmpBox.width;
                me.minY = me.maxY = cmpBox.top;
                me.deltaX = e.getPageX() - cmpBox.left;
            } else {
                me.minY = containerBox.top;
                me.maxY = containerBox.bottom - cmpBox.height;
                me.minX = me.maxX = cmpBox.left;
                me.deltaY = e.getPageY() - cmpBox.top;
            }
            me.constrainY = me.constrainX = true;
        }
    },

    startDrag: function() {
        var me = this;
        if (me.dragCmp) {
            // For the entire duration of dragging the *Element*, defeat any positioning and animation of the dragged *Component*
            me.dragCmp.setPosition = Ext.emptyFn;
            me.dragCmp.animate = false;

            // Animate the BoxLayout just for the duration of the drag operation.
            if (me.animate) {
                me.container.getLayout().animatePolicy = me.reorderer.animatePolicy;
            }
            // We drag the Component element
            me.dragElId = me.dragCmp.getEl().id;
            me.reorderer.fireEvent('StartDrag', me, me.container, me.dragCmp, me.curIndex);
            // Suspend events, and set the disabled flag so that the mousedown and mouseup events
            // that are going to take place do not cause any other UI interaction.
            me.dragCmp.suspendEvents();
            me.dragCmp.disabled = true;
            me.dragCmp.el.setStyle('zIndex', 100);
        } else {
            me.dragElId = null;
        }
    },

    /**
     * @private
     * Find next or previous reorderable component index.
     * @param {Number} newIndex The initial drop index.
     * @return {Number} The index of the reorderable component.
     */
    findReorderable: function(newIndex) {
        var me = this,
            items = me.container.items,
            newItem;

        if (items.getAt(newIndex).reorderable === false) {
            newItem = items.getAt(newIndex);
            if (newIndex > me.startIndex) {
                 while(newItem && newItem.reorderable === false) {
                    newIndex++;
                    newItem = items.getAt(newIndex);
                }
            } else {
                while(newItem && newItem.reorderable === false) {
                    newIndex--;
                    newItem = items.getAt(newIndex);
                }
            }
        }

        newIndex = Math.min(Math.max(newIndex, 0), items.getCount() - 1);

        if (items.getAt(newIndex).reorderable === false) {
            return -1;
        }
        return newIndex;
    },

    /**
     * @private
     * Swap 2 components.
     * @param {Number} newIndex The initial drop index.
     */
    doSwap: function(newIndex) {
        var me = this,
            items = me.container.items,
            orig, dest, tmpIndex, temp;

        newIndex = me.findReorderable(newIndex);

        if (newIndex === -1) {
            return;
        }

        me.reorderer.fireEvent('ChangeIndex', me, me.container, me.dragCmp, me.startIndex, newIndex);
        orig = items.getAt(me.curIndex);
        dest = items.getAt(newIndex);
        items.remove(orig);
        tmpIndex = Math.min(Math.max(newIndex, 0), items.getCount() - 1);
        items.insert(tmpIndex, orig);
        items.remove(dest);
        items.insert(me.curIndex, dest);

        // Make the Box Container the topmost layout participant during the layout.
        me.container._isLayoutRoot = true;
        me.container.updateLayout();
        me.container._isLayoutRoot = undefined;
        me.curIndex = newIndex;
    },

    onDrag: function(e) {
        var me = this,
            newIndex;

        newIndex = me.getNewIndex(e.getPoint());
        if ((newIndex !== undefined)) {
            me.reorderer.fireEvent('Drag', me, me.container, me.dragCmp, me.startIndex, me.curIndex);
            me.doSwap(newIndex);
        }

    },

    endDrag: function(e) {
        e && e.stopEvent();
        var me = this,
            layout = me.container.getLayout(),
            temp;

        if (me.dragCmp) {
            delete me.dragElId;

            // Reinstate the Component's positioning method after mouseup, and allow the layout system to animate it.
            delete me.dragCmp.setPosition;
            me.dragCmp.animate = true;
            
            // Ensure the lastBox is correct for the animation system to restore to when it creates the "from" animation frame
            me.dragCmp.lastBox[layout.names.x] = me.dragCmp.getPosition(true)[layout.names.widthIndex];

            // Make the Box Container the topmost layout participant during the layout.
            me.container._isLayoutRoot = true;
            me.container.updateLayout();
            me.container._isLayoutRoot = undefined;
            
            // Attempt to hook into the afteranimate event of the drag Component to call the cleanup
            temp = Ext.fx.Manager.getFxQueue(me.dragCmp.el.id)[0];
            if (temp) {
                temp.on({
                    afteranimate: me.reorderer.afterBoxReflow,
                    scope: me
                });
            } 
            // If not animated, clean up after the mouseup has happened so that we don't click the thing being dragged
            else {
                Ext.Function.defer(me.reorderer.afterBoxReflow, 1, me);
            }

            if (me.animate) {
                delete layout.animatePolicy;
            }
            me.reorderer.fireEvent('drop', me, me.container, me.dragCmp, me.startIndex, me.curIndex);
        }
    },

    /**
     * @private
     * Called after the boxes have been reflowed after the drop.
     * Re-enabled the dragged Component.
     */
    afterBoxReflow: function() {
        var me = this;
        me.dragCmp.el.setStyle('zIndex', '');
        me.dragCmp.disabled = false;
        me.dragCmp.resumeEvents();
    },

    /**
     * @private
     * Calculate drop index based upon the dragEl's position.
     */
    getNewIndex: function(pointerPos) {
        var me = this,
            dragEl = me.getDragEl(),
            dragBox = Ext.fly(dragEl).getPageBox(),
            targetEl,
            targetBox,
            targetMidpoint,
            i = 0,
            it = me.container.items.items,
            ln = it.length,
            lastPos = me.lastPos;

        me.lastPos = dragBox[me.startAttr];

        for (; i < ln; i++) {
            targetEl = it[i].getEl();

            // Only look for a drop point if this found item is an item according to our selector
            if (targetEl.is(me.reorderer.itemSelector)) {
                targetBox = targetEl.getPageBox();
                targetMidpoint = targetBox[me.startAttr] + (targetBox[me.dim] >> 1);
                if (i < me.curIndex) {
                    if ((dragBox[me.startAttr] < lastPos) && (dragBox[me.startAttr] < (targetMidpoint - 5))) {
                        return i;
                    }
                } else if (i > me.curIndex) {
                    if ((dragBox[me.startAttr] > lastPos) && (dragBox[me.endAttr] > (targetMidpoint + 5))) {
                        return i;
                    }
                }
            }
        }
    }
});
