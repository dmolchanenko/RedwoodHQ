Ext.define('Redwood.ux.DiffPanel', {
    extend: 'Ext.panel.Panel',
    //extend: 'Ext.Component',
    alias: 'widget.diffpanel',
    layout:     'fit',
    frame: true,
    preventHeader: true,
    plain:      true,
    dirty: false,
    fireSyncEvent: false,
    //height:"100%",
    //anchor:"100%",
    //autoScroll:false,

    title:"",
    markDirty: function(){
        this.dirty = true;
        if(this.title.charAt(this.title.length-1) != "*"){
            this.setTitle(this.title+"*")
        }
    },


    afterRender: function(){
        var me = this;
        //var target = this.getEl().dom.firstChild;
        var target = this.getEl().dom;
        target.innerHTML = "";
        var value = "";
        this.editor = CodeMirror.MergeView(target, {
            value: value,
            origLeft: value,
            indentUnit: 4,
            tabSize: 4,
            lineNumbers: true,
            mode: me.editorType
        });
        this.editor.edit.setSize("100%",target.parentElement.clientHeight);
        this.editor.left.orig.setSize("100%",target.parentElement.clientHeight);
        target.parentElement.onresize=function(){
            me.editor.edit.setSize("100%",target.parentElement.clientHeight);
            me.editor.left.orig.setSize("100%",target.parentElement.clientHeight);
        };
        this.editor.edit.refresh();
        this.editor.edit.on("changes",function(cm,changeOpt){
            if(me.fireSyncEvent == true){
                me.up('scriptBrowser').fireEvent('syncDiffs',me);
            }
        });

        if(me.editorType == "text/x-python"){
            this.editor.setOption("extraKeys", {
                Tab: function(cm) {
                    var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(spaces,"end");
                },
                "Ctrl-S": function(){
                    me.up("scriptBrowser").fireEvent('saveAll',null);
                }
            });
        }
    },

    destroy: function() {
        this.getEl().dom.removeChild(this.getEl().dom.firstChild);
        this.callParent(arguments);
    },

    initComponent: function() {
        var me = this;


        me.callParent(arguments);
        me.on("beforeclose",function(panel){
            if (me.dirty == true){
                Ext.Msg.show({
                    title:'Save Changes?',
                    msg: 'You are closing a tab that has unsaved changes. Would you like to save your changes?',
                    buttons: Ext.Msg.YESNOCANCEL,
                    icon: Ext.Msg.QUESTION,
                    fn: function(id){
                        if (id == "no"){
                            me.destroy();
                        }
                        if (id == "yes"){
                            //me.fireEvent('saveAll');
                            me.up('scriptBrowser').fireEvent('saveAll');
                            me.destroy();
                        }
                    }
                });
                return false;
            }
        });
        me.setAutoScroll(false);
    },

    clearDirty: function(){
        this.dirty = false;
        if (this.title.indexOf("*") != -1){
            this.setTitle(this.title.slice(0, -1));
        }
        //this.setTitle(this.title);
    },

    focus: function() {
        this.editor.edit.focus();
    },

    focusArea: function(){
        this.editor.edit.focus();
        var lineCount = this.editor.edit.lineCount();
        if (lineCount >= 2){
            this.editor.edit.setCursor({line:2,ch:0});
        }
        else{
            this.editor.edit.setCursor({line:1,ch:0});
        }
    },

    getValue: function() {
        return this.editor.edit.getValue();
    },

    setValue: function(value) {
        //this.fireSyncEvent = false;
        this.editor.edit.setValue(value);
        //this.fireSyncEvent = true;
    },

    setCurrentVersion: function(value) {
        this.fireSyncEvent = false;
        this.editor.edit.setValue(value);
        this.editor.edit.clearHistory();
        this.fireSyncEvent = true;
    },
    sePrevVersion: function(value) {
        this.editor.left.orig.setValue(value)
    }
});