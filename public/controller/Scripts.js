Ext.define("Redwood.controller.Scripts", {
    extend: 'Ext.app.Controller',

    stores: ['Scripts'],
    models: ['Scripts'],
    views:  ['ScriptBrowser'],

    init: function () {
        this.control({
            'scriptBrowser': {
                newScript: this.onNewScript,
                scriptEdit: this.onScriptEdit,
                render: this.onScriptRender,
                saveAll: this.onScriptSave
            },
            'scriptBrowser button': {

            }
        });
    },

    onNewScript: function(){
        var selection = this.treePanel.getSelectionModel().getSelection()[0];
    },

    onScriptSave: function(callback){
        var allScripts = Ext.ComponentQuery.query('codeeditorpanel');
        var total = 0;
        Ext.each(allScripts, function(script, index) {
            if (script.dirty == true){
                Ext.Ajax.request({
                    url:"/script",
                    method:"POST",
                    jsonData : {path:script.path,text:script.getValue()},
                    success: function(response, action) {
                        script.clearDirty();
                        total++;
                        if (total == allScripts.length){
                            callback();
                        }
                    }
                });
            }
            else{
                total++;
                if (total == allScripts.length){
                    callback();
                }
            }
        });
    },

    onScriptEdit: function(record){
        if (this.tabPanel.getComponent(record.get("fullpath")) == undefined){
            var tab = this.tabPanel.add({title:record.get("text"),closable:true,xtype:"codeeditorpanel",itemId:record.get("fullpath")});
            Ext.Ajax.request({
                url:"/script/get",
                method:"POST",
                jsonData : {path:record.get("fullpath")},
                success: function(response, action) {
                    var obj = Ext.decode(response.responseText);
                    tab.title = record.get("text");
                    tab.path = record.get("fullpath");
                    tab.setValue(obj.text);
                    tab.clearDirty();
                }
            });
        }
        this.tabPanel.setActiveTab(record.get("fullpath"));
    },

    onScriptRender: function(){
        this.scriptBrowser = Ext.ComponentQuery.query('scriptBrowser')[0];
        this.tabPanel = Ext.ComponentQuery.query('tabpanel',this.scriptBrowser)[0];
        this.treePanel = Ext.ComponentQuery.query('treepanel',this.scriptBrowser)[0];
        //this.tabPanel = this.scriptBrowser.down("panel").getComponent("scriptstab");
    }


});