Ext.define('Ext.ux.Chat', {
    extend : 'Ext.form.Panel',
    alias: 'widget.chat',

    items: [
        {
            xtype: "textarea",
            readOnly: true,
            grow: true,
            itemId:"output",
            //height: 300,
            border: false,
            anchor: '100% -22',
            margin:"0 0 0 0",
            fieldStyle:"border:none 0px black"
        },
        {
            xtype: "textfield",
            itemId: "commands",
            anchor: '100%',
            bodyPadding: 0,
            border: false,
            fieldLabel: ">",
            labelSeparator:"",
            labelPad:0,
            margin:"0 0 0 0",
            labelAlign: "left",
            labelWidth: "10",
            labelStyle: 'white-space: nowrap;',
            fieldStyle:"border:none 0px black;background-image:none",
            commandHistory: [],
            commandIndex:0,
            listeners:{
                specialkey: function(field, e){
                    if (e.getKey() == e.ENTER) {
                        Ext.socket.emit('terminal', {command:field.getValue()});
                        if (field.getValue() != ""){
                            if ((field.commandHistory.length > 0) &&(field.commandHistory[field.commandHistory.length-1] == field.getValue())){

                            }
                            else{
                                field.commandHistory.push(field.getValue());
                            }
                        }
                        field.setValue("");
                        field.commandIndex = field.commandHistory.length-1;
                    }
                    else if(e.getKey() == e.UP){
                        if (field.commandHistory.length > 0){
                            field.setValue(field.commandHistory[field.commandIndex]);
                            if (field.commandIndex > 0){
                                field.commandIndex--;
                            }
                        }
                    }
                    else if(e.getKey() == e.DOWN){
                        if (field.commandHistory.length > 0){
                            field.setValue(field.commandHistory[field.commandIndex]);
                            if (field.commandIndex < field.commandHistory.length-1){
                                field.commandIndex++;
                            }
                        }
                    }
                }
            }
        }
    ]



});

Ext.define('Redwood.ux.ChatWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.chatwindow',
    defaultFocus: "commands",
    modal: true,
    height: 400,
    width: 500,
    layout: 'fit',
    title: "Chat",
    toUser:null,
    toUserName:null,


    listeners:{
        afterrender: function(me){
            this.socketListen = function (msg) {
                var output = me.down("#output");
                var domElem = output.inputEl;

                domElem.dom.value = domElem.dom.value.substring(domElem.dom.value.length-10000,domElem.dom.value.length) + msg;
                domElem.dom.scrollTop =domElem.dom.scrollHeight;
            };
            Ext.socket.on('terminal',this.socketListen);
            Ext.socket.emit('terminal', "newTerminalSession");
        },
        close: function(){
            Ext.socket.removeListener("terminal",this.socketListen);
            Ext.socket.emit('terminal', "close");
        }
    },

    items: {
        xtype:"chat"
        //layout:"fit",
        //height: 350
        //defaults: {
        //    anchor: '100%'
        //},
        //bodyPadding: 5

    }

});