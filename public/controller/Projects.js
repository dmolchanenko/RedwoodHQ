Ext.define("Redwood.controller.Projects", {
    extend: 'Ext.app.Controller',

    models: ['Projects'],
    stores: ['Projects'],
    views:  ['Projects','ProjectEdit'],

    init: function () {
        this.control({
            'projectsEditor': {
                render: this.onEditorRender,
                edit: this.afterUserEdit,
                projectDelete: this.onProjectDelete
            },
            'projectsEditor button': {
                click: this.addProject
            }

        });
    },

    onProjectDelete: function(evtData){
        var store = Ext.data.StoreManager.lookup('Projects');
        var record = store.getAt(evtData.rowIndex);
        Ext.Msg.show({
            title:'Delete Confirmation',
            msg: 'Are you sure you want to delete <b>'+record.get("name")+'</b> project?<br>Please note that you CAN NOT undo this operation.',
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.QUESTION,
            fn: function(id){
                if (id == "yes"){
                    if(record) {
                        store.remove(record);
                        store.sync({success:function(batch,options){} });
                    }
                }
            }
        });



    },

    addProject: function () {
        var projectEditWindow = new Redwood.view.ProjectEdit({newProject:true});
        projectEditWindow.show();
    },

    onEditorRender: function () {
        this.projectsEditor = Ext.ComponentQuery.query('projectsEditor')[0];
    }
});