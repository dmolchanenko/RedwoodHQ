Ext.define('Redwood.view.CollabWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.collabWindow',
    userOffline: '<span style="color:red;font-weight:bold" data-qtip="User is Offline">*</span>',
    newUser: true,
    defaultFocus: "username",
    title: 'Choose User To Collaborate With',
    id: "CollabUsers",
    draggable: true,
    resizable: false,
    width: 260,
    height: 300,
    layout: 'fit',
    modal: true,

    initComponent: function () {
        var me = this;

        me.userGrid = new Ext.grid.Panel({
            store: Ext.data.StoreManager.lookup('Users'),
            itemId:"usersGrid",
            selType: 'rowmodel',
            viewConfig: {
                markDirty: false
            },
            maxHeight: 250,
            minHeight: 150,
            manageHeight: true,
            flex: 1,
            overflowY: 'auto',
            listeners:{
                selectionchange: function(grid,records){
                    if(records.length == 0){
                        me.down("#OKbtn").setDisabled(true);
                        return;
                    }
                    if(records[0].get("status") == "online"){
                        me.down("#OKbtn").setDisabled(false);
                    }
                    else{
                        me.down("#OKbtn").setDisabled(true);
                    }
                }
            },
            columns:[
                {
                    header: 'Status',
                    dataIndex: 'status',
                    width: 50,
                    renderer:function(value, meta, record){
                        if(value == "online"){
                            meta.style = 'background-image: url(images/online.png);background-position: center; background-repeat: no-repeat;';
                            meta.tdAttr = 'data-qtip="User is Online"';
                        }
                        else{
                            meta.style = 'background-image: url(images/offline.png);background-position: center; background-repeat: no-repeat;';
                            meta.tdAttr = 'data-qtip="User is Offline"';
                        }
                    }
                },
                {
                    header: 'Name',
                    dataIndex: 'name',
                    width: 177
                }
            ]

        });

        this.items = {
            xtype:"form",
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            layout:"fit",
            bodyPadding: 5,
            defaultFocus: "noteText",
            border: false,
            defaults: {
                anchor: '100% 100%',
                flex: 1,
                layout: 'fit',
                bodyPadding: 5
            },
            items: [me.userGrid],

            buttons: [
                {
                    xtype: "button",
                    text: "OK",
                    disabled:true,
                    itemId:"OKbtn",
                    handler: function(btn){
                        var selected = me.userGrid.getSelectionModel().getSelection();
                        if(selected.length == 1){
                            Redwood.app.getController("Collaboration").onSendShareRequest(selected[0],me,me.tab);
                            Ext.MessageBox.show({
                                msg: 'Requesting Collaboration...',
                                progressText: 'Requesting...',
                                width:300,
                                wait:true,
                                waitConfig: {interval:200},
                                buttons: Ext.MessageBox.CANCEL,
                                fn: function(id){
                                    Ext.MessageBox.hide();
                                }
                            });
                        }
                    }
                },{
                    xtype: "button",
                    text: "Cancel",
                    handler: function(){
                        this.up("window").close();
                    }
                }

            ]
        };
        this.callParent(arguments);
    }

});