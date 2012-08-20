Ext.require([
    'Ext.ux.SearchPlugin'
]);

Ext.define('Redwood.view.ActionPickerList', {
    extend: 'Ext.Component',
    alias: 'widget.actionpickerlist',

    html:"Hello world",
    width:100,
    height:100
});


Ext.define('Redwood.view.ActionPicker', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.actionpicker',
    initComponent: function () {
        var tpl = new Ext.XTemplate(
            '<tpl for=".">',
                '<div class="x-redwood-item-picker">',
                '<div class="x-redwood-item-title">',
                '{name}',
                '</div>',
                '<div class="x-redwood-item-desc">',
                '{tag}',
                '</div>',
                '</div>',
            '</tpl>'
        );
        this.listConfig= {
            itemTpl:tpl
        };
        this.callParent(arguments);
    },

    doQuery: function(queryString, forceAll, rawQuery) {
        queryString = queryString || '';

        // store in object and pass by reference in 'beforequery'
        // so that client code can modify values.
        var me = this,
            qe = {
                query: queryString,
                forceAll: forceAll,
                combo: me,
                cancel: false
            },
            store = me.store,
            isLocalMode = me.queryMode === 'local',
            needsRefresh;

        if (me.fireEvent('beforequery', qe) === false || qe.cancel) {
            return false;
        }

        // get back out possibly modified values
        queryString = qe.query;
        forceAll = qe.forceAll;

        // query permitted to run
        if (forceAll || (queryString.length >= me.minChars)) {
            // expand before starting query so LoadMask can position itself correctly
            me.expand();

            // make sure they aren't querying the same thing
            if (!me.queryCaching || me.lastQuery !== queryString) {
                me.lastQuery = queryString;

                if (isLocalMode) {
                    // forceAll means no filtering - show whole dataset.
                    store.suspendEvents();
                    needsRefresh = me.clearFilter();
                    //my own custom filter
                    if (queryString || !forceAll) {
                        me.activeFilter = new Ext.util.Filter({
                            filterFn:me.filterFn
                        });
                        store.filter(me.activeFilter);
                        needsRefresh = true;
                    } else {
                        delete me.activeFilter;
                    }
                    store.resumeEvents();
                    if (me.rendered && needsRefresh) {
                        me.getPicker().refresh();
                    }
                } else {
                    // Set flag for onLoad handling to know how the Store was loaded
                    me.rawQuery = rawQuery;

                    // In queryMode: 'remote', we assume Store filters are added by the developer as remote filters,
                    // and these are automatically passed as params with every load call, so we do *not* call clearFilter.
                    if (me.pageSize) {
                        // if we're paging, we've changed the query so start at page 1.
                        me.loadPage(1);
                    } else {
                        store.load({
                            params: me.getParams(queryString)
                        });
                    }
                }
            }

            // Clear current selection if it does not match the current value in the field
            if (me.getRawValue() !== me.getDisplayValue()) {
                me.ignoreSelection++;
                me.picker.getSelectionModel().deselectAll();
                me.ignoreSelection--;
            }

            if (isLocalMode) {
                me.doAutoSelect();
            }
            if (me.typeAhead) {
                me.doTypeAhead();
            }
        }
        return true;
    }


/*
                        tpl:new Ext.XTemplate(
                            '<tpl for=".">',
                                '<div class="x-redwood-item-picker">',
                                    '<div class="x-redwood-item-title">',
                                        '{name}',
                                    '</div>',
                                    '<div class="x-redwood-item-desc">',
                                        'sssssss',
                                    '</div>',
                                '</div>',
                            '</tpl>'
                        )
                    });
*/


});


Ext.define('Redwood.view.ActionCollection', {
    extend: 'Ext.tree.Panel',
    alias: 'widget.actioncollection',
    useArrows: true,
    rootVisible: false,
    multiSelect: true,
    singleExpand: false,
    autoHeight:true,

    initComponent: function () {

        var me = this;

        this.viewConfig= {
            markDirty:false,
            forceFit: true,

            //   Return CSS class to apply to rows depending upon data values
            getRowClass: function(record, index) {
                if((record.get("order") == "")&&(record.get("paramname") == "")){
                    return "x-redwood-action-divider-row";
                }else{
                    return "x-redwood-action-row";
                }
            }
        };

        this.store = Ext.create('Ext.data.TreeStore', {
            folderSort: true,
            autoSync: true,

            sorters: [{
                property : 'order',
                direction: 'DESC'

            }],
            root: {
                expanded: true
                /*
                children: [
                    { icon: "images/action.png",actionname: "test", expanded: true, children: [
                        { icon: Ext.BLANK_IMAGE_URL,paramname: "param1", leaf: true }
                    ] }
                ]
                */
            },

            fields: [
                {name: 'actionname',     type: 'string'},
                {name: 'order',     type: 'string'},
                {name: 'paramname',     type: 'string'},
                {name: 'paramvalue',     type: 'string'},
                {name: 'actionid',     type: 'string'},
                {name: 'possiblevalues',     type: 'array'},
                {name: 'executionflow', type: 'string'},
                {name: 'returnvalue',     type: 'string'},
                {name: 'host',     type: 'string'}
            ]

        });

        //this.store.getRootNode().appendChild({actionname:"test",children:[{paramname:"param1",leaf:true}]});
        this.columns = [
            {
                xtype: 'treecolumn',
                text: '',
                width: 40,
                dataIndex: 'order',
                sortable: false
            },
            {
                //xtype: 'treecolumn',
                text: 'Action Name',
                width: 200,
                dataIndex: 'actionname',
                sortable: false
            },
            {
                text: "Execution Flow",
                width: 200,
                dataIndex:"executionflow",
                sortable: false,
                editor:{
                    xtype:"combo",
                    store: Ext.create('Ext.data.Store', {
                        autoSync: true,
                        autoLoad: true,
                        fields: [
                            {type: 'string', name: 'value'}
                        ],
                        data: [{value:"Record Error Stop Test Case"},{value:"Ignore Error Continue Test Case"},{value:"Record Error Continue Test Case"}]
                    }),
                    queryMode: 'local',
                    displayField: 'value',
                    valueField: 'value',
                    editable: false,
                    allowBlank: false,
                    typeAhead: false

                }
            },
            {
                text: 'Parameter Name',
                width: 200,
                renderer: function(value, meta,record) {
                    if(record.get("paramname") == ""){
                        //meta.tdCls = 'x-redwood-action-divider-row';
                    }else{
                        meta.tdCls = 'x-redwood-action-value-cell';
                    }
                    return value;
                },
                dataIndex: 'paramname',
                sortable: false
            },
            {
                text: 'Parameter Value',
                //width: 200,
                flex:1,
                //tdCls:"x-redwood-action-value-cell",
                renderer: function(value, meta,record) {
                    if(record.get("paramname") == ""){
                        //meta.tdCls = 'x-redwood-action-divider-row';
                    }else{
                        meta.tdCls = 'x-redwood-action-value-cell';
                    }
                    return Ext.util.Format.htmlEncode(value);
                },
                dataIndex: 'paramvalue',
                sortable: false,
                editor:{
                    xtype:"combo",
                    displayField: 'text',
                    valueField: 'value',
                    typeAhead: true,
                    queryMode: 'local',
                    store:Ext.create('Ext.data.Store', {
                        autoSync: true,
                        autoLoad: true,
                        fields: [
                            {type: 'string', name: 'value'},
                            {type: 'string', name: 'text'}
                        ],
                        data: []
                    }),
                    getDisplayValue: function() {
                        return Ext.String.htmlDecode(this.value);
                    }
                    //autoEncode: true
                }
            },
            {
                text: 'Return Value',
                width: 100,
                dataIndex: 'returnvalue',
                sortable: false,
                editor: {

                }
            },
            {
                text: 'Host',
                width: 100,
                dataIndex: 'host',
                sortable: false,
                editor: {

                }
            },
            {
                xtype: 'actioncolumn',
                width: 25,
                items: [
                    {
                        getClass: function(value, meta,record) {
                            if(record.get("actionname") == ""){
                                return 'x-hide-display';
                            }
                        },
                        icon: 'images/delete.png',
                        toolTip:"Remove Action",
                        itemId: "removeAction",
                        handler: function(grid, rowIndex, colIndex,hmm,aga) {
                            var i = 0;
                            var record = null;
                            var actionDivider = null;
                            var removed = false;
                            me.store.getRootNode().cascadeBy(function(node) {
                                if (node.isRoot() == true){
                                    return;
                                }
                                if ((removed == true) &&(node.parentId = "root")){
                                    actionDivider = node;
                                }
                                if (rowIndex == i){
                                    record = node;
                                    removed = true;
                                }
                                i++;
                            });


                            record.remove();
                            actionDivider.remove();
                            //console.log(grid.getRoot().getChildAt())
                        }
                    }
                ]
            }
        ];

        this.on("beforeselect",function(rowModel,record,index){
            var actionRootNode = null;
            //if parameter row
            if (record.parentNode.isRoot() == false){
                actionRootNode = record.parentNode;
            }else{
                actionRootNode = record;
            }
            var records = [];
            records.push(actionRootNode);
            records = records.concat(actionRootNode.childNodes);

            me.getSelectionModel().select(records,false,true);
        });

        this.cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit: 1
        });

        //edit only param value cells
        this.cellEditing.on("beforeedit",function(editor,e){
            if ((e.field == "executionflow")&&(e.value != "")){
                return true;
            }

            if ((e.field == "host")&&(e.record.get("actionname") != "")){
                return true;
            }

            if ((e.field == "returnvalue")&&(e.record.get("actionname") != "")){
                return true;
            }

            if (e.field != "paramvalue"){
                return false;
            }

            var store = e.column.getEditor().store;
            store.removeAll();
            store.add({text:"&lt;NULL&gt",value:"<NULL>"});

            e.record.get("possiblevalues").forEach(function(value,index){
                store.add({value:value,text:Ext.util.Format.htmlEncode(value)});
            });

        });

        //reselect whole action after edit
        //refresh the grid to avoid bottom rows to become invisible due to
        //word wrapping
        this.cellEditing.on("edit",function(editor,e){
            me.getView().refresh();
        });
        this.plugins= [this.cellEditing];

        this.createAction = function(name,store){
            var foundAction = store.findRecord("name",name);
            if(foundAction == null){
                //Ext.Msg.alert("Error","Action '" + actionPicker.getValue() + "' is not found");
                return null;
            }

            var action = {};
            action.actionname = foundAction.get("name");
            action.icon = Ext.BLANK_IMAGE_URL;
            //action.icon = "images/action.png";
            action.expanded = true;
            action.executionflow = "Record Error Stop Test Case";
            action.children = [];
            foundAction.get("params").forEach(function(param){
                action.children.push( { icon: Ext.BLANK_IMAGE_URL,paramname: param.name, leaf: true,_id:param.id,paramvalue:"<NULL>",possiblevalues:param.possiblevalues});
            });

            return action;

        };

        this.reorderActions = function(store,newActionOrder){

        };

        this.tbar ={
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    iconCls: 'icon-add',
                    toolTip:"Add Action",
                    itemId: "addAction",
                    handler: function(){
                        var actionPicker = this.up("toolbar").down("#actionpicker");
                        var action = me.createAction(actionPicker.getValue(),actionPicker.store);
                        if (action == null) return;
                        var actionsGrid = this.up("actioncollection");
                        action.order = parseInt(((actionsGrid.store.getRootNode().childNodes.length + 1)/2)+1);
                        actionsGrid.store.getRootNode().appendChild(action);
                        actionsGrid.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false});
                    }
                },
                {
                    xtype: "actionpicker",
                    itemId: "actionpicker",
                    width: 400,
                    plugins:[
                        Ext.create('Ext.ux.SearchPlugin')
                    ],
                    paramNames:["tag","name"],
                    store: Ext.data.StoreManager.lookup('ActionsCombo'),
                    autoSelect:true,
                    forceSelection:true,
                    queryMode: 'local',
                    triggerAction: 'all',
                    lastQuery: '',
                    typeAhead: false,
                    displayField: 'name',
                    valueField: 'name',
                    emptyText:"Search for Action using name or tags",
                    //valueNotFoundText:"Action not found",
                    listeners: {

                    }
                }
            ]
        };
        this.callParent(arguments);
    }
});