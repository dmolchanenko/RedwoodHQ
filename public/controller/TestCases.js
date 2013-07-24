function openTestCase(id){
    var store = Ext.data.StoreManager.lookup('TestCases');
    var tab = Ext.ComponentQuery.query("#mainTabPanel")[0];
    tab.setActiveTab(tab.down("#testcasesBrowser"));
    var controller = Redwood.app.getController("TestCases");
    controller.onEditTestCase(store.getById(id));
    if(Ext.isChrome){
        return false;
    }
}


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
                deleteTestCase: this.onDeleteTestCase,
                cloneTestCase: this.onCloneTestCase
            }
        });
    },

    onCloneTestCase:function(){
        var testcaseView = this.tabPanel.getActiveTab();
        var me = this;
        if (testcaseView === null){
            return;
        }
        if (testcaseView.dirty === true){
            Ext.Msg.show({title: "Clone Error",msg:"Please save any changes before cloning selected test case.",iconCls:'error',buttons : Ext.MessageBox.OK});
            return;
        }

        Ext.Msg.prompt('Name', 'Please enter new test case name:', function(btn, text){
            if (btn == 'ok'){

                if(me.getStore('TestCases').find("name",text) != -1){
                    Ext.Msg.show({title: "Clone Error",msg:"Test Case name should be unique.",iconCls:'error',buttons : Ext.MessageBox.OK});
                    return;
                }

                var testCase = testcaseView.getTestCaseData();
                testCase.name = text;
                var newTestCase = me.getStore('TestCases').add(testCase)[0];
                me.getStore('TestCases').sync({success:function(batch,options){
                    Ext.socket.emit('AddTestCases', batch.operations[0].records[0].data);
                }});
                me.onEditTestCase(newTestCase,false);
            }
        });

    },

    onDeleteTestCase:function(){
        var testcaseView = this.tabPanel.getActiveTab();
        if (testcaseView === null){
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
                    Ext.data.StoreManager.lookup('TestCases').sync({success:function(batch,options){} });
                    testcaseView.dirty = false;
                    testcaseView.close();
                }
            }
        });
    },
    onEditTestCase: function(record,collapse){
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
            if(!collapse == false){
                tab.down("#testcaseDetails").collapse();
            }
        }
        this.tabPanel.setActiveTab(foundIndex);

    },

    onSaveTestCase: function(){
        var testcaseView = this.tabPanel.getActiveTab();
        if (testcaseView === null){
            return;
        }
        if (testcaseView.validate(this.getStore('TestCases')) === false){
            return;
        }
        var testcase = testcaseView.getTestCaseData();
        if (testcaseView.dataRecord === null){
            testcaseView.dataRecord = this.getStore('TestCases').add(testcase)[0];
            this.getStore('TestCases').sync({success:function(batch,options){
                Ext.socket.emit('AddTestCases', batch.operations[0].records[0].data);
            }});
        }
        else{
            testcaseView.dataRecord.set("collection",testcase.collection);
            testcaseView.dataRecord.set("name",testcase.name);
            testcaseView.dataRecord.set("description",testcase.description);
            testcaseView.dataRecord.set("status",testcase.status);
            testcaseView.dataRecord.set("tag",testcase.tag);
            testcaseView.dataRecord.set("type",testcase.type);
            testcaseView.dataRecord.set("script",testcase.script);
            testcaseView.dataRecord.dirty = true;
            this.getStore('TestCases').sync();
        }
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