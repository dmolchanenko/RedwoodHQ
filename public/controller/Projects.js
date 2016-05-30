Ext.define("Redwood.controller.Projects", {
    extend: 'Ext.app.Controller',

    models: ['Projects'],
    stores: ['Projects'],
    views:  ['Projects','ProjectEdit'],

    init: function () {
        this.control({
            'projectsEditor': {
                render: this.onEditorRender,
                projectEdit: this.onProjectEdit,
                projectDelete: this.onProjectDelete,
                projectClone: this.onProjectClone
            },
            'projectsEditor button': {
                click: this.addProject
            }

        });
    },

    onProjectClone: function(evtData) {
        Ext.Msg.show({
            title:'Cloning Confirmation',
            msg: 'Warning: Cloning a project is a very CPU intensive operation.<br>Depending on the number of users it might take anywhere from <b>20 mins to 2 hours</b> to complete.<br>Are you sure you want to continue?',
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.QUESTION,
            fn: function(id){
                if (id == "yes"){
                    var store = Ext.data.StoreManager.lookup('Projects');
                    var record = store.getAt(evtData.rowIndex);
                    var projectEditWindow = new Redwood.view.ProjectEdit({newProject:false,cloneProject:true,dataRecord:record});
                    projectEditWindow.show();
                }
            }
        });

    },

    onProjectEdit: function(evtData) {
        var store = Ext.data.StoreManager.lookup('Projects');
        var record = store.getAt(evtData.rowIndex);
        var projectEditWindow = new Redwood.view.ProjectEdit({newProject:false,dataRecord:record});
        projectEditWindow.show();
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