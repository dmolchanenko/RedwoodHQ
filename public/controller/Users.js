Ext.define("Redwood.controller.Users", {
    extend: 'Ext.app.Controller',

    models: ['Users','UserTags'],
    stores: ['Users','UserTags'],
    views:  ['Users','UserEdit'],

    init: function () {
        this.control({
            'usersEditor': {
                render: this.onEditorRender,
                edit: this.afterUserEdit,
                userEdit: this.onUserEdit,
                userDelete: this.onUserDelete,
                celldblclick: this.onDoubleClick
            },
            'usersEditor button': {
                click: this.addUser
            }

        });
    },

    onDoubleClick: function(me,td,cell,record,tr){
        if(record) {
            var userEditWindow = new Redwood.view.UserEdit({newUser:false});
            userEditWindow.show();
            userEditWindow.items.getAt(0).loadRecord(record);
            userEditWindow.items.getAt(0);
            if (record.get("username") == "admin"){
                userEditWindow.down('form').getForm().findField("role").disable();
            }
        }
    },
    onUserEdit: function(evtData){
        var store = this.getStore('Users');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            var userEditWindow = new Redwood.view.UserEdit({newUser:false});
            userEditWindow.show();
            userEditWindow.items.getAt(0).loadRecord(record);
            if (record.get("username") == "admin"){
                userEditWindow.down('form').getForm().findField("role").disable();
            }
        }
    },

    onUserDelete: function(evtData){
        var store = this.getStore('Users');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            if (record.get("username") == "admin"){
                return;
            }
            store.remove(record);
            store.sync({success:function(batch,options){} });
        }

    },

    afterUserEdit: function(evtData,row){
        var varStore = this.getStore('Users');
        this.getStore('UserTags').sync();
        varStore.sync({success:function(batch,options){} });
    },

    addUser: function () {
        var userEditWindow = new Redwood.view.UserEdit({newUser:true});
        userEditWindow.show();
    },

    onEditorRender: function () {
        this.usersEditor = Ext.ComponentQuery.query('usersEditor')[0];
        this.rowEditor = this.usersEditor.rowEditor;
        this.tagEditor = this.usersEditor.tagEditor;
        this.grid = this.usersEditor;
    }
});