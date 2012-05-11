/**
 * This feature allows to display the grid rows aggregated into groups as specified by the {@link Ext.data.Store#groupers}
 * specified on the Store. The group will show the title for the group name and then the appropriate records for the group
 * underneath. The groups can also be expanded and collapsed.
 * 
 * ## Extra Events
 * This feature adds several extra events that will be fired on the grid to interact with the groups:
 *
 *  - {@link #groupclick}
 *  - {@link #groupdblclick}
 *  - {@link #groupcontextmenu}
 *  - {@link #groupexpand}
 *  - {@link #groupcollapse}
 * 
 * ## Menu Augmentation
 * This feature adds extra options to the grid column menu to provide the user with functionality to modify the grouping.
 * This can be disabled by setting the {@link #enableGroupingMenu} option. The option to disallow grouping from being turned off
 * by thew user is {@link #enableNoGroups}.
 * 
 * ## Controlling Group Text
 * The {@link #groupHeaderTpl} is used to control the rendered title for each group. It can modified to customized
 * the default display.
 * 
 * ## Example Usage
 * 
 *     var groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
 *         groupHeaderTpl: 'Group: {name} ({rows.length})', //print the number of items in the group
 *         startCollapsed: true // start all groups collapsed
 *     });
 * 
 * @author Nicolas Ferrero
 */
Ext.define('Ext.grid.feature.Grouping', {
    extend: 'Ext.grid.feature.Feature',
    alias: 'feature.grouping',

    eventPrefix: 'group',
    eventSelector: '.' + Ext.baseCSSPrefix + 'grid-group-hd',
    bodySelector: '.' + Ext.baseCSSPrefix + 'grid-group-body',

    constructor: function() {
        var me = this;

        me.collapsedState = {};
        me.callParent(arguments);
    },
    
    /**
     * @event groupclick
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupdblclick
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupcontextmenu
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupcollapse
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupexpand
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @cfg {String/Array/Ext.Template} groupHeaderTpl
     * A string Template snippet, an array of strings (optionally followed by an object containing Template methods) to be used to construct a Template, or a Template instance.
     * 
     * - Example 1 (Template snippet):
     * 
     *       groupHeaderTpl: 'Group: {name}'
     *     
     * - Example 2 (Array):
     * 
     *       groupHeaderTpl: [
     *           'Group: ',
     *           '<div>{name:this.formatName}</div>',
     *           {
     *               formatName: function(name) {
     *                   return Ext.String.trim(name);
     *               }
     *           }
     *       ]
     *     
     * - Example 3 (Template Instance):
     * 
     *       groupHeaderTpl: Ext.create('Ext.XTemplate',
     *           'Group: ',
     *           '<div>{name:this.formatName}</div>',
     *           {
     *               formatName: function(name) {
     *                   return Ext.String.trim(name);
     *               }
     *           }
     *       )
     *
     * @cfg {String} groupHeaderTpl.groupField The field name being grouped by.
     * @cfg {String} groupHeaderTpl.columnName The column header associated with the field being grouped by *if there is a column for the field*, falls back to the groupField name.
     * @cfg {Mixed} groupHeaderTpl.groupValue The value of the {@link Ext.data.Store#groupField groupField} for the group header being rendered.
     * @cfg {String} groupHeaderTpl.renderedGroupValue The rendered value of the {@link Ext.data.Store#groupField groupField} for the group header being rendered, as produced by the column renderer.
     * @cfg {String} groupHeaderTpl.name An alias for renderedGroupValue
     * @cfg {Object[]} groupHeaderTpl.rows An array of child row data objects as returned by the View's {@link Ext.view.AbstractView#prepareData prepareData} method.
     * @cfg {Ext.data.Model[]} groupHeaderTpl.children An array containing the child records for the group being rendered.
     */
    groupHeaderTpl: '{columnName}: {name}',
    
    /**
     * @cfg {Number} depthToIndent
     * Number of pixels to indent per grouping level
     */
    depthToIndent: 17,

    collapsedCls: Ext.baseCSSPrefix + 'grid-group-collapsed',
    hdCollapsedCls: Ext.baseCSSPrefix + 'grid-group-hd-collapsed',

    //<locale>
    /**
     * @cfg
     * Text displayed in the grid header menu for grouping by header.
     */
    groupByText : 'Group By This Field',
    //</locale>
    //<locale>
    /**
     * @cfg
     * Text displayed in the grid header for enabling/disabling grouping.
     */
    showGroupsText : 'Show in Groups',
    //</locale>

    /**
     * @cfg
     * True to hide the header that is currently grouped.
     */
    hideGroupedHeader : false,

    /**
     * @cfg
     * True to start all groups collapsed.
     */
    startCollapsed : false,

    /**
     * @cfg
     * True to enable the grouping control in the header menu.
     */
    enableGroupingMenu : true,

    /**
     * @cfg
     * True  to allow the user to turn off grouping.
     */
    enableNoGroups : true,

    enable: function() {
        var me    = this,
            view  = me.view,
            store = view.store,
            groupToggleMenuItem;

        me.lastGroupField = me.getGroupField();

        if (me.lastGroupIndex) {
            store.group(me.lastGroupIndex);
        }
        me.callParent();
        groupToggleMenuItem = me.view.headerCt.getMenu().down('#groupToggleMenuItem');
        groupToggleMenuItem.setChecked(true, true);
        me.refreshIf();
    },

    disable: function() {
        var me    = this,
            view  = me.view,
            store = view.store,
            remote = store.remoteGroup,
            groupToggleMenuItem,
            lastGroup;

        lastGroup = store.groupers.first();
        if (lastGroup) {
            me.lastGroupIndex = lastGroup.property;
            me.block();
            store.clearGrouping();
            me.unblock();
        }

        me.callParent();
        groupToggleMenuItem = me.view.headerCt.getMenu().down('#groupToggleMenuItem');
        groupToggleMenuItem.setChecked(true, true);
        groupToggleMenuItem.setChecked(false, true);
        if (!remote) {
            view.refresh();
        }
    },

    refreshIf: function() {
        if (this.blockRefresh !== true) {

            // We are one side of a lockable grid, so refresh the locking view
            if (this.grid.ownerCt && this.grid.ownerCt.lockable) {
                this.grid.ownerCt.view.refresh();
            }
            // Refresh our view
            else {
                this.view.refresh();
            }
        }
    },

    getFeatureTpl: function(values, parent, x, xcount) {
        var me = this;
        return [
            '<tpl if="typeof rows !== \'undefined\'">',
                // group row tpl
                '<tr id="{groupHeaderId}" class="' + Ext.baseCSSPrefix + 'grid-group-hd ' + (me.startCollapsed ? me.hdCollapsedCls : '') + ' {hdCollapsedCls}"><td class="' + Ext.baseCSSPrefix + 'grid-cell" colspan="' + parent.columns.length + '" {[this.indentByDepth(values)]}><div class="' + Ext.baseCSSPrefix + 'grid-cell-inner"><div class="' + Ext.baseCSSPrefix + 'grid-group-title">{collapsed}{[this.renderGroupHeaderTpl(values)]}</div></div></td></tr>',
                // this is the rowbody
                '<tr id="{groupBodyId}" class="' + Ext.baseCSSPrefix + 'grid-group-body ' + (me.startCollapsed ? me.collapsedCls : '') + ' {collapsedCls}"><td colspan="' + parent.columns.length + '">{[this.recurse(values)]}</td></tr>',
            '</tpl>'
        ].join('');
    },

    getFragmentTpl: function() {
        var me = this;
        return {
            indentByDepth: me.indentByDepth,
            depthToIndent: me.depthToIndent,
            renderGroupHeaderTpl: function(values) {
                return Ext.XTemplate.getTpl(me, 'groupHeaderTpl').apply(values);
            }
        };
    },

    indentByDepth: function(values) {
        return 'style="padding-left:'+ ((values.depth || 0) * this.depthToIndent) + 'px;"';
    },

    // Containers holding these components are responsible for
    // destroying them, we are just deleting references.
    destroy: function() {
        delete this.view;
        delete this.prunedHeader;
    },

    // perhaps rename to afterViewRender
    attachEvents: function() {
        var me = this,
            view = me.view;

        view.on({
            scope: me,
            groupclick: me.onGroupClick,
            rowfocus: me.onRowFocus
        });

        view.mon(view.store, {
            scope: me,
            groupchange: me.onGroupChange,
            remove: me.onRemove,
            add: me.onAdd,
            update: me.onUpdate
        });

        if (me.enableGroupingMenu) {
            me.injectGroupingMenu();
        }

        me.pruneGroupedHeader();

        me.lastGroupField = me.getGroupField();
        me.block();
        me.onGroupChange();
        me.unblock();
    },

    // If we add a new item that doesn't belong to a rendered group, refresh the view
    onAdd: function(store, records){
        var me = this,
            view = me.view,
            groupField = me.getGroupField(),
            i = 0,
            len = records.length,
            activeGroups,
            addedGroups,
            groups,
            needsRefresh,
            group;

        if (view.rendered) {
            addedGroups = {};
            activeGroups = {};

            for (; i < len; ++i) {
                group = records[i].get(groupField);
                if (addedGroups[group] === undefined) {
                    addedGroups[group] = 0;
                }
                addedGroups[group] += 1;
            }
            groups = store.getGroups();
            for (i = 0, len = groups.length; i < len; ++i) {
                group = groups[i];
                activeGroups[group.name] = group.children.length;
            }

            for (group in addedGroups) {
                if (addedGroups[group] === activeGroups[group]) {
                    needsRefresh = true;
                    break;
                }
            }
            
            if (needsRefresh) {
                view.refresh();
            }
        }
    },

    onUpdate: function(store, record, type, changedFields){
        var view = this.view;
        if (view.rendered && !changedFields || Ext.Array.contains(changedFields, this.getGroupField())) {
            view.refresh();
        }
    },

    onRemove: function(store, record) {
        var me = this,
            groupField = me.getGroupField(),
            removedGroup = record.get(groupField),
            view = me.view;

        if (view.rendered) {
            // If that was the last one in the group, force a refresh
            if (store.findExact(groupField, removedGroup) === -1) {
                me.view.refresh(); 
            }
        }
    },

    injectGroupingMenu: function() {
        var me       = this,
            view     = me.view,
            headerCt = view.headerCt;
        headerCt.showMenuBy = me.showMenuBy;
        headerCt.getMenuItems = me.getMenuItems();
    },

    showMenuBy: function(t, header) {
        var menu = this.getMenu(),
            groupMenuItem  = menu.down('#groupMenuItem'),
            groupableMth = header.groupable === false ?  'disable' : 'enable';
            
        groupMenuItem[groupableMth]();
        Ext.grid.header.Container.prototype.showMenuBy.apply(this, arguments);
    },

    getMenuItems: function() {
        var me                 = this,
            groupByText        = me.groupByText,
            disabled           = me.disabled || !me.getGroupField(),
            showGroupsText     = me.showGroupsText,
            enableNoGroups     = me.enableNoGroups,
            groupMenuItemClick = Ext.Function.bind(me.onGroupMenuItemClick, me),
            groupToggleMenuItemClick = Ext.Function.bind(me.onGroupToggleMenuItemClick, me);

        // runs in the scope of headerCt
        return function() {
            var o = Ext.grid.header.Container.prototype.getMenuItems.call(this);
            o.push('-', {
                iconCls: Ext.baseCSSPrefix + 'group-by-icon',
                itemId: 'groupMenuItem',
                text: groupByText,
                handler: groupMenuItemClick
            });
            if (enableNoGroups) {
                o.push({
                    itemId: 'groupToggleMenuItem',
                    text: showGroupsText,
                    checked: !disabled,
                    checkHandler: groupToggleMenuItemClick
                });
            }
            return o;
        };
    },

    /**
     * Group by the header the user has clicked on.
     * @private
     */
    onGroupMenuItemClick: function(menuItem, e) {
        var me = this,
            menu = menuItem.parentMenu,
            hdr  = menu.activeHeader,
            view = me.view,
            store = view.store,
            remote = store.remoteGroup;

        delete me.lastGroupIndex;
        me.block();
        me.enable();
        store.group(hdr.dataIndex);
        me.pruneGroupedHeader();
        me.unblock();
        if (!remote) {
            view.refresh();
        }  
    },

    block: function(){
        this.blockRefresh = this.view.blockRefresh = true;
    },

    unblock: function(){
        this.blockRefresh = this.view.blockRefresh = false;
    },

    /**
     * Turn on and off grouping via the menu
     * @private
     */
    onGroupToggleMenuItemClick: function(menuItem, checked) {
        this[checked ? 'enable' : 'disable']();
    },

    /**
     * Prunes the grouped header from the header container
     * @private
     */
    pruneGroupedHeader: function() {
        var me = this,
            header = me.getGroupedHeader();

        if (me.hideGroupedHeader && header) {
            if (me.prunedHeader) {
                me.prunedHeader.show();
            }
            me.prunedHeader = header;
            header.hide();
        }
    },

    getGroupedHeader: function(){
        var groupField = this.getGroupField(),
            headerCt = this.view.headerCt;

        return groupField ? headerCt.down('[dataIndex=' + groupField + ']') : null;
    },

    getGroupField: function(){
        var group = this.view.store.groupers.first();
        if (group) {
            return group.property;
        }
        return ''; 
    },

    /**
     * When a row gains focus, expand the groups above it
     * @private
     */
    onRowFocus: function(rowIdx) {
        var node    = this.view.getNode(rowIdx),
            groupBd = Ext.fly(node).up('.' + this.collapsedCls);

        if (groupBd) {
            // for multiple level groups, should expand every groupBd
            // above
            this.expand(groupBd);
        }
    },

    /**
     * Expand a group
     * @param {String/Ext.Element} groupName The group name, or the element that contains
     * the group body
     */
    expand: function(groupName, /*private*/ preventSizeCalculation) {
        var me = this,
            view = me.view,
            groupBody,
            lockingPartner = me.lockingPartner;

        // We've been passed the group name
        if (Ext.isString(groupName)) {
            groupBody = Ext.fly(me.getGroupBodyId(groupName), '_grouping');
        }
        // We've been passed an element
        else {
            groupBody = Ext.fly(groupName, '_grouping')
            groupName = me.getGroupName(groupBody);
        }

        // If we are collapsed...
        if (me.collapsedState[groupName]) {
            groupBody.removeCls(me.collapsedCls);
            groupBody.prev().removeCls(me.hdCollapsedCls);

            if (preventSizeCalculation !== true) {
                view.refreshSize();
            }
            view.fireEvent('groupexpand');
            me.collapsedState[groupName] = false;

            // If we are one side of a locking view, the other side has to stay in sync
            if (lockingPartner) {
                lockingPartner.expand(groupName, preventSizeCalculation);
            }
        }
    },

    /**
     * Expand all groups
     */
    expandAll: function(){
        var me   = this,
            view = me.view,
            els  = view.el.select(me.eventSelector).elements,
            e,
            eLen = els.length;

        for (e = 0; e < eLen; e++) {
            me.expand(Ext.fly(els[e]).next(), true);
        }

        view.refreshSize();
    },

    /**
     * Collapse a group
     * @param {String/Ext.Element} groupName The group name, or the element that contains
     * group body
     */
    collapse: function(groupName, /*private*/ preventSizeCalculation) {
        var me = this,
            view = me.view,
            groupBody,
            lockingPartner = me.lockingPartner;

        // We've been passed the group name
        if (Ext.isString(groupName)) {
            groupBody = Ext.fly(me.getGroupBodyId(groupName), '_grouping');
        }
        // We've been passed an element
        else {
            groupBody = Ext.fly(groupName, '_grouping')
            groupName = me.getGroupName(groupBody);
        }
 
        // If we are not collapsed...
        if (!me.collapsedState[groupName]) {
            groupBody.addCls(me.collapsedCls);
            groupBody.prev().addCls(me.hdCollapsedCls);

            if (preventSizeCalculation !== true) {
                view.refreshSize();
            }
            view.fireEvent('groupcollapse');
            me.collapsedState[groupName] = true;

            // If we are one side of a locking view, the other side has to stay in sync
            if (lockingPartner) {
                lockingPartner.collapse(groupName, preventSizeCalculation);
            }
        }
    },

    /**
     * Collapse all groups
     */
    collapseAll: function() {
        var me     = this,
            view   = me.view,
            els    = view.el.select(me.eventSelector).elements,
            e,
            eLen   = els.length;

        for (e = 0; e < eLen; e++) {
            me.collapse(Ext.fly(els[e]).next(), true);
        }

        view.refreshSize();
    },

    onGroupChange: function(){
        var me = this,
            field = me.getGroupField(),
            menuItem,
            visibleGridColumns,
            groupingByLastVisibleColumn;

        if (me.hideGroupedHeader) {
            if (me.lastGroupField) {
                menuItem = me.getMenuItem(me.lastGroupField);
                if (menuItem) {
                    menuItem.setChecked(true);
                }
            }
            if (field) {
                visibleGridColumns = me.view.headerCt.getVisibleGridColumns();

                // See if we are being asked to group by the sole remaining visible column.
                // If so, then do not hide that column.
                groupingByLastVisibleColumn = ((visibleGridColumns.length === 1) && (visibleGridColumns[0].dataIndex == field));
                menuItem = me.getMenuItem(field);
                if (menuItem && !groupingByLastVisibleColumn) {
                    menuItem.setChecked(false);
                }
            }
        }
        if (me.blockRefresh !== true) {
            me.view.refresh();
        }
        me.lastGroupField = field;
    },

    /**
     * Gets the related menu item for a dataIndex
     * @private
     * @return {Ext.grid.header.Container} The header
     */
    getMenuItem: function(dataIndex){
        var view = this.view,
            header = view.headerCt.down('gridcolumn[dataIndex=' + dataIndex + ']'),
            menu = view.headerCt.getMenu();

        return header ? menu.down('menuitem[headerId='+ header.id +']') : null;
    },

    /**
     * Toggle between expanded/collapsed state when clicking on
     * the group.
     * @private
     */
    onGroupClick: function(view, rowElement, groupName, e) {
        var me = this;

        if (me.collapsedState[groupName]) {
            me.expand(groupName);
        } else {
            me.collapse(groupName);
        }
    },

    // Injects isRow and closeRow into the metaRowTpl.
    getMetaRowTplFragments: function() {
        return {
            isRow: this.isRow,
            closeRow: this.closeRow
        };
    },

    // injected into rowtpl and wrapped around metaRowTpl
    // becomes part of the standard tpl
    isRow: function() {
        return '<tpl if="typeof rows === \'undefined\'">';
    },

    // injected into rowtpl and wrapped around metaRowTpl
    // becomes part of the standard tpl
    closeRow: function() {
        return '</tpl>';
    },

    // isRow and closeRow are injected via getMetaRowTplFragments
    mutateMetaRowTpl: function(metaRowTpl) {
        metaRowTpl.unshift('{[this.isRow()]}');
        metaRowTpl.push('{[this.closeRow()]}');
    },

    // injects an additional style attribute via tdAttrKey with the proper
    // amount of padding
    getAdditionalData: function(data, idx, record, orig) {
        var view = this.view,
            hCt  = view.headerCt,
            col  = hCt.items.getAt(0),
            o = {},
            tdAttrKey;

        // If there *are* any columne in this grid (possible empty side of a locking grid)...
        // Add the padding-left style to indent the row according to grouping depth.
        // Preserve any current tdAttr that a user may have set.
        if (col) {
            tdAttrKey = col.id + '-tdAttr';
            o[tdAttrKey] = this.indentByDepth(data) + " " + (orig[tdAttrKey] ? orig[tdAttrKey] : '');
            o.collapsed = 'true';
            o.data = record.getData();
        }
        return o;
    },

    // return matching preppedRecords
    getGroupRows: function(group, records, preppedRecords, fullWidth) {
        var me = this,
            children = group.children,
            rows = group.rows = [],
            view = me.view,
            header = me.getGroupedHeader(),
            groupField = me.getGroupField(),
            index = -1,
            r,
            rLen = records.length,
            record;
            
        group.viewId = view.id;

        for (r = 0; r < rLen; r++) {
            record = records[r];

            if (record.get(groupField) == group.name) {
                index = r;
            }
            if (Ext.Array.indexOf(children, record) != -1) {
                rows.push(Ext.apply(preppedRecords[r], {
                    depth : 1
                }));
            }
        }

        group.groupHeaderId = me.getGroupHeaderId(group.name);
        group.groupBodyId = me.getGroupBodyId(group.name);
        group.fullWidth = fullWidth;
        group.columnName = header ? header.text : groupField;
        group.groupValue = group.name;

        // Here we attempt to overwrite the group name value from the Store with
        // the get the rendered value of the column from the *prepped* record
        if (header && index > -1) {
            group.name = group.renderedValue = preppedRecords[index][header.id];
        }
        if (me.collapsedState[group.name]) {
            group.collapsedCls = me.collapsedCls;
            group.hdCollapsedCls = me.hdCollapsedCls;
        }

        return group;
    },

    // Create an associated DOM id for the group's header element given the group name
    getGroupHeaderId: function(groupName) {
        return this.view.id + '-hd-' + groupName;
    },

    // Create an associated DOM id for the group's body element given the group name
    getGroupBodyId: function(groupName) {
        return this.view.id + '-bd-' + groupName;
    },

    // Get the group name from an associated element whether it's within a header or a body
    getGroupName: function(element) {
        var me = this,
            targetEl;
                
        // See if element is, or is within a group header. If so, we can extract its name
        targetEl = Ext.fly(element).findParent(me.eventSelector);
        if (targetEl) {
            return targetEl.id.split(this.view.id + '-hd-')[1];
        }

        // See if element is, or is within a group body. If so, we can extract its name
        targetEl = Ext.fly(element).findParent(me.bodySelector);
        if (targetEl) {
            return targetEl.id.split(this.view.id + '-bd-')[1];
        }
    },

    // return the data in a grouped format.
    collectData: function(records, preppedRecords, startIndex, fullWidth, o) {
        var me    = this,
            store = me.view.store,
            g,
            groups, gLen, group;

        if (!me.disabled && store.isGrouped()) {
            groups = store.getGroups();
            gLen   = groups.length;

            for (g = 0; g < gLen; g++) {
                group = groups[g];

                me.getGroupRows(group, records, preppedRecords, fullWidth);
            }

            return {
                rows: groups,
                fullWidth: fullWidth
            };
        }
        return o;
    },

    // adds the groupName to the groupclick, groupdblclick, groupcontextmenu
    // events that are fired on the view. Chose not to return the actual
    // group itself because of its expense and because developers can simply
    // grab the group via store.getGroups(groupName)
    getFireEventArgs: function(type, view, targetEl, e) {
        return [type, view, targetEl, this.getGroupName(targetEl), e];
    }
});
