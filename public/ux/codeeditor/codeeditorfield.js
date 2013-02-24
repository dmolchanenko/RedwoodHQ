Ext.define('Redwood.ux.CodeEditorField', {
    extend: 'Ext.form.field.TextArea',
    alias: 'widget.codeeditorfield',
    cls: 'codemirror-field',
    fieldLabel: 'Label',
    hideLabel: true,

    isFullScreen: function(){
        return /\bCodeMirror-fullscreen\b/.test(this.editor.getWrapperElement().className);
    },

    winHeight: function(){
        return window.innerHeight || (document.documentElement || document.body).clientHeight;
    },

    setFullScreen: function(full){
        this.editor.getWrapperElement().height = this.winHeight() + "px";
        var wrap = this.up("codeeditorpanel").getEl().dom;
        if (full) {
            wrap.className += " CodeMirror-fullscreen";
            wrap.style.height = "100%";
            //wrap.style.height = this.winHeight() + "px";
            wrap.style.width = "100%";
            wrap.style.top = "0";
            wrap.style.left = "0";
            wrap.style.position = "fixed";
            wrap.style.display = "block";
            wrap.style.zIndex = "9999";

            document.documentElement.style.overflow = "hidden";
        } else {
            wrap.className = wrap.className.replace(" CodeMirror-fullscreen", "");
            wrap.style.height = "";
            document.documentElement.style.overflow = "";
        }
        this.editor.refresh();
    },

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
            styleActiveLine: true,
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys:
                {"Ctrl-S": function(){
                    me.up("scriptBrowser").fireEvent('saveAll',null);
                }
                    /*,
                "F11": function() {
                    me.setFullScreen(!me.isFullScreen());
                },
                "Esc": function() {
                    if (me.isFullScreen()) me.setFullScreen(false);
                }
                */
            },
            mode: "text/x-groovy",
            onCursorActivity: function() {
                //editor.setLineClass(hlLine, null, null);
                //hlLine = editor.setLineClass(editor.getCursor().line, null, "activeline");
            },
            onChange: function(cm,changeOpt){
                me.onChange(cm,changeOpt);
                //me.fireEvent('change',cm);
            },
            onResize: function(){
                var showing = document.body.getElementsByClassName("CodeMirror-fullscreen")[0];
                if (!showing) return;
                showing.CodeMirror.getWrapperElement().style.height = me.winHeight() + "px";
            }
        });
        var editor = this.editor;
        //var hlLine = this.editor.setLineClass(0, "activeline");
        //var hlLine = this.editor.addLineClass(0,"text", "CodeMirror-activeline");
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
    autoScroll:false,

    title:"",

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
        me.on("beforeclose",function(panel){
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
    },

    setCursor: function(pos){
        this.down('codeeditorfield').editor.setCursor(pos);
    }

});