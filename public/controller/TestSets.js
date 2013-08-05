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
                celldblclick: this.onDoubleClick,
                newTestSet: this.addTestSet,
                save: this.saveTestSet,
                tcSelChange: this.onTCSelChange,
                addDir: this.onDirAdd,
                dirChecked: this.onDirChecked
            }

        });
    },

    saveTestSet: function(){
        var foundTab = this.tabPanel.getActiveTab();
        if ((foundTab === null) ||(foundTab.viewType !== "TestSet")){
            return;
        }
        if (foundTab.validate() === true){
            var newTestSet = {};
            var newSet = true;
            newTestSet.name = foundTab.down("#testsetname").getValue();
            newTestSet.testcases = [];
            var tempTCs = {};
            foundTab.down("#testcases").store.getRootNode().cascadeBy(function(testcase){
                if ((testcase.get("leaf") == true) && (testcase.get("checked") == true)){
                    //newTestSet.testcases.push({_id:testcase.get("_id")});
                    tempTCs[testcase.get("_id")] = testcase.get("_id");
                }
            });

            for (var type in tempTCs) {
                var item = {_id:tempTCs[type]};
                newTestSet.testcases.push(item);
            }
            if (foundTab.testSetData != null){
                foundTab.testSetData.set("name", newTestSet.name);
                foundTab.testSetData.set("testcases",newTestSet.testcases);
                foundTab.testSetData.dirty = true;
                newSet = false;
            }
            else{
                foundTab.testSetData = Ext.data.StoreManager.lookup('TestSets').add(newTestSet)[0];
            }
            foundTab.setTitle("[Test Set] "+newTestSet.name);
            foundTab.dirty = false;
            Ext.data.StoreManager.lookup('TestSets').sync({success:function(batch,options){
                if (newSet == false){
                    Ext.Ajax.request({
                        url:"/executiontestcases/udatetestset",
                        method:"POST",
                        jsonData : {testset:foundTab.testSetData.get("_id")},
                        success: function(response, action) {
                        }
                    });
                }
            }});
        }

    },

    onDoubleClick: function(me,td,cell,record,tr){
        if(record) {
            var testsetEditWindow = new Redwood.view.TestSetEdit({newTestSet:false,testSetData:record});
            testsetEditWindow.show();
        }
    },
    onTestSetEdit: function(record){
        var store = this.getStore('TestSets');
        if(record) {
            var foundTab = this.tabPanel.down("#"+record.get("_id"));
            if (foundTab === null){
                var tab = Ext.create('Redwood.view.TestSetEdit',{
                    title:"[Test Set] " + record.get("name"),
                    closable:true,
                    testSetData:record,
                    itemId:record.get("_id")
                });
                this.tabPanel.add(tab);
                foundTab = tab;
            }
            this.tabPanel.setActiveTab(foundTab);
            foundTab.initTree();
        }
    },

    onTestSetDelete: function(evtData){
        var store = this.getStore('TestSets');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: "Are you sure you want to delete '"+ record.get("name") + "' test set?" ,
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

    afterTestSetEdit: function(evtData){
        var store = this.getStore('TestSets');
        this.getStore('TestSetTags').sync();
        store.sync({success:function(batch,options){} });

    },

    addTestSet: function () {
        var tab = Ext.create('Redwood.view.TestSetEdit',{
            title:"[New Test Set]",
            closable:true
        });

        this.tabPanel.add(tab);
        this.tabPanel.setActiveTab(tab);
        tab.down("#testsetname").focus();
    },

    onEditorRender: function () {
        this.testsetsEditor = Ext.ComponentQuery.query('testsetsEditor')[0];
        this.rowEditor = this.testsetsEditor.rowEditor;
        this.tagEditor = this.testsetsEditor.tagEditor;
        this.grid = this.testsetsEditor;
        this.tabPanel = Ext.ComponentQuery.query('#testsetTab',this.testsetsEditor)[0];
    }
});