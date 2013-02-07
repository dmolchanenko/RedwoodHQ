function vncToMachine(host){
    window.open ("novnc/vnc.html?host="+host+"&port=3004&password=admin&timeout=20","VNC to "+host);
    return false;
}

Ext.define("Redwood.controller.Machines", {
    extend: 'Ext.app.Controller',

    models: ['Machines','MachineRoles','MachineTags'],
    stores: ['Machines','MachineRoles','MachineTags'],
    views:  ['Machines'],

    init: function () {
        this.control({
            'machinesEditor': {
                render: this.onEditorRender,
                edit: this.afterEdit,
                machineEdit: this.onEdit,
                machineDelete: this.onDelete
            },
            'machinesEditor button': {
                click: this.add
            }
        });
    },

    onEdit: function(evtData){
        var store = this.getStore('Machines');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            this.rowEditor.startEdit(record, this.machinesEditor.columns[evtData.colIndex]);
        }
    },

    onDelete: function(evtData){
        var store = this.getStore('Machines');

        if (this.rowEditor.editing){
            return;
        }
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            store.remove(record);
            store.sync({success:function(batch,options){Ext.data.StoreManager.lookup('MachineRoles').load();} });
        }

    },

    afterEdit: function(evtData){
        var varStore = this.getStore('Machines');
        this.getStore('MachineRoles').sync();
        this.getStore('MachineTags').sync();
        varStore.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Machines').load();} });

    },

    add: function () {
        if(this.rowEditor.editing)
            return false;

        var blank,
            store = this.getStore('Machines');

        // add blank item to store -- will automatically add new row to grid
        blank = store.add({
            tags: [],
            host: 'newHost',
            description:'',
            roles: ['Default']
            //vmName: ''
        })[0];

        this.rowEditor.startEdit(blank, this.grid.columns[2]);
        //this.machinesEditor.getDockedComponent('top').getComponent('add').setDisabled(true);

    },

    onEditorRender: function () {
        this.machinesEditor = Ext.ComponentQuery.query('machinesEditor')[0];
        this.rowEditor = this.machinesEditor.rowEditor;
        this.tagEditor = this.machinesEditor.tagEditor;
        this.grid = this.machinesEditor;
    }
});