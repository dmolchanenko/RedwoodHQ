var newScriptAction = Ext.create('Ext.Action', {
    icon: 'images/page_add.png',
    text: 'File',
    tooltip: "New File",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('newScript');
    }
});

var saveScriptAction = Ext.create('Ext.Action', {
    iconCls: 'icon-save',
    //text: '',
    disabled: false,
    tooltip: "Save All",
    handler: function(widget, event) {
        this.disabled = true;
        var me = this;
        this.up('scriptBrowser').fireEvent('saveAll',function(){
            me.disabled = false;
        });
    }
});

var newItemMenu = Ext.create('Ext.button.Split',{
    text: "New",
    iconCls: 'icon-add',
    handler: function(){
        this.showMenu();
    },
    menu: new Ext.menu.Menu({

        items: [
            newScriptAction
        ]

    })
});


Ext.define('Redwood.view.ScriptBrowser', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.scriptBrowser',

    layout: 'fit',
    listeners:{
        afterrender:function(){
            this.setHeight(this.findParentByType('viewport').getHeight()-27);
        }
    },

    initComponent: function () {
        var scriptEditor = this;
        var scriptView = Ext.create('Ext.Panel', {
            layout: 'border',

            items: [
                {
                    region: 'west',
                    split:true,
                    xtype: 'treepanel',
                    collapseDirection: "left",
                    collapsible: true,
                    title: 'Scripts',
                    store: Ext.data.StoreManager.lookup('Scripts'),
                    width: 150,
                    listeners: {
                        itemdblclick: function(me,record,item,index,evt,eOpts){
                            if (record.get("cls") != "folder"){
                                scriptEditor.fireEvent('scriptEdit', record);
                            }
                        },
                        load: function(){
                            this.getSelectionModel().select(this.getRootNode());
                        }
                    }
                },
                {
                    xtype:'tabpanel',
                    itemId: 'scriptstab',
                    id:'scriptstab',
                    region: 'center',
                    listeners: {
                        tabchange: function(tabPanel,newCard,oldCard,eOpts){
                            newCard.focus();
                        }
                    }

                }
            ]

        });

        window.onbeforeunload = function(){
            var allScripts = Ext.ComponentQuery.query('codeeditorpanel');

            for (var i=0;i<allScripts.length;i++){
                if (allScripts[i].dirty == true){
                    return "You have unsaved changes in one of your scripts.";
                }
            }
        };
        this.items = [scriptView];
        this.tbar = {
            xtype: 'toolbar',
                dock: 'top',
                items:[newItemMenu,saveScriptAction]
        };
        this.callParent(arguments);
    }
});