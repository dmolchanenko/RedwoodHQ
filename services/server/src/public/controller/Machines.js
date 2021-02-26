function vncToMachine(host,port){
    window.open ("novnc/vnc.html?host="+host+"&port="+port+"&password=admin&connectTimeout=20");
    if(Ext.isChrome){
        return false;
    }
}

Ext.define("Redwood.controller.Machines", {
    extend: 'Ext.app.Controller',

    models: ['Machines','MachineRoles','MachineTags'],
    stores: ['Machines','MachineRoles','MachineTags'],
    views:  ['Machines','MachineVars'],

    init: function () {
        this.control({
            'machinesEditor': {
                render: this.onEditorRender,
                edit: this.afterEdit,
                machineEdit: this.onEdit,
                machineDelete: this.onDelete,
                editVariables: this.onEditVariables
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

    onEditVariables: function(evtData){
        var store = this.getStore('Machines');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            var win = Ext.create('Redwood.view.MachineVars',{
                dataRecord: record.get("machineVars"),
                onMachineVarsSave:function(vars){
                    record.set("machineVars",vars);
                    record.dirty = true;
                    store.sync();
                }
            });
            win.show();
        }
    },

    onDelete: function(evtData){
        var store = this.getStore('Machines');

        if (this.rowEditor.editing){
            return;
        }
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: "Are you sure you want to delete '"+ record.get("host") + "' machine?" ,
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
        var varStore = this.getStore('Machines');
        this.getStore('MachineRoles').sync();
        this.getStore('MachineTags').sync();
        varStore.sync({success:function(batch,options){
            Ext.socket.emit('AddMachines', batch.operations[0].records[0].data);
        } });

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
            port: '5009',
            vncport: '3006',
            description:'',
            roles: ['Default'],
            machineVars: [],
            maxThreads:1
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