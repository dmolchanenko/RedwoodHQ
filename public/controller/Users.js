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
                varEdit: this.onUserEdit,
                varDelete: this.onUserDelete
            },
            'usersEditor button': {
                click: this.addUser
            }

        });
    },

    onUserEdit: function(evtData){
        var store = this.getStore('Users');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            this.rowEditor.startEdit(record, this.usersEditor.columns[evtData.colIndex]);
        }
    },

    onUserDelete: function(evtData){
        var store = this.getStore('Users');

        if (this.rowEditor.editing){
            return;
        }
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            store.remove(record);
            store.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Users').load();} });
        }

    },

    afterUserEdit: function(evtData){
        var varStore = this.getStore('Users');
        this.getStore('UserTags').sync();
        varStore.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Users').load();} });
    },

    addUser: function () {


    },

    onEditorRender: function () {
        this.userEdit = Ext.ComponentQuery.query('userEdit')[0];
        this.usersEditor = Ext.ComponentQuery.query('usersEditor')[0];
        this.rowEditor = this.usersEditor.rowEditor;
        this.tagEditor = this.usersEditor.tagEditor;
        this.grid = this.usersEditor;
    }
});