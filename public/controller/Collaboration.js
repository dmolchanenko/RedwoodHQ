Ext.define("Redwood.controller.Collaboration", {
    extend: 'Ext.app.Controller',

    views:  ['CollabWindow'],

    collabWindow: null,
    connectedWithUser: null,
    openedTab: null,
    editor: null,
    username: Ext.util.Cookies.get('username'),
    cursorElem: null,
    cursorMarker: null,

    init: function () {
        this.control({
            'collabWindow': {
                shareScript: this.onShareScript
            }
        });
        this.cursorElem = document.createElement('canvas');
        this.cursorElem.width = 1;
        this.cursorElem.height = 10;
        this.cursorElem.style.borderLeft  = "2px solid #000000";
        this.cursorElem.style.borderColor = "orange";

    },
    onShareScript:  function(tab){
        this.collabWindow = new Redwood.view.CollabWindow();
        this.openedTab = tab;
        this.collabWindow.show();
    },
    onSendShareRequest:  function(record,window,tab){
        Ext.socket.emit('CollaborateScript',{toUserName:record.get('username'),operation:"requestPermission",username:Ext.util.Cookies.get('username'),name:Ext.data.StoreManager.lookup('Users').findRecord("username",Ext.util.Cookies.get('username')).get("name")});
    },

    requestCollab:  function(username,name){
        var me = this;
        Ext.Msg.show({
            title:'Collaboration Confirmation',
            msg: "User "+name+" wants to collaborate on a script.  Do you accept?",
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.QUESTION,
            fn: function(id){
                if (id == "yes"){
                    me.connectedWithUser = username;
                    Ext.socket.emit('CollaborateScript',{operation:"requestApproved",username:Ext.util.Cookies.get('username'),toUserName:username});
                }
                else{
                    Ext.socket.emit('CollaborateScript',{operation:"requestDenied",username:Ext.util.Cookies.get('username'),toUserName:username});
                }
            }
        });
    },
    requestDenied: function(){
        if (Ext.MessageBox.isVisible()){
            Ext.MessageBox.hide();
            Ext.Msg.show({
                title:'Error',
                msg: "Collaboration was request denied.",
                buttons: Ext.Msg.OK
            });
        }
    },
    requestApproved:  function(username){
        this.connectedWithUser = username;
        if (Ext.MessageBox.isVisible()){
            Ext.MessageBox.hide();
            this.collabWindow.close();
        }
        this.openedTab.inCollab = true;
        Ext.socket.emit('CollaborateScript',{editorType:this.openedTab.editorType,scriptName:this.openedTab.title,text:this.openedTab.getValue(),operation:"startSession",username:this.username,toUserName:username});
        this.editor = this.openedTab.down("codeeditorfield").editor;
    },
    startSession:  function(username,text,scriptName,editorType){
        this.connectedWithUser = username;
        var tab = Redwood.app.getController("Scripts").tabPanel.add({
            inCollab:true,
            readOnly:true,
            inConflict:false,
            editorType:editorType,
            title:scriptName+" [Collaboration Mode]",
            closable:true,
            collabClient:true,
            xtype:"codeeditorpanel",
            itemId:"ScriptCollab"
        });
        Redwood.app.getController("Scripts").tabPanel.setActiveTab(tab);
        tab.setValue(text);
        this.openedTab = tab;
        this.editor = this.openedTab.down("codeeditorfield").editor;
    },

    sendChange: function(change){
        Ext.socket.emit('CollaborateScript',{toUserName:this.connectedWithUser,change:change,operation:"change",username:this.username});
    },

    sendSelectionChange: function(change){
        Ext.socket.emit('CollaborateScript',{toUserName:this.connectedWithUser,change:change,operation:"selectionChange",username:this.username});
    },

    performSelectionChange: function(change){
        this.editor.getAllMarks().forEach(function(marker){
            if(marker.type !== "bookmark") {
                marker.clear();
            }
        });
        this.editor.markText(change.anchor, change.head, {className: "cm-collab-selection",
            inclusiveLeft: true,
            atomic: false})
    },

    sendCursorChange: function(change){
        Ext.socket.emit('CollaborateScript',{toUserName:this.connectedWithUser,change:change,operation:"cursorChange",username:this.username});
    },

    performCursorChange: function(change){
        var me = this;
        if(me.cursorMarker){
            me.cursorMarker.clear();
        }
        me.cursorMarker = this.editor.setBookmark(change,{widget:this.cursorElem,insertLeft:true});
        return;
        this.editor.getAllMarks().forEach(function(marker){
            if(marker === me.cursorMarker) marker.clear();
        });
        //this.editor.addWidget({line:0,ch:0},cacheImage);
        this.cursorMarker= this.editor.markText(change,change,{replacedWith:this.cursorElem});
        this.cursorMarker.changed();
    },

    performChange: function(change){
        var me = this;
        var changeFunc = function(change){

            var toChange = "";
            for(var i=0;i<change.text.length;i++){
                //console.log("adding text:"+add);
                if(i == 0){
                    toChange = change.text[i];
                }
                else{
                    toChange = toChange+"\n"+change.text[i];
                }
            }
            me.editor.replaceRange(toChange,change.from);
            me.editor.replaceRange("",change.from,change.to);

            if(change.next){
                changeFunc(change.next);
            }
        };
        changeFunc(change);
    }
});