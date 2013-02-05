Ext.define("Redwood.controller.TestSets", {
    extend: 'Ext.app.Controller',

    models: ['TestSets'],
    stores: ['TestSets'],
    views:  ['TestSets','TestSetEdit'],

    init: function () {
        this.control({
            'testsetsEditor': {
                render: this.onEditorRender,
                edit: this.afterTestSetEdit,
                testsetEdit: this.onTestSetEdit,
                testsetDelete: this.onTestSetDelete,
                celldblclick: this.onDoubleClick
            },
            'testsetsEditor button': {
                click: this.addTestSet
            }

        });
    },

    onDoubleClick: function(me,td,cell,record,tr){
        if(record) {
            var testsetEditWindow = new Redwood.view.TestSetEdit({newTestSet:false,testSetData:record});
            testsetEditWindow.show();
        }
    },
    onTestSetEdit: function(evtData){
        var store = this.getStore('TestSets');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            var testsetEditWindow = new Redwood.view.TestSetEdit({newTestSet:false,testSetData:record});
            testsetEditWindow.show();
        }
    },

    onTestSetDelete: function(evtData){
        var store = this.getStore('TestSets');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            store.remove(record);
            store.sync({success:function(batch,options){Ext.data.StoreManager.lookup('TestSets').load();} });
        }

    },

    afterTestSetEdit: function(evtData){
        var store = this.getStore('TestSets');
        this.getStore('TestSetTags').sync();
        store.sync({success:function(batch,options){Ext.data.StoreManager.lookup('TestSets').load();} });

    },

    addTestSet: function () {
        var testsetEditWindow = new Redwood.view.TestSetEdit({newTestSet:true});
        testsetEditWindow.show();
    },

    onEditorRender: function () {
        this.testsetsEditor = Ext.ComponentQuery.query('testsetsEditor')[0];
        this.rowEditor = this.testsetsEditor.rowEditor;
        this.tagEditor = this.testsetsEditor.tagEditor;
        this.grid = this.testsetsEditor;
    }
});