Ext.define("Redwood.controller.Templates", {
    extend: 'Ext.app.Controller',

    models: ['Templates'],
    stores: ['Templates'],
    views:  [],

    init: function () {
        this.control({
            'templatesView': {
                render: this.onEditorRender,
                addTemplate: this.add,
                edit: this.afterEdit,
                templateEdit: this.onEdit,
                templateDelete: this.onDelete
            }
        });
    },

    onEdit: function(evtData){
        var store = this.getStore('Templates');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            this.rowEditor.startEdit(record, this.hostsEditor.columns[evtData.colIndex]);
        }
    },

    onDelete: function(evtData){
        var store = this.getStore('Templates');

        if (this.rowEditor.editing){
            return;
        }
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: "Are you sure you want to delete '"+ record.get("name") + "' template?" ,
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.QUESTION,
                fn: function(id){
                    if (id === "yes"){
                        store.remove(record);
                        store.sync({success:function(batch,options){} });
                    }
                }
            });
        }

    },

    afterEdit: function(evtData,row){
        row.record.dirty = true;
        var varStore = this.getStore('Templates');
        varStore.sync({success:function(batch,options){
            Ext.socket.emit('AddTemplates', batch.operations[0].records[0].data);
        } });

    },

    add: function () {
        if(this.rowEditor.editing)
            return false;

        var blank,
            store = this.getStore('Templates');

        // add blank item to store -- will automatically add new row to grid
        blank = store.add({
            host: 'newTemplate',
            description:'',
            maxVMs:1
        })[0];

        this.rowEditor.startEdit(blank, this.hostsEditor.columns[0]);

    },

    onEditorRender: function () {
        this.hostsEditor = Ext.ComponentQuery.query('templatesView')[0];
        this.rowEditor = this.hostsEditor.rowEditor;
    }
});