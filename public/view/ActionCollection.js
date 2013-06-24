// Extend the treeview dropzone
Ext.define('ExtendedTreeViewDropZone', {
    extend: 'Ext.tree.ViewDropZone',

    getPosition: function(e, node) {
        var view = this.view,
            record = view.getRecord(node),
            y = e.getPageY(),
            noAppend = record.isLeaf(),
            noBelow = false,
            region = Ext.fly(node).getRegion(),
            fragment;

        // If we are dragging on top of the root node of the tree, we always want to append.
        if (record.isRoot()) {
            return 'append';
        }

        // Return 'append' if the node we are dragging on top of is not a leaf else return false.
        if (this.appendOnly) {
            return noAppend ? false : 'append';
        }

        if (!this.allowParentInsert) {
            noBelow = record.hasChildNodes() && record.isExpanded();
        }

        fragment = (region.bottom - region.top) / (noAppend ? 2 : 3);
        if (y >= region.top && y < (region.top + fragment)) {
            return 'append';
        }
        else if (!noBelow && (noAppend || (y >= (region.bottom - fragment) && y <= region.bottom))) {
            return 'append';
        }
        else {
            return 'append';
        }
    }

    /*
    onNodeOver: function(nodeData, source, e, data) {
        if (data && data.records && data.records[0]) {
            // The check should be specified, e.g. a female with the name 'Malena' would be recognized as male!
            if (nodeData.innerHTML.indexOf(data.records[0].get('sex')) < 0) {
                return this.dropNotAllowed;
            }
        }

        return this.callParent(arguments);
    },

    ,
    onContainerOver: function(source, e, data) {
        return this.dropNotAllowed;
    }
     */

});

Ext.define('ExtendedTreeDnD', {
    extend: 'Ext.tree.plugin.TreeViewDragDrop',
    alias: 'plugin.extendedtreednd',

    onViewRender: function(view) {
        this.callParent(arguments);

        // Create a instance of ExtendedGridViewDropZone instead of Ext.grid.ViewDropZone
        this.dropZone = Ext.create('ExtendedTreeViewDropZone', {
            view: view,
            ddGroup: this.dropGroup || this.ddGroup
        });
    }
});



Ext.require([
    'Ext.ux.SearchPlugin'
]);

Ext.define('Redwood.view.ActionPickerList', {
    extend: 'Ext.Component',
    alias: 'widget.actionpickerlist',

    html: "Hello world",
    width: 100,
    height: 100
});


Ext.define('Redwood.view.ActionCollection', {
    extend: 'Ext.tree.Panel',
    alias: 'widget.actioncollection',
    useArrows: true,
    rootVisible: false,
    multiSelect: true,
    singleExpand: false,
    autoHeight: true,
    enableColumnMove: false,
    loadingData: false,

    parentActionID: null,
    parentActionParamsStore: null,

    initComponent: function () {

        var me = this;


        this.on("beforeitemcollapse",function(){
            me.lastScrollPos = me.parentPanel.getEl().dom.children[0].scrollTop;
        });

        this.on("beforeitemexpand",function(){
            me.lastScrollPos = me.parentPanel.getEl().dom.children[0].scrollTop;
        });

        this.on("afteritemexpand",function(){
            me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos;
        });

        this.on("afteritemcollapse",function(){
            me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos;
        });

        //me.selModel= Ext.create('Ext.selection.Model', { listeners: {} })
        //this.enableLocking = true;
        this.viewConfig = {
            //autoScroll: true,
            markDirty: false,
            //forceFit: true,
            //preserveScrollOnRefresh:true,
            loadMask : false,

            animate: false,

            //   Return CSS class to apply to rows depending upon data values
            getRowClass: function (record, index) {
                if ((record.get("order") === "") && (record.get("paramname") === "")) {
                    return "x-redwood-action-divider-row";
                } else {
                    return "x-redwood-action-row";
                }
            },
            plugins: {
                //ptype: 'treeviewdragdrop',
                ptype: 'extendedtreednd',
                enableDrag: false,
                containerScroll:true,
                enableDrop: true,
                ddGroup: "actionDrop",
                nodeHighlightOnDrop: false
            },
            listeners: {
                beforedrop: function( node, data, overModel, dropPosition, dropHandler){
                    if (data.records[0].get("leaf") === false) return false;
                    var actionSelected = null;
                    //if store is empty
                    if(me.store.getRootNode().childNodes.length == 1){
                        me.store.getRootNode().removeAll();
                    }
                    //if empty row
                    else if ((overModel.get("actionname")=="") && (overModel.parentNode.isRoot() == true)){
                        actionSelected = overModel.store.findRecord("rowOrder",overModel.get("rowOrder")-1)
                    }
                    else if(overModel.parentNode.isRoot() == true){
                        actionSelected = overModel;
                    }
                    else{
                        actionSelected = overModel.parentNode;
                    }
                    me.insertAction(data.records[0].get("name"),actionSelected);
                    return false;
                },
                beforeitemkeydown: function(view,record,item,index,e){

                    var actionRootNode;
                    var newSelectedAction;
                    var actionIndex;
                    var records;

                    //shft + down
                    if ((e.getKey()  == 40)&&(e.shiftKey == true)){
                        actionRootNode = null;
                        //if parameter row
                        //if (record.parentNode === null) return;
                        if (record.parentNode.isRoot() === false){
                            actionRootNode = record.parentNode;
                        }else{
                            actionRootNode = record;
                        }

                        actionIndex = actionRootNode.parentNode.indexOf(actionRootNode);
                        if (actionIndex + 2 < actionRootNode.parentNode.childNodes.length){
                            newSelectedAction = actionRootNode.parentNode.childNodes[actionIndex+2];
                            records = [];
                            records.push(newSelectedAction);
                            records = records.concat(newSelectedAction.childNodes);

                            view.getSelectionModel().select(records,true,true);
                            view.getNode(newSelectedAction).scrollIntoView(me.parentPanel.getEl());
                            view.focusRow(view.getNode(newSelectedAction));
                        }

                        e.stopEvent();
                        return false;
                    }
                    //shift+up
                    else if ((e.getKey()  == 38)&&(e.shiftKey == true)){
                        actionRootNode = null;
                        //if parameter row
                        //if (record.parentNode === null) return;
                        if (record.parentNode.isRoot() === false){
                            actionRootNode = record.parentNode;
                        }else{
                            actionRootNode = record;
                        }

                        actionIndex = actionRootNode.parentNode.indexOf(actionRootNode);
                        if (actionIndex > 1){
                            newSelectedAction = actionRootNode.parentNode.childNodes[actionIndex-2];
                            records = [];
                            records.push(newSelectedAction);
                            records = records.concat(newSelectedAction.childNodes);

                            view.getSelectionModel().select(records,true,true);
                            view.getNode(newSelectedAction).scrollIntoView(me.parentPanel.getEl());
                            view.focusRow(newSelectedAction);
                        }

                        e.stopEvent();
                        return false;
                    }
                    //up key
                    else if (e.getKey()  == 38){

                        if (record.parentNode.isRoot() === false){
                            actionRootNode = record.parentNode;
                        }else{
                            actionRootNode = record;
                        }
                        actionIndex = actionRootNode.parentNode.indexOf(actionRootNode);
                        if (actionIndex > 1){
                            newSelectedAction = actionRootNode.parentNode.childNodes[actionIndex-2];
                            records = [];
                            records.push(newSelectedAction);
                            records = records.concat(newSelectedAction.childNodes);

                            view.getSelectionModel().select(records,false,true);
                            view.getNode(newSelectedAction).scrollIntoView(me.parentPanel.getEl());
                            view.focusRow(newSelectedAction);
                        }
                        else{
                            //view.getSelectionModel().deselectAll();
                        }
                        e.stopEvent();
                        return false;
                        //down key
                    } else if (e.getKey()  == 40){
                        actionRootNode = null;
                        //if parameter row
                        //if (record.parentNode === null) return;
                        if (record.parentNode.isRoot() === false){
                            actionRootNode = record.parentNode;
                        }else{
                            actionRootNode = record;
                        }

                        actionIndex = actionRootNode.parentNode.indexOf(actionRootNode);
                        if (actionIndex + 2 < actionRootNode.parentNode.childNodes.length){
                            newSelectedAction = actionRootNode.parentNode.childNodes[actionIndex+2];
                            records = [];
                            records.push(newSelectedAction);
                            records = records.concat(newSelectedAction.childNodes);

                            view.getSelectionModel().select(records,false,true);
                            view.getNode(newSelectedAction).scrollIntoView(me.parentPanel.getEl());
                            view.focusRow(newSelectedAction);
                        }
                        else{
                            //view.getSelectionModel().deselectAll();
                        }

                        e.stopEvent();
                        return false;
                    }
                    //ctrl+c
                    else if ((e.getKey() == 67)&&(e.ctrlKey == true)){
                        this.ownerCt.copyToClipboard();
                        e.stopEvent();
                        return false;
                    }
                    //ctrl+v
                    else if ((e.getKey() == 86)&&(e.ctrlKey == true)){
                        this.ownerCt.pasteFromClipboard();
                        e.stopEvent();
                        return false;
                    }
                    //ctrl+a
                    else if ((e.getKey() == 65)&&(e.ctrlKey == true)){
                        var waitMsg = function(){Ext.MessageBox.show({
                            msg: 'Selecting All Actions Please wait...',
                            progressText: 'Selecting Actions...',
                            width:300,
                            wait:true,
                            waitConfig: {interval:200}
                            //animateTarget: 'mb7'
                        })};
                        waitMsg();
                        setTimeout(function(){view.getSelectionModel().selectAll();Ext.MessageBox.hide();},0);

                        e.stopEvent();
                        return false;
                    }
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
            listeners:{
                datachanged:function(){
                    if ((me.markDirty)&&(me.loadingData == false)){
                        me.markDirty()
                    }
                }
            },
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
                {name: 'rowOrder',     type: 'int'},
                {name: 'paramname',     type: 'string'},
                {name: 'paramvalue',     type: 'auto'},
                {name: 'actionid',     type: 'string'},
                {name: 'possiblevalues',     type: 'array'},
                {name: 'parametertype',     type: 'string'},
                {name: 'paramid',     type: 'string'},
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
                width: 45,
                dataIndex: 'order',
                sortable: false,
                menuDisabled:true
            },
            {
                //xtype: 'treecolumn',
                text: 'Action Name',
                width: 200,
                dataIndex: 'actionname',
                sortable: false,menuDisabled:true,
                renderer: function (value, meta, record) {
                    return "<a style= 'color: blue;' href='javascript:openAction(&quot;"+ record.get("actionid") +"&quot;)'>" + value +"</a>";
                }
            },
            {
                text: "Execution Flow",
                width: 200,
                dataIndex: "executionflow",
                sortable: false,
                menuDisabled:true,
                editor: {
                    xtype: "combo",
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
                menuDisabled:true,
                renderer: function (value, meta, record) {
                    if (record.get("paramname") === "") {
                        //meta.tdCls = 'x-redwood-action-divider-row';
                    } else {
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
                menuDisabled:true,
                //tdCls:"x-redwood-action-value-cell",
                renderer: function (value, meta, record) {
                    if (record.get("paramname") === ""){
                        //meta.tdCls = 'x-redwood-action-divider-row';
                    } else {
                        meta.tdCls = 'x-redwood-action-value-cell';
                    }
                    return Ext.util.Format.htmlEncode(value);
                    var encoded = Ext.util.Format.htmlEncode(value);
                    encoded = "<strong>"+encoded+"</strong>asdfasdfdsa"
                    return encoded;
                },
                dataIndex: 'paramvalue',
                sortable: false,
                itemId:"paramvalue",
                editor: {}
            },
            {
                text: 'Return Value',
                width: 100,
                menuDisabled:true,
                dataIndex: 'returnvalue',
                sortable: false,
                editor: {

                }
            },
            {
                text: 'Machine Role',
                width: 100,
                menuDisabled:true,
                dataIndex: 'host',
                sortable: false,
                editor: {

                }
            },
            {
                xtype: 'actioncolumn',
                width: 70,
                menuDisabled:true,
                items: [
                    {
                        getClass: function(value, meta, record) {
                            if(record.get("actionname") === "") {
                                return 'x-hide-display';
                            }
                        },
                        icon: 'images/arrow_up.png',
                        toolTip: "Move Up Action",
                        itemId: "moveUpAction",
                        handler: function (grid, rowIndex, colIndex, btn, eOpt) {
                            if (me.movingUp === true) {
                                return;
                            }
                            me.movingUp = true;
                            this.setDisabled(true);
                            var html = me.getView().getNode(rowIndex);
                            var record = me.getView().getRecord(html);
                            if (record.get("order") == "1"){
                                me.movingUp = false;
                                return;
                            }
                            var lastScrollPos = me.parentPanel.getEl().dom.children[0].scrollTop;

                            var recordUpOrder = (parseInt(record.get("order"))) - 1;
                            var recordUp = me.store.getRootNode().findChild("order",recordUpOrder.toString());
                            var newOrder = recordUp.get("order");
                            var newRowOrder = recordUp.get("rowOrder");
                            recordUp.set("order",record.get("order"));
                            recordUp.set("rowOrder",record.get("rowOrder"));
                            record.set("order",newOrder);
                            record.set("rowOrder",newRowOrder);

                            me.store.sort("rowOrder","ASC");
                            me.movingUp = false;
                            this.setDisabled(false);
                            me.parentPanel.getEl().dom.children[0].scrollTop = lastScrollPos;
                            //me.getView().getNode(record).scrollIntoView(me.parentPanel.getEl());
                            me.getSelectionModel().select(record);
                        }
                    },
                    {
                        getClass: function(value, meta,record) {
                            if(record.get("actionname") == ""){
                                return 'x-hide-display';
                            }
                        },
                        icon: 'images/arrow_down.png',
                        toolTip:"Move Action Down",
                        itemId: "moveDownAction",
                        handler: function(grid, rowIndex, colIndex,btn,eOpt) {
                            if (me.movingDown == true){
                                return;
                            }
                            me.movingDown = true;
                            this.setDisabled(true);
                            var html = me.getView().getNode(rowIndex);
                            var record = me.getView().getRecord(html);
                            var recordDownOrder = (parseInt(record.get("order"))) + 1;
                            var recordDown = me.store.getRootNode().findChild("order",recordDownOrder.toString());
                            if (recordDown == null){
                                me.movingDown = false;
                                return;
                            }
                            var lastScrollPos = me.parentPanel.getEl().dom.children[0].scrollTop;
                            var newOrder = recordDown.get("order");
                            var newRowOrder = recordDown.get("rowOrder");
                            recordDown.set("order",record.get("order"));
                            recordDown.set("rowOrder",record.get("rowOrder"));
                            record.set("order",newOrder);
                            record.set("rowOrder",newRowOrder);

                            me.store.sort("rowOrder","ASC");
                            me.movingDown = false;
                            this.setDisabled(false);
                            //me.getView().getNode(record).scrollIntoView(me.parentPanel.getEl());
                            me.parentPanel.getEl().dom.children[0].scrollTop = lastScrollPos;
                            me.getSelectionModel().select(record);
                        }
                    },
                    {
                        getClass: function(value, meta,record) {
                            if(record.get("actionname") == ""){
                                return 'x-hide-display';
                            }
                        },
                        icon: 'images/delete.png',
                        toolTip:"Remove Action",
                        itemId: "removeAction",
                        handler: function(grid, rowIndex, colIndex,btn,eOpt) {
                            if (me.removing == true){
                                return;
                            }
                            me.removing = true;
                            this.setDisabled(true);
                            var topRowcount = 1;
                            var actionCount = 0;
                            var removed = false;
                            var html = me.getView().getNode(rowIndex);
                            var record = me.getView().getRecord(html);
                            var actionDivider = null;

                            me.store.getRootNode().cascadeBy(function(node) {
                                if (node.isRoot() == true){
                                    return;
                                }
                                if ((removed == true) &&(actionDivider == null) && (node.getDepth()==1 )){
                                    actionDivider = node;
                                }
                                if (node.get("order")!=""){
                                    actionCount++;
                                    node.set("order",actionCount.toString());
                                }
                                if ((removed == false) && (record.get("order") == actionCount.toString())){
                                    actionCount--;
                                    removed = true;
                                }
                                if (node.parentNode.isRoot() == true){
                                    node.set("rowOrder",topRowcount-2);
                                }
                                if (node.parentNode.isRoot() == true){
                                    topRowcount++;
                                }
                            });

                            record.remove();
                            actionDivider.remove();
                            //make sure there is always one empty row
                            if (me.store.getRootNode().childNodes.length == 0){
                                me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:0});
                            }
                            me.removing = false;
                            me.getView().updateLayout();
                            //console.log(grid.getRoot().getChildAt())
                        }
                    }
                ]
            }
        ];

        this.on("beforeselect",function(rowModel,record,index,eOpts){
            var actionRootNode = null;
            //if parameter row
            if (record.parentNode === null) return;
            if (record.parentNode.isRoot() === false){
                actionRootNode = record.parentNode;
            }else{
                actionRootNode = record;
            }
            var records = [];
            records.push(actionRootNode);
            records = records.concat(actionRootNode.childNodes);
            records = records.concat(me.getSelectionModel().getSelection());

            me.getSelectionModel().select(records,false,true);
        });

        this.on("beforedeselect",function(rowModel,record,index,eOpts){
            var actionRootNode = null;
            //if parameter row
            if (record.parentNode == null) return;
            if (record.parentNode.isRoot() == false){
                actionRootNode = record.parentNode;
            }else{
                actionRootNode = record;
            }
            var records = [];
            records.push(actionRootNode);
            records = records.concat(actionRootNode.childNodes);

            me.getSelectionModel().deselect(records,true);

        });

        this.cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit: 1
        });

        //edit only param value cells
        this.cellEditing.on("beforeedit",function(editor,e){
            if ((e.field === "executionflow")&&(e.value !== "")){
                return true;
            }

            if ((e.field === "host")&&(e.record.get("actionname") != "")){
                e.column.setEditor({
                    xtype:"combo",
                    displayField: 'value',
                    height:20,
                    valueField: 'value',
                    typeAhead: true,
                    queryMode: 'local',
                    editable: false,
                    store:Ext.data.StoreManager.lookup('MachineRoles')
                });

                return true;
            }

            if ((e.field === "returnvalue")&&(e.record.get("actionname") != "")){
                return true;
            }

            if (e.field !== "paramvalue"){
                return false;
            }

            if ((e.field === "paramvalue")&&(e.record.get("actionname") != "")){
                return false;
            }
            if ((e.field === "paramvalue")&&(e.record.get("paramname") == "")){
                return false;
            }

            if (e.record.get("parametertype") === "Array of String"){
                var data = [];

                if(typeof e.record.get("paramvalue") ==  "string"){
                    e.record.set("paramvalue",[])
                }

                e.record.get("paramvalue").forEach(function(value){
                    data.push({text:Ext.util.Format.htmlEncode(value),paramvalue:value});
                });

                e.record.get("possiblevalues").forEach(function(value){
                    if (!Ext.Array.contains(e.record.get("paramvalue"),value)){
                        data.push({text:Ext.util.Format.htmlEncode(value),paramvalue:value});
                    }
                });

                e.column.setEditor({
                    xtype:"combofieldbox",
                    displayField:"text",
                    descField:"text",
                    height:24,
                    labelWidth: 100,
                    forceSelection:false,
                    createNewOnEnter:true,
                    encodeSubmitValue:true,
                    autoSelect: true,
                    store:Ext.create('Ext.data.Store', {
                        fields: [
                            {type: 'auto', name: 'paramvalue'},
                            {type: 'auto', name: 'text'}
                        ],
                        data: data
                    }),
                    valueField:"paramvalue",
                    queryMode: 'local',
                    removeOnDblClick:true,
                    listeners:{
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                me.navigateToNextParam = true;
                            }
                        }
                    }
                });
                return;
            }
            else{
                e.column.setEditor({
                    xtype:"combo",
                    displayField: 'text',
                    height:20,
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
                    },
                    listeners:{
                        focus: function(){
                            this.selectText();
                        },
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                me.navigateToNextParam = true;
                            }
                        }
                    }
                    //autoEncode: true
                });
            }
            var store = e.column.getEditor().store;
            store.removeAll();
            store.add({text:"&lt;NULL&gt",value:"<NULL>"});

            if (e.record.get("parametertype") == "Boolean"){
                store.add({value:"TRUE",text:"TRUE"});
                store.add({value:"FALSE",text:"FALSE"});
                e.column.getEditor().setEditable(false);
                return;
            }
            var possibleVars = e.record.get("possiblevalues");
            if ( Object.prototype.toString.call( possibleVars ) === '[object Array]'){
                possibleVars.forEach(function(value,index){
                    store.add({value:value,text:Ext.util.Format.htmlEncode(value)});
                });
            }
            if (me.parentActionParamsStore !== null){
                me.parentActionParamsStore.each(function(param){
                    var name = param.get("name");
                    store.add({text:Ext.util.Format.htmlEncode("${"+name+"}"),value:"${"+name+"}"});
                });
            }
            Ext.data.StoreManager.lookup('Variables').each(function(variable){
                var name = variable.get("name");
                store.add({text:Ext.util.Format.htmlEncode("${"+name+"}"),value:"${"+name+"}"});
            });
            e.column.getEditor().setEditable(true);


        });

        this.cellEditing.on("validateedit",function(editor,e){
            me.lastScrollPos = me.parentPanel.getEl().dom.children[0].scrollTop;
        });

        this.cellEditing.on("canceledit",function(editor,e){
            me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos;
        });

        this.cellEditing.on("beforeedit",function(editor,e){
            if (e.value instanceof Array){
                var newValue = [];
                e.value.forEach(function(value){
                    newValue.push({paramvalue:value})
                });
                e.value = newValue;
            }
        });

        //reselect whole action after edit
        //refresh the grid to avoid bottom rows to become invisible due to
        //word wrapping
        this.cellEditing.on("edit",function(editor,e,eOpt){
            me.getView().updateLayout();
            me.getSelectionModel().select(e.record);

            var scrollPlus = 0;
            if (me.navigateToNextParam == true){
                me.navigateToNextParam = false;
                var index = e.record.parentNode.indexOf(e.record);
                if (index + 1 < e.record.parentNode.childNodes.length){
                    scrollPlus = 20;
                    me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos + scrollPlus;
                    editor.startEdit(e.record.parentNode.getChildAt(index + 1), e.column);
                }
                else {

                    var actionIndex = e.grid.getRootNode().indexOf(e.record.parentNode);
                    while(true){
                        var nextAction = null;
                        if(actionIndex + 2 < e.grid.getRootNode().childNodes.length){
                            nextAction = e.grid.getRootNode().getChildAt(actionIndex + 2);
                            if (nextAction.childNodes.length > 0){
                                if (nextAction.isExpanded() == true){
                                    me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos + 40;
                                    editor.startEdit(nextAction.getChildAt(0), e.column);
                                }
                                else{
                                    nextAction.expand(false,function(){
                                        setTimeout(function(){
                                            editor.startEdit(nextAction.getChildAt(0), e.column);
                                            me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos + 60;
                                        },400);
                                    });
                                }
                                break;
                            }
                        }
                        else{
                            me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos + scrollPlus;
                            break;
                        }
                        actionIndex = e.grid.getRootNode().indexOf(nextAction);
                    }
                }
            }
            else{
                me.parentPanel.getEl().dom.children[0].scrollTop = me.lastScrollPos;
            }

        });
        this.plugins= [this.cellEditing];

        this.createAction = function(name,store){
            var foundAction = store.findRecord("name",name);
            if(foundAction === null){
                //Ext.Msg.alert("Error","Action '" + actionPicker.getValue() + "' is not found");
                return null;
            }

            var action = {};
            action.actionname = foundAction.get("name");
            action.actionid = foundAction.get("_id");
            action.icon = Ext.BLANK_IMAGE_URL;
            //action.icon = "images/action.png";
            action.expanded = true;
            action.executionflow = "Record Error Stop Test Case";
            action.host = "Default";
            action.children = [];
            foundAction.get("params").forEach(function(param){
                var value;
                if (param.parametertype === "Array of String"){
                    value = [];
                }
                else{
                    value = "<NULL>";
                }
                action.children.push( {icon: Ext.BLANK_IMAGE_URL,paramname: param.name, leaf: true,paramid:param.id,paramvalue:value,possiblevalues:param.possiblevalues,parametertype:param.parametertype});
            });

            return action;

        };

        this.reorderActions = function(store,newActionOrder){

        };

        this.getCollectionData = function(){
            var root = me.store.getRootNode();
            var collection = [];

            root.eachChild(function(node){
                if (node.get("actionname") !== ""){
                    var action = {};
                    //action.paramname = node.get("paramname");
                    action.order = node.get("order");
                    action.actionid = node.get("actionid");
                    action.host = node.get("host");
                    action.executionflow = node.get("executionflow");
                    action.returnvalue = node.get("returnvalue");
                    action.parameters = [];
                    node.eachChild(function(childNode){
                        var parameter = {};
                        parameter.paramname = childNode.get("paramname");
                        parameter.paramid = childNode.get("paramid");
                        parameter.paramvalue = childNode.get("paramvalue");
                        action.parameters.push(parameter);
                    });
                    collection.push(action);
                }
            });
            return collection;
        };

        this.loadCollection = function(collection){
            me.loadingData = true;
            if((collection === "")||(collection.length == 0)) {
                me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:0});
                me.loadingData = false;
                return;
            }
            var actionStore = Ext.getStore("Actions");

            //used ONLY if there are missing action
            var orderAdjustment = 0;

            collection.sort(function(a,b){return parseInt(a.order,10)-parseInt(b.order,10)});
            collection.forEach(function(action){
                var foundAction = actionStore.findRecord("_id",action.actionid);

                //this means that there is no action like that any more
                //reorder the rest of the actions and ignore this one
                if (foundAction == null){
                    orderAdjustment = orderAdjustment - 1;
                    return;
                }
                var newAction = {};
                newAction.actionname = foundAction.get("name");
                newAction.actionid = foundAction.get("_id");
                newAction.host = action.host;
                newAction.icon = Ext.BLANK_IMAGE_URL;
                newAction.expanded = true;
                newAction.executionflow = action.executionflow;
                newAction.children = [];
                newAction.order =  (parseInt(action.order,10) + orderAdjustment).toString(10);
                //newAction.order = action.order;
                newAction.rowOrder = parseInt(newAction.order,10) + (parseInt(newAction.order,10) - 1);

                foundAction.get("params").forEach(function(searchParam){
                    var foundParam = null;
                    action.parameters.forEach(function(param){
                        if (searchParam.id === param.paramid){
                            foundParam = param;
                            var paramValue = param.paramvalue;
                            if (searchParam.parametertype === "Array of String"){
                                if(!paramValue instanceof Array){
                                    paramValue = [];
                                }
                            }
                            else{
                                if(paramValue instanceof Array){
                                    paramValue = "<NULL>";
                                }
                            }
                            newAction.children.push( {icon: Ext.BLANK_IMAGE_URL,paramname: searchParam.name, leaf: true,paramid:param.paramid,paramvalue:paramValue,possiblevalues:searchParam.possiblevalues,parametertype:searchParam.parametertype});
                        }

                    });
                    if (foundParam == null){
                        var value;
                        if (searchParam.parametertype === "Array of String"){
                            value = [];
                        }
                        else{
                            value = "<NULL>";
                        }
                        newAction.children.push( {icon: Ext.BLANK_IMAGE_URL,paramname: searchParam.name, leaf: true,paramid:searchParam.id,paramvalue:value,possiblevalues:searchParam.possiblevalues,parametertype:searchParam.parametertype});
                    }
                });

                me.store.getRootNode().appendChild(newAction);
                me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:newAction.rowOrder+1});
            });
            me.loadingData = false;


        };


        me.insertAction = function(actionName,actionSelected){
            var actionSelectedOrder;
            var rowOrderSelected;

            if (actionSelected == null){
                actionSelectedOrder = 0;
                rowOrderSelected = 0;
            }else{
                actionSelectedOrder = parseInt(actionSelected.get("order"),10);
                rowOrderSelected = actionSelected.get("rowOrder");
            }

            var action = me.createAction(actionName,Ext.data.StoreManager.lookup('Actions'));
            if (action === null) return;

            if (me.parentActionID == action.actionid){
                Ext.Msg.alert('Error', "You can not add action to itself.");
                //make sure there is always one empty row
                if (me.store.getRootNode().childNodes.length == 0){
                    me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:0});
                }
                return;
            }
            var lastRowOrder = null;
            me.store.getRootNode().eachChild(function(node){
                var order = parseInt(node.get("order"),10);
                if(order > actionSelectedOrder){
                    node.set("order",(order + 1).toString());
                    node.set("rowOrder", node.get("rowOrder") + 2);
                    lastRowOrder = node.get("rowOrder");
                    return;
                }
                if (lastRowOrder !== null){
                    node.set("rowOrder",lastRowOrder + 1);
                    lastRowOrder = null;
                }

            });
            action.order = actionSelectedOrder+1;
            action.rowOrder = rowOrderSelected+2;
            var newRecord = me.store.getRootNode().appendChild(action);
            me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:action.rowOrder+1});
            me.store.sort("rowOrder","ASC");
            var rowIndex = me.getView().indexOf(newRecord);
            me.getView().getNode(rowIndex).scrollIntoView(me.parentPanel.getEl());
            me.getSelectionModel().select(newRecord);
            //if (newRecord.childNodes.length > 0){
                //me.cellEditing.startEdit(newRecord.getChildAt(0), me.down("#paramvalue"));
            //}

        };

        var barItems = [
                {
                    iconCls: 'icon-add',
                    tooltip:"Add Action",
                    itemId: "addAction",
                    handler: function(){
                        this.setDisabled(true);
                        //if store is empty
                        if(me.store.getRootNode().childNodes.length == 1){
                            me.store.getRootNode().removeAll();
                        }
                        var actionPicker = this.up("toolbar").down("#actionpicker");
                        var action = me.createAction(actionPicker.getValue(),actionPicker.store);
                        if (action === null) {
                            this.setDisabled(false);
                            return;
                        }
                        if (me.parentActionID == action.actionid){
                            Ext.Msg.alert('Error', "You can not add action to itself.");
                            this.setDisabled(false);
                            return;
                        }
                        var actionsGrid = this.up("actioncollection");
                        action.order = parseInt(((actionsGrid.store.getRootNode().childNodes.length + 1)/2)+1,10);
                        if (action.order == 1){
                            action.rowOrder = action.order;
                        }else{
                            action.rowOrder = action.order + (action.order - 1);
                        }
                        var newRecord = actionsGrid.store.getRootNode().appendChild(action);
                        actionsGrid.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:action.rowOrder+1});
                        this.setDisabled(false);
                        var rowIndex = me.getView().indexOf(newRecord);
                        me.getView().getNode(rowIndex).scrollIntoView(me.parentPanel.getEl());
                        me.getSelectionModel().select(newRecord);
                        if (newRecord.childNodes.length > 0){
                            me.cellEditing.startEdit(newRecord.getChildAt(0), me.down("#paramvalue"));
                        }
                    }
                },
                {
                    icon: 'images/insert.png',
                    tooltip:"Insert Action",
                    itemId: "insertAction",
                    handler: function(){
                        var actionsGrid = this.up("actioncollection");
                        if (actionsGrid.getSelectionModel().getSelection().length === 0){
                            return;
                        }

                        var actionPicker = this.up("toolbar").down("#actionpicker");

                        var actionsFound = 0;
                        me.getSelectionModel().getSelection().forEach(function(node){
                            if(node.get("actionname") != ""){
                                actionsFound++;
                            }
                        });
                        if (actionsFound == 1){
                            me.insertAction(actionPicker.getValue(),me.getSelectionModel().getSelection()[0]);
                        }

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
                        specialkey: function(field, e){
                            if (e.getKey() === e.ENTER) {
                                if (field.isExpanded == false){
                                    field.up("toolbar").down("#addAction").handler();
                                }
                                this.clearValue();
                            }
                        }
                    }
                },
                "-"," ",
                {
                    icon: 'images/page_copy.png',
                    tooltip:"Copy Selected Actions (Ctrl-c)",
                    itemId: "copyActions",
                    handler: function(){
                        var actionsGrid = this.up("actioncollection");
                        actionsGrid.copyToClipboard()
                    }
                },
                {
                    icon: 'images/paste_plain.png',
                    tooltip:"Paste Actions (Ctrl-v)",
                    itemId: "pasteActions",
                    handler: function(){
                        var actionsGrid = this.up("actioncollection");
                        actionsGrid.pasteFromClipboard();
                    }
                },"-"," ",
                {
                    icon: 'images/arrow_in.png',
                    tooltip:"Collapse All",
                    itemId: "collapseAll",
                    handler: function(){
                        var actionsGrid = this.up("actioncollection");
                        actionsGrid.getRootNode().collapseChildren();
                    }
                },
                {
                    icon: 'images/arrow_out.png',
                    tooltip:"Expand All",
                    itemId: "expandAll",
                    handler: function(){
                        var actionsGrid = this.up("actioncollection");
                        actionsGrid.getRootNode().expandChildren();
                    }
                }
        ];

        this.bbar ={
            xtype: 'toolbar',
            dock: 'bottom',
            items: barItems


        };

        this.tbar ={
            xtype: 'toolbar',
            dock: 'top',
            items: barItems
        };

        this.copyToClipboard = function(){
            var data = [];
            this.getSelectionModel().getSelection().forEach(function(row){
                if (row.get("order") != ""){
                    var children = [];
                    row.childNodes.forEach(function(child){
                        children.push(Ext.clone(child.data));
                    });
                    var newRow = Ext.clone(row.data);
                    newRow.children = children;
                    data.push(newRow);
                    //data.push(row.copy(null,true));
                }
            });
            data.sort(function(a,b){return parseInt(a.order,10)-parseInt(b.order,10)});
            Ext.clipboard = {type:"action",data:data};
        };

        this.pasteFromClipboard = function(){
            if (Ext.clipboard.type == "action"){
                if (Ext.clipboard.data.length == 0) return;
                //if store is empty
                if(me.store.getRootNode().childNodes.length == 1){
                    me.store.getRootNode().removeAll();
                }

                var cloneAction = function(newAction,actionToClone){
                    newAction.children = [];
                    actionToClone.children.forEach(function(child){
                        newAction.children.push(Ext.clone(child))
                    });
                    newAction.actionname = actionToClone.actionname;
                    newAction.executionflow = actionToClone.executionflow;
                    newAction.host = actionToClone.host;
                    newAction.actionid = actionToClone.actionid;
                    newAction.icon = actionToClone.icon;
                    newAction.expanded = true;
                };

                var waitMsg = function(){Ext.MessageBox.show({
                    msg: 'Pasting Actions Please wait...',
                    progressText: 'Pasting Actions...',
                    width:300,
                    wait:true,
                    waitConfig: {interval:200}
                    //animateTarget: 'mb7'
                })};
                //if nothing is selected
                if ((this.getSelectionModel().getSelection().length == 0) || (me.store.getRootNode().childNodes.length == 0)){
                    waitMsg();
                    setTimeout(function(){
                        var startingOrder = ((me.store.getRootNode().childNodes.length + 1)/2)+1;

                        //Ext.clipboard.data.forEach(function(action){
                        for(var i = 0;i<Ext.clipboard.data.length;i++){
                            var newAction = {};
                            var order = startingOrder + i;
                            newAction.order =parseInt(order,10);

                            if (newAction.order == 1){
                                newAction.rowOrder = newAction.order;
                            }else{
                                newAction.rowOrder = parseInt(order + (order - 1));
                            }
                            //cloneAction(newAction,Ext.clipboard.data[i]);
                            var actionToClone = Ext.clipboard.data[i];
                            newAction.children = [];
                            actionToClone.children.forEach(function(child){
                                newAction.children.push(Ext.clone(child))
                            });
                            newAction.actionname = actionToClone.actionname;
                            newAction.executionflow = actionToClone.executionflow;
                            newAction.host = actionToClone.host;
                            newAction.actionid = actionToClone.actionid;
                            newAction.icon = actionToClone.icon;
                            newAction.expanded = true;

                            var newRecord = me.store.getRootNode().appendChild(newAction);
                            me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:Ext.clipboard.data[i].rowOrder+1});

                            if (i==Ext.clipboard.data.length-1){
                                var rowIndex = me.getView().indexOf(newRecord);
                                me.getView().getNode(rowIndex).scrollIntoView(me.parentPanel.getEl());
                                me.getSelectionModel().select(newRecord);
                                Ext.MessageBox.hide();
                            }
                        }
                    },0);
                }
                //if one record is selected, don't do anything with multiple rows selected
                else{
                    var selectedAction = null;
                    for (var i =0;i<me.getSelectionModel().getSelection().length;i++){
                        if (me.getSelectionModel().getSelection()[i].get("order") != ""){
                            //if more than one action is selected don't do anything
                            if (selectedAction != null) return;
                            selectedAction = me.getSelectionModel().getSelection()[i];
                        }
                    }
                    if (selectedAction == null) return;
                    waitMsg();

                    var lastRowOrder = null;
                    var selectedActionOrder = parseInt(selectedAction.get("order"),10);
                    var numberToPaste = Ext.clipboard.data.length;


                    setTimeout(function(){

                        me.store.getRootNode().eachChild(function(node){
                            var order = parseInt(node.get("order"),10);
                            if(order > selectedActionOrder){
                                node.set("order",(order + numberToPaste).toString());
                                node.set("rowOrder", node.get("rowOrder") + (numberToPaste * 2));
                                lastRowOrder = node.get("rowOrder");
                                return;
                            }
                            if (lastRowOrder !== null){
                                node.set("rowOrder",lastRowOrder + 1);
                                lastRowOrder = null;
                            }

                        });

                        var startingOrder = selectedActionOrder+1;

                        Ext.clipboard.data.forEach(function(action,index){
                            var newAction = {};
                            var order = startingOrder + index;
                            newAction.order =parseInt(order,10);

                            if (newAction.order == 1){
                                newAction.rowOrder = newAction.order;
                            }else{
                                newAction.rowOrder = parseInt(order + (order - 1));
                            }
                            //cloneAction(newAction,action);
                            var actionToClone = action;
                            newAction.children = [];
                            actionToClone.children.forEach(function(child){
                                newAction.children.push(Ext.clone(child))
                            });
                            newAction.actionname = actionToClone.actionname;
                            newAction.executionflow = actionToClone.executionflow;
                            newAction.host = actionToClone.host;
                            newAction.actionid = actionToClone.actionid;
                            newAction.icon = actionToClone.icon;
                            newAction.expanded = true;

                            var newRecord = me.store.getRootNode().appendChild(newAction);
                            me.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:newAction.rowOrder+1});

                            if (index==Ext.clipboard.data.length-1){
                                me.store.sort("rowOrder","ASC");
                                var rowIndex = me.getView().indexOf(newRecord);
                                me.getView().getNode(rowIndex).scrollIntoView(me.parentPanel.getEl());
                                me.getSelectionModel().select(newRecord);
                                Ext.MessageBox.hide();
                            }
                        });
                    },0);

                }
            }
        };

        this.callParent(arguments);

        //this.getView().on("beforeitemkeydown",function(view,record,item,index,e){
        //});

    }
});