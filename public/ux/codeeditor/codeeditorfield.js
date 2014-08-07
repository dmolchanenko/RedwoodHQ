Ext.define('Redwood.ux.CodeEditorField', {
    extend: 'Ext.form.field.TextArea',
    alias: 'widget.codeeditorfield',
    cls: 'codemirror-field',
    fieldLabel: 'Label',
    hideLabel: true,
    anchor:     '100%',
    allowBlank: true,
    editorType: "text/x-groovy",

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
            indentUnit: 4,
            tabSize: 4,
            anchor:     '100% -20',
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
            mode: me.editorType,//"text/x-groovy",
            onResize: function(){
                var showing = document.body.getElementsByClassName("CodeMirror-fullscreen")[0];
                if (!showing) return;
                showing.CodeMirror.getWrapperElement().style.height = me.winHeight() + "px";
            }
        });
        this.editor.on("change",function(cm,changeOpt){
            if(me.up("codeeditorpanel").inCollab === true){
                //console.log(changeOpt);
                if(changeOpt.origin != undefined){
                    if(changeOpt.origin === "redo" || changeOpt.origin === "undo" || changeOpt.origin === "paste" || changeOpt.origin.indexOf("+") === 0){
                        Redwood.app.getController("Collaboration").sendChange(changeOpt);
                    }
                }
            }
            me.onChange(cm,changeOpt);
        });
        this.editor.on("beforeSelectionChange",function(cm,changeOpt){
            if(me.up("codeeditorpanel").inCollab === true){
                Redwood.app.getController("Collaboration").sendSelectionChange(changeOpt);
            }
        });

        this.editor.on("cursorActivity",function(cm){
            if(me.up("codeeditorpanel").inCollab === true){
                Redwood.app.getController("Collaboration").sendCursorChange(cm.getCursor());
            }
        });
        this.editor.on("beforeChange",function(cm,changeOpt){
            //console.log(changeOpt);
            if(me.up("codeeditorpanel").inCollab === true && me.up("codeeditorpanel").collabClient === true){
                if(changeOpt.origin != undefined){
                    if(changeOpt.origin === "redo" || changeOpt.origin === "undo" || changeOpt.origin === "paste" || changeOpt.origin.indexOf("+") === 0){
                        changeOpt.cancel();
                        delete changeOpt.cancel;
                        changeOpt.returnBack = true;
                        Redwood.app.getController("Collaboration").sendChange(changeOpt);
                    }
                }
            }
            me.onChange(cm,changeOpt);
        });
    },

    focusArea: function(){
        var lineCount = this.editor.lineCount();
        if (lineCount >= 2){
            this.editor.setCursor({line:2,ch:0});
        }
        else{
            this.editor.setCursor({line:1,ch:0});
        }
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

    clearHistory: function() {
        this.editor.clearHistory();
    },

    setValue: function(value) {
        if (this.editor) {
            this.editor.setValue(value);
            return
            this.editor.setValue("click(action)");

            var cacheImage = document.createElement('img');
            cacheImage.src = "images/action.png";
            cacheImage.width = 16;
            cacheImage.height = 16;
            console.log(cacheImage);
            //this.editor.addWidget({line:0,ch:0},cacheImage);
            var marker = this.editor.markText({line:0,ch:6},{line:0,ch:12},{replacedWith:cacheImage});
            marker.changed();
            //window.setTimeout(function(){console.log("ssss");marker.changed()},4000);
            //marker.clear();
        }

        return this.callParent(arguments);
    },

    refresh: function(){
        this.editor.refresh();
    }

});

Ext.define('Redwood.ux.EditorPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.codeeditorpanel',
    layout:     'fit',
    preventHeader: true,
    plain:      true,
    editorType: "text/x-groovy",
    //autoScroll:false,

    title:"",

    initComponent: function() {
        var me = this;

        Ext.applyIf(me, {
            items: [

                {
                    xtype: 'codeeditorfield',
                    editorType:me.editorType,
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

    focusArea: function(){
        this.down('codeeditorfield').focusArea();
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

    refresh: function(){
        this.down('codeeditorfield').refresh();
    },

    setCursor: function(pos){
        this.down('codeeditorfield').editor.setCursor(pos);
    },

    clearHistory: function(pos){
        this.down('codeeditorfield').editor.clearHistory(pos);
    }



});