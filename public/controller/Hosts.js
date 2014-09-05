Ext.define("Redwood.controller.Hosts", {
    extend: 'Ext.app.Controller',

    models: ['Hosts'],
    stores: ['Hosts'],
    views:  ['CloudView'],

    init: function () {
        this.control({
            'hostsView': {
                render: this.onEditorRender,
                addHost: this.add,
                edit: this.afterEdit,
                hostEdit: this.onEdit,
                hostDelete: this.onDelete
            }
        });
    },

    onEdit: function(evtData){
        var store = this.getStore('Hosts');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            this.rowEditor.startEdit(record, this.hostsEditor.columns[evtData.colIndex]);
        }
    },

    onDelete: function(evtData){
        var store = this.getStore('Hosts');

        if (this.rowEditor.editing){
            return;
        }
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: "Are you sure you want to delete '"+ record.get("host") + "' host?" ,
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
        var varStore = this.getStore('Hosts');
        varStore.sync({success:function(batch,options){
            Ext.socket.emit('AddHosts', batch.operations[0].records[0].data);
        } });

    },

    add: function () {
        if(this.rowEditor.editing)
            return false;

        var blank,
            store = this.getStore('Hosts');

        // add blank item to store -- will automatically add new row to grid
        blank = store.add({
            host: 'newHost',
            description:'',
            maxVMs:1
        })[0];

        this.rowEditor.startEdit(blank, this.hostsEditor.columns[0]);

    },

    onEditorRender: function () {
        this.hostsEditor = Ext.ComponentQuery.query('hostsView')[0];
        this.rowEditor = this.hostsEditor.rowEditor;
    }
});