Ext.define("Redwood.controller.TestCases", {
    extend: 'Ext.app.Controller',

    models: ['TestCases',"TestCaseTags"],
    stores: ['TestCases',"TestCaseTags"],
    views:  ['TestCases'],

    init: function () {
        this.control({
            'testcases': {
                render: this.onTestCasesRender,
                newTestCase: this.onNewTestCase,
                saveTestCase: this.onSaveTestCase,
                editTestCase: this.onEditTestCase,
                deleteTestCase: this.onDeleteTestCase
            }
        });
    },

    onDeleteTestCase:function(){
        var testcaseView = this.tabPanel.getActiveTab();
        if (testcaseView === undefined){
            return;
        }
        if (testcaseView.title === "[New TestCase]"){
            return;
        }
        Ext.Msg.show({
            title:'Delete Confirmation',
            msg: "Are you sure you want to delete '"+ testcaseView.title + "' test case?" ,
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.QUESTION,
            fn: function(id){
                if (id === "yes"){
                    Ext.data.StoreManager.lookup('TestCases').remove(testcaseView.dataRecord);
                    Ext.data.StoreManager.lookup('TestCases').sync({success:function(batch,options){Ext.data.StoreManager.lookup('TestCases').load();} });
                    testcaseView.dirty = false;
                    testcaseView.close();
                }
            }
        });
    },
    onEditTestCase: function(record){
        var foundIndex = this.tabPanel.items.findIndex("title",record.get("name"),0,false,true);
        if (foundIndex == -1){
            var tab = Ext.create('Redwood.view.TestCaseView',{
                title:record.get("name"),
                closable:true,
                dataRecord:record,
                itemId:record.get("name")
            });

            this.tabPanel.add(tab);
            foundIndex = this.tabPanel.items.findIndex("title",record.get("name"),0,false,true);
        }
        this.tabPanel.setActiveTab(foundIndex);

    },

    onSaveTestCase: function(){
        var testcaseView = this.tabPanel.getActiveTab();
        if (testcaseView === undefined){
            return;
        }
        if (testcaseView.validate(this.getStore('TestCases')) === false){
            return;
        }
        var testcase = testcaseView.getTestCaseData();
        if (testcaseView.dataRecord === null){
            testcaseView.dataRecord = this.getStore('TestCases').add(testcase)[0];
        }
        else{
            testcaseView.dataRecord.set("collection",testcase.collection);
            testcaseView.dataRecord.set("name",testcase.name);
            testcaseView.dataRecord.set("description",testcase.description);
            testcaseView.dataRecord.set("status",testcase.status);
            testcaseView.dataRecord.set("tag",testcase.tag);
            testcaseView.dataRecord.set("type",testcase.type);
            testcaseView.dataRecord.set("script",testcase.script);
        }
        this.getStore('TestCases').sync();
        this.getStore('TestCaseTags').sync();
        testcaseView.setTitle(testcase.name);
        testcaseView.dirty = false;
    },

    onNewTestCase: function(){

        var tab = Ext.create('Redwood.view.TestCaseView',{
            title:"[New TestCase]",
            closable:true
        });

        this.tabPanel.add(tab);
        this.tabPanel.setActiveTab(tab);
        tab.down("#name").focus();
    },

    onTestCasesRender: function(){
        this.testcasesPanel = Ext.ComponentQuery.query('testcases')[0];
        this.tabPanel = Ext.ComponentQuery.query('#testcasetab',this.testcasesPanel)[0];
   }




});