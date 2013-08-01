Ext.define('Redwood.ux.MergePanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.mergepanel',
    layout:     'fit',
    preventHeader: true,
    plain:      true,
    dirty: false,
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
        var target = this.getEl().dom;
        target.innerHTML = "";
        //var value = "value\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\nvalue\r\nasdfasdfasdf\r\nsdfsdf\r\n";
        var value = "";
        this.editor = CodeMirror.MergeView(target, {
            value: value,
            origLeft: value,
            orig:value,
            lineNumbers: true,
            mode: me.editorType
        });
        this.editor.edit.setSize("100%");
        this.editor.left.orig.setSize("100%");
        this.editor.right.orig.setSize("100%");
        this.editor.edit.on("change",function(cm,changeOpt){
            me.markDirty();
        });
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

    getValue: function() {
        return this.editor.edit.getValue();
    },

    setMine: function(value) {
        this.editor.left.orig.setValue(value);
        this.editor.edit.setValue(value);
    },
    setTheirs: function(value) {
        this.editor.right.orig.setValue(value);
    },

    reset: function() {
        this.down('mergefield').setValue('');
    },

    setCursor: function(pos){
        this.down('mergefield').editor.setCursor(pos);
    }



});