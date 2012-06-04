Ext.define('Redwood.ux.CodeEditorField', {
    extend: 'Ext.form.field.TextArea',
    alias: 'widget.codeeditorfield',
    cls: 'codemirror-field',
    fieldLabel: 'Label',
    hideLabel: true,

    initComponent: function() {
        var me = this;

        Ext.applyIf(me, {
            listeners: {
                render: {
                    fn: me.onCodeeditorfieldRender,
                    scope: me
                }
            }
        });

        me.callParent(arguments);
    },

    onCodeeditorfieldRender: function(abstractcomponent, options) {
        var me = this;
        var element = document.getElementById(abstractcomponent.getInputId());

        this.editor = CodeMirror.fromTextArea(element, {
            lineNumbers: true,
            matchBrackets: true,
            mode: "text/x-groovy",
            onCursorActivity: function() {
                editor.setLineClass(hlLine, null, null);
                hlLine = editor.setLineClass(editor.getCursor().line, null, "activeline");
            },
            onChange: function(cm,changeOpt){
                me.onChange(cm,changeOpt);
                //me.fireEvent('change',cm);
            }
        });
        var editor = this.editor;
        //editor.setOption("theme", "redwood");
        var hlLine = this.editor.setLineClass(0, "activeline");
    },

    focus: function() {
        this.editor.focus();
    },

    onFocus: function() {
        this.fireEvent('focus', this);
    },

    destroy: function() {
        this.editor.toTextArea();
        this.callParent(arguments);
    },

    getValue: function() {
        this.editor.save();
        return this.callParent(arguments);
    },

    setValue: function(value) {
        if (this.editor) {
            this.editor.setValue(value);
        }

        return this.callParent(arguments);
    }

});

Ext.define('Redwood.ux.EditorPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.codeeditorpanel',

    layout: {
        type: 'fit'
    },
    preventHeader: true,

    title:"",
    listeners: {
        beforeclose: function(panel,eOpt){
            if (this.dirty == true){
                var me = this;
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
                            me.fireEvent('saveAll');
                            me.destroy();
                        }
                    }
                });
                return false;
            }
        }
    },
    initComponent: function() {
        var me = this;

        Ext.applyIf(me, {
            items: [
                {
                    xtype: 'codeeditorfield',
                    margin: '0 0 -100 0',
                    onChange: function(cm,changeOpt){
                        if (me.dirty == false){
                            me.setTitle(me.title + "*");
                            me.dirty = true;
                        }
                    }

                }
            ]
        });

        me.callParent(arguments);
    },

    clearDirty: function(){
        this.dirty = false;
        if (this.title.indexOf("*") != -1){
            this.setTitle(this.title.slice(0, -1));
        }
        //this.setTitle(this.title);
    },

    focus: function() {
        this.down('codeeditorfield').focus();
    },

    getValue: function() {
        return this.down('codeeditorfield').getValue();
    },

    setValue: function(value) {
        this.down('codeeditorfield').setValue(value);
    },

    reset: function() {
        this.down('codeeditorfield').setValue('');
    }

});
