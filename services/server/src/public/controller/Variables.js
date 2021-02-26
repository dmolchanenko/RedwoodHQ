Ext.define("Redwood.controller.Variables", {
    extend: 'Ext.app.Controller',

    models: ['Variables','VariableTags'],
    stores: ['Variables','VariableTags'],
    views:  ['Variables'],

    init: function () {
        this.control({
            'variablesEditor': {
                render: this.onEditorRender,
                edit: this.afterVariableEdit,
                varEdit: this.onVarEdit,
                varDelete: this.onVarDelete
            },
            'variablesEditor button': {
                click: this.addVariable
            }

        });
    },

    onVarEdit: function(evtData){
        var store = this.getStore('Variables');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            this.rowEditor.startEdit(record, this.variablesEditor.columns[evtData.colIndex]);
        }
    },

    onVarDelete: function(evtData){
        var store = this.getStore('Variables');

        if (this.rowEditor.editing){
            return;
        }
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: "Are you sure you want to delete '"+ record.get("name") + "' variable?" ,
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.QUESTION,
                fn: function(id){
                    if (id === "yes"){
                        store.remove(record);
                        store.sync();
                    }
                }
            })
        }

    },

    afterVariableEdit: function(evtData,row){
        if(row){
            row.record.dirty = true;
        }
        var varStore = this.getStore('Variables');
        this.getStore('VariableTags').sync();
        //varStore.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Variables').load();} });
        varStore.sync();
    },

    addVariable: function () {
        if(this.rowEditor.editing)
            return false;

        var newVar,
            varStore = this.getStore('Variables');

        // add blank item to store -- will automatically add new row to grid
        newVar = varStore.add({
            name: 'newVariable',
            tag: '',
            value: '<NULL>',
            possibleValues:[]
        })[0];

        this.rowEditor.startEdit(newVar, this.grid.columns[2]);
    },

    onEditorRender: function () {
        this.variablesEditor = Ext.ComponentQuery.query('variablesEditor')[0];
        this.rowEditor = this.variablesEditor.rowEditor;
        this.tagEditor = this.variablesEditor.tagEditor;
        this.grid = this.variablesEditor;
    }
});