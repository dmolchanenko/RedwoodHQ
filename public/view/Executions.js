Ext.define('Redwood.view.ExecutionsGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.executionsgrid',
    store: 'Executions',
    selType: 'rowmodel',
    title: "[All Executions]",
    //viewType:"All Executions",

    viewConfig: {
        markDirty: false
    },
    minHeight: 150,
    manageHeight: true,
    selModel: Ext.create('Ext.selection.CheckboxModel', {
        singleSelect: false,
        sortable: true,
        stateful: true,
        showHeaderCheckbox: true,
        listeners: {}
    }),
    initComponent: function () {
        var executionsEditor = this;

        this.tbar ={
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    iconCls: 'icon-add',
                    tooltip:"Add Action",
                    itemId: "addAction",
                    handler: function(){
                        var actionPicker = this.up("toolbar").down("#actionpicker");
                        if (actionPicker.getValue() == null || actionPicker.getValue() == "") return;
                        me.waitMsg("Adding Action");
                        this.setDisabled(true);
                        //if store is empty
                        if(me.store.getRootNode().childNodes.length == 1){
                            me.store.getRootNode().removeAll();
                        }
                        var action = me.createAction(actionPicker.getValue(),actionPicker.store);
                        if (action === null) {
                            Ext.MessageBox.hide();
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
                        var node = actionsGrid.store.getRootNode().appendChild({icon: Ext.BLANK_IMAGE_URL,expanded:false,rowOrder:action.rowOrder+1});
                        this.setDisabled(false);
                        me.plugins[0].scrollTo(newRecord.get("rowOrder")+5000,true);
                        if (newRecord.childNodes.length > 0){
                            me.cellEditing.startEdit(newRecord.getChildAt(0), me.down("#paramvalue"));
                        }
                        Ext.MessageBox.hide();
                    }
                }
            ]
        };
        this.columns = [
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                width: 400,
                renderer: function(value,meta,record){
                    return "<a style= 'color: blue;' href='javascript:openExecution(&quot;"+ record.get("_id") +"&quot;)'>" + value +"</a>";
                }
            },
            {
                header: 'Test Set',
                dataIndex: 'testsetname',
                //flex: 1,
                width: 200
            },
            {
                header: 'Status',
                dataIndex: 'status',
                width: 100,
                renderer: function(value,meta,record){
                    if (value == "Ready To Run" && record.get("locked") == false){
                        return "<p style='font-weight:bold;color:#ffb013'>"+value+"</p>";
                    }
                    else if(record.get("locked") == true){
                        return "<p style='font-weight:bold;color:#6727ff'>"+"Locked"+"</p>";
                    }
                    else{
                        return "<p style='font-weight:bold;color:green'>"+value+"</p>";
                    }
                }
            },
            {
                header: 'Tags',
                dataIndex: 'tag',
                width: 400
            },
            {
                xtype:"datecolumn",
                header: 'Last Run',
                dataIndex: 'lastRunDate',
                format:'m/d h:i:s',
                width: 100
            },
            {
                header: 'Run Time',
                dataIndex: 'runtime',
                width: 75,
                renderer: function(value,meta,record){
                    if (value == "") return "";
                    var hours = Math.floor(parseInt(value,10) / 36e5),
                        mins = Math.floor((parseInt(value,10) % 36e5) / 6e4),
                        secs = Math.floor((parseInt(value,10) % 6e4) / 1000);
                    return hours+"h:"+mins+"m:"+secs+"s";
                }
            },
            {
                header: 'Lock',
                dataIndex: 'locked',
                width: 35,
                renderer: function(value,record){
                    if (value == true){
                        return '<img src="images/lock_ok.png" data-qtip="Execution Locked"/>'
                    }
                    else{
                        return '<img src="images/lock_open.png" data-qtip="Execution Unlocked" />'
                    }
                }
            },
            {
                xtype: 'actioncolumn',
                width: 50,
                items: [
                    {
                        icon: 'images/edit.png',
                        tooltip: 'View',
                        handler: function(grid, rowIndex, colIndex) {
                            var editor = this.up('executionsEditor');
                            editor.fireEvent('executionEdit', grid.store.getAt(rowIndex).get("_id"));
                        }
                    },
                    {
                        icon: 'images/delete.png',
                        tooltip: 'Delete',
                        handler: function(grid, rowIndex, colIndex) {
                            var editor = this.up('executionsEditor');
                            editor.fireEvent('executionDelete', grid.store.getAt(rowIndex));
                        }
                    }
                ]
            }
        ];

        this.callParent(arguments);
    }
});

Ext.define('Redwood.view.Executions', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.executionsEditor',
    id:"executionsBrowser",
    region:"center",
    layout: "fit",

    initComponent: function () {
        var me = this;
        this.items=[
            {
                xtype: "tabpanel",
                ui: "red-tab",
                itemId:"executionsTab",
                plugins: [
                    Ext.create('Ext.ux.TabCloseMenu', {

                    }),
                    Ext.create('Ext.ux.TabReorderer', {

                    })
                ],
                setURLs: function(){
                    tab = this.getActiveTab();
                    if (tab.dataRecord != null){
                        if (tab.dataRecord.testcase){
                            window.history.replaceState("", "", '/index.html?result='+tab.dataRecord.testcase._id+"&project="+Ext.util.Cookies.get('project'));
                        }
                        else if (tab.dataRecord.executionIDs){
                            var allIDs = "";
                            tab.dataRecord.executionIDs.forEach(function(id){
                                if (allIDs != ""){
                                    allIDs = allIDs + "," + id.executionID;
                                }
                                else{
                                    allIDs = id.executionID;
                                }
                            });
                            window.history.replaceState("", "", '/index.html?aggregate='+allIDs+"&project="+Ext.util.Cookies.get('project'));
                        }
                        else{
                            window.history.replaceState("", "", '/index.html?execution='+tab.dataRecord.get("_id")+"&project="+Ext.util.Cookies.get('project'));
                        }
                    }
                    else{
                        window.history.replaceState("", "", '/index.html');
                    }
                },
                items:[
                    {
                        xtype:"executionsgrid",
                        listeners:{
                            celldblclick: function(me,td,cell,record){
                                var editor = this.up('executionsEditor');
                                editor.fireEvent('executionEdit',record.get("_id"));
                            }
                        }
                    }
                ],
                listeners:{
                    tabchange: function(me,tab){
                        me.setURLs();
                    },
                    afterrender: function(me){
                        me.items.on("remove",function(){
                            if(me.items.length == 0){
                                window.history.replaceState("", "", '/index.html');
                            }
                        })
                    }
                }

            }
        ];


        this.dockedItems = [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                //'<-',
                {
                    iconCls: 'icon-add',
                    text: 'New Execution',
                    itemId:"newExecution",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('newExecution');
                    }
                }
                ,
                "-",
                {
                    icon: "images/save.gif",
                    itemId:"saveExecution",
                    tooltip: "Save Selected Execution",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('save');
                    }
                },
                "-",
                {
                    icon: "images/stop.png",
                    tooltip: "Stop Selected Execution",
                    itemId: "stopExecution",
                    disabled: true,
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('stop');
                    }
                },
                {
                    icon: "images/play.png",
                    tooltip: "Run Selected Execution",
                    disabled: true,
                    itemId: "runExecution",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('run');
                    }
                },
                {
                    width: 400,
                    fieldLabel: 'Search',
                    labelWidth: 50,
                    xtype: 'searchfield',
                    itemId:"searchExecution",
                    paramNames: ["tag","name"],
                    store: Ext.data.StoreManager.lookup('Executions')
                },
                "-",
                {
                    icon: "images/symbol_sum.png",
                    tooltip: "Select Executions to Aggregate",
                    itemId: "aggregationReport",
                    handler: function(widget, event) {
                        var editor = this.up('executionsEditor');
                        editor.fireEvent('aggregate');
                    }
                }
            ]
        }];
        this.callParent(arguments);
    }



});