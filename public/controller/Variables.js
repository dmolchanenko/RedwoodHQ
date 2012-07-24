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
                //beforeedit: this.BeforeEdit
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
            store.remove(record);
            store.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Variables').load();} });
        }

    },

    afterVariableEdit: function(evtData){
        var varStore = this.getStore('Variables');
        this.getStore('VariableTags').sync();
        varStore.sync({success:function(batch,options){Ext.data.StoreManager.lookup('Variables').load();} });
        //varTagsStore.sync();
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
            value: '',
            possibleValues:[]
        })[0];

        this.rowEditor.startEdit(newVar, this.grid.columns[2]);
        this.variablesEditor.getDockedComponent('top').getComponent('add').setDisabled(true);

        /*
        var sm = this.grid.getSelectionModel();

        // after user clicks off from editing, sync the store, remove the record from the top and reload the store to see new changes
        this.grid.on('edit', function() {
            var record = sm.getSelection();
            store.sync();
            store.remove(record);
            store.load();
        });
        */
    },

    onEditorRender: function () {
        //console.log("Variables editor was rendered");
        //this.getStore('VariableTags').load(function(records, operation, success) {
        //    console.log('loaded records');
        //});
        //this.variablesEditor.varTagsStore = this.getStore('VariableTags').sync();
        this.variablesEditor = Ext.ComponentQuery.query('variablesEditor')[0];
        this.rowEditor = this.variablesEditor.rowEditor;
        this.tagEditor = this.variablesEditor.tagEditor;
        this.grid = this.variablesEditor;
    }
});