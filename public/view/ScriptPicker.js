Ext.define('Redwood.view.ScriptViewer', {
    extend: 'Ext.window.Window',
    alias: 'widget.scriptViewer',
    width: 400,
    height: 300,
    layout: 'fit',
    draggable: true,
    resizable: true,
    modal: true,
    title: 'Select Script',

    initComponent: function () {
        var me = this;
        this.items=[
            {
                xtype: "panel",
                layout: "anchor",
                items:[
                    {
                        xtype: 'treepanel',
                        multiSelect: false,
                        rootVisible: false,
                        height: 235,
                        store:  Ext.create('Redwood.store.MethodFinder'),
                        focused: false,
                        viewConfig: {
                            markDirty: false,
                            stripeRows: true
                        },
                        listeners:{
                            selectionchange: function(tree,record){
                                if (record[0].get("type") == "method"){
                                    me.down("#OK").setDisabled(false);
                                }
                                else{
                                    me.down("#OK").setDisabled(true);
                                }
                            }
                        }
                    },
                    {
                        xtype:"panel",
                        layout: {
                            type: 'hbox',
                            align: 'spaced',
                            pack: "center",
                            defaultMargins: {right:15}
                        },
                        items:[
                            {
                                xtype:"button",
                                itemId: "OK",
                                text: "OK",
                                disabled: true,
                                handler: function(){
                                    me.fireEvent("methodselected",me.down("treepanel").getSelectionModel().getSelection()[0]);
                                    me.close();
                                }
                            },
                            {
                                xtype:"button",
                                text: "Cancel",
                                handler: function(){
                                    me.close();
                                }
                            }
                        ]
                    }
                ]
            }

        ];
        this.callParent(arguments);
    },
    listeners:{
        afterrender: function(me){
        }
    }




});

Ext.define('Redwood.view.ScriptPickerView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.scriptPickerView',
    layout: {
        type:'hbox'
    },

    items:[
        {
            xtype:"scriptPicker",
            itemId:"scriptPath",
            width:700,
            listeners: {
                change: function(picker){
                    picker.up("panel").fireEvent('change');
                }
            }
        },
        {
            xtype:'combo',
            fieldLabel: 'Language',
            labelPad:0,
            padding: '0 0 0 5',
            //width:255,
            store: ["Java/Groovy","Python","C#"],
            forceSelection: true,
            editable: false,
            allowBlank: false,
            itemId:"scriptLang",
            value:"Java/Groovy",
            listeners: {
                change: function(field, e){
                    field.up("panel").fireEvent('change');
                }
            }
        }
    ]


});

Ext.define('Redwood.view.ScriptPicker', {
    extend: 'Ext.form.field.Trigger',
    alias: 'widget.scriptPicker',

    trigger1Cls: Ext.baseCSSPrefix + 'form-search-trigger',
    trigger2Cls: Ext.baseCSSPrefix + 'form-goto-trigger',
    fieldLabel: "Select Script",
    editable: true,

    openScriptViewer: function(){
        var me = this;
        var scripts = new Redwood.view.ScriptViewer();
        scripts.on("methodselected",function(record){
            var method = record.get("fullpath");
            method = method.substring(method.lastIndexOf("/")+1,method.length);
            //method = method.split("src/")[1];
            method = method.substring(0,method.length - 7);
            me.setValue(method);
            if(record.get("fullpath").indexOf(".groovy/") != -1){
                me.up("panel").down("#scriptLang").setValue("Java/Groovy")
            }
            else if(record.get("fullpath").indexOf(".java/") != -1){
                me.up("panel").down("#scriptLang").setValue("Java/Groovy")
            }
            else if(record.get("fullpath").indexOf(".py/") != -1){
                me.up("panel").down("#scriptLang").setValue("Python")
            }
            else if(record.get("fullpath").indexOf(".cs/") != -1){
                me.up("panel").down("#scriptLang").setValue("C#")
            }
        });
        scripts.show();
    },

    onTrigger1Click: function() {
        this.openScriptViewer();
    },
    onTrigger2Click: function() {
        var fullPath = "/src/"+this.getValue().replace(/\./g, '/');
        fullPath = fullPath.substring(0,fullPath.lastIndexOf("/"));
        var mainTab = Ext.ComponentQuery.query('#mainTabPanel')[0];
        mainTab.setActiveTab(mainTab.down("#ScriptBrowser"));
        Redwood.app.getController("Scripts").onScriptEdit(fullPath+".groovy");
        Redwood.app.getController("Scripts").onScriptEdit(fullPath+".java");
        Redwood.app.getController("Scripts").onScriptEdit(fullPath.substring(0,fullPath.lastIndexOf("/"))+".py");
        Redwood.app.getController("Scripts").onScriptEdit(fullPath+".py");
    },

    listeners:{
        afterrender: function(me){
            //me.inputEl.dom.onclick = function(){
            //    me.openScriptViewer();
            //}
        }
    }

});

