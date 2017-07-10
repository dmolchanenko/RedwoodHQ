var newAction = Ext.create('Ext.Action', {
    icon: 'images/page_add.png',
    text: 'New Action',
    itemId: "newAction",
    tooltip: "New Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        //if (editor == undefined){
        //    editor = this.up('#treeContext').scriptEditor;
        //}
        editor.fireEvent('newAction');
    }
});

var recordStepsActionActions = Ext.create('Ext.Action', {
    icon: 'images/media_record.png',
    tooltip: "Start Looking Glass Utility",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        Redwood.app.getController("Scripts").onRecordSteps();
    }
});

var saveAction = Ext.create('Ext.Action', {
    icon: "images/save.gif",
    itemId:"saveAction",
    tooltip: "Save Selected Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        editor.fireEvent('saveAction');
    }
});

var deleteAction = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    text: 'Delete',
    itemId: "deleteAction",
    tooltip: "Delete Selected Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        editor.fireEvent('deleteAction');
    }
});

var cloneAction = Ext.create('Ext.Action', {
    icon: 'images/clone.png',
    //text: 'Delete',
    itemId: "cloneAction",
    tooltip: "Clone Selected Action",
    handler: function(widget, event) {
        var editor = this.up('actions');
        editor.fireEvent('cloneAction');
    }
});

function formatAction(val,metaData,record) {
    metaData.tdAttr = 'data-qtip="' + record.get("description") + '"';
    return '<img src="images/action.png" align="top"> '+val;
}

Ext.define('Redwood.view.Actions', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.actions',
    id: "actionsBrowser",
    title: "Actions",
    layout: 'border',

    initComponent: function () {

        var actionListFlat = {
            //region: 'west',
            //split:true,
            xtype: 'grid',
            plugins: [
                "bufferedrenderer"],
            hideCollapseTool: true,
            //collapseDirection: "left",
            //collapsible: true,
            multiSelect: false,
            id:"actionsGrid",
            store: Ext.data.StoreManager.lookup('Actions'),
            width: 206,
            title: "Actions",
            focused: false,
            hideHeaders: true,
            viewConfig: {
                plugins: {
                    ptype: 'gridviewdragdrop',
                    enableDrag: true,
                    enableDrop: false,
                    ddGroup: "actionDrop"
                    //dragGroup: 'firstGridDDGroup',
                    //dropGroup: 'secondGridDDGroup'
                },
                markDirty: false
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    me.up('actions').fireEvent('editAction',record);
                }
            },
            columns: [
                {
                    //header: 'Actions',
                    dataIndex: 'name',
                    flex: 1,
                    renderer: formatAction
                    //width: 200
                }
            ],
            tbar: {
                xtype: 'toolbar',
                dock: 'top',
                vertical:true,
                items: [
                    {
                        width: 200,
                        xtype: 'searchfield',
                        paramNames: ["tag","name"],
                        store: Ext.data.StoreManager.lookup('Actions')
                    },
                    {
                        xtype:"filtercombo",
                        store: ["ALL","Automated","To be Automated","Needs Maintenance"],
                        propertyName:"status",
                        allValue:"ALL",
                        value:"ALL",
                        storeToFilter: Ext.data.StoreManager.lookup('Actions')
                    }
                ]

            }
        };

        var actionListTree = {
            xtype: 'treepanel',
            plugins: [
                "bufferedrenderer"],
            multiSelect: false,
            hideCollapseTool: true,
            rootVisible: false,
            store: Ext.data.StoreManager.lookup('ActionsTree'),
            width: 206,
            title: "Actions Tree",
            focused: false,
            hideHeaders: true,
            displayField:"name",
            viewConfig: {
                markDirty: false,
                plugins: {
                    ptype: 'treeviewdragdrop',
                    enableDrag: true,
                    enableDrop: false,
                    ddGroup: "actionDrop"
                }
            },
            listeners:{
                itemdblclick: function(me, record, element, node_index, event) {
                    if (!record.get("tagValue")){
                        var found = Ext.data.StoreManager.lookup('Actions').query("_id",record.get("_id"),false,true,true).getAt(0);
                        me.up('actions').fireEvent('editAction',found);
                    }
                }
            }
        };


        this.items=[
            {
                xtype:"panel",
                layout: "accordion",
                region: 'west',
                split:true,
                width: 206,
                collapseDirection: "left",
                hideHeaders: true,
                collapsible: true,
                items:[actionListFlat,actionListTree]

            },
            {
                xtype:"panel",
                region:"center",
                layout: "fit",
                //autoScroll:true,
                tbar: {
                    xtype: 'toolbar',
                    dock: 'top',
                    items:[
                        newAction,
                        saveAction,
                        " ",
                        deleteAction,
                        "-",
                        cloneAction,
                        recordStepsActionActions
                    ]
                },
                items:[
                    {
                        xtype:"tabpanel",
                        itemId: 'actionstab',
                        ui: "black-tab",
                        //defaults:{ autoScroll:true },
                        plugins: [
                            Ext.create('Ext.ux.TabCloseMenu', {

                            }),
                            Ext.create('Ext.ux.TabReorderer', {

                            })
                        ],
                        listeners:{
                            tabchange: function(me,tab){
                                if (tab.dataRecord != null){
                                    window.history.replaceState("", "", '/index.html?action='+tab.dataRecord.get("_id")+"&project="+Ext.util.Cookies.get('project'));
                                }
                                else{
                                    window.history.replaceState("", "", '/index.html');
                                }
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
                ]
            }
        ];
        /*
        this.tbar = {
            xtype: 'toolbar',
            dock: 'top',
            items:[
                newAction,
                saveAction,
                " ",
                deleteAction
            ]
        };
        */
        this.callParent(arguments);
    }
});

