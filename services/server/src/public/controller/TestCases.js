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

function openTestCaseHistory(testcaseID,historyID){
    var store = Ext.data.StoreManager.lookup('TCHistoryStore'+testcaseID);
    var tab = Ext.ComponentQuery.query("#mainTabPanel")[0];
    tab.setActiveTab(tab.down("#testcasesBrowser"));
    var controller = Redwood.app.getController("TestCases");
    var record = store.query("_id",historyID).get(0);
    //flag this as a history test case
    record.set("history",true);
    controller.onEditTestCase(record);
    if(Ext.isChrome){
        return false;
    }
}


Ext.define("Redwood.controller.TestCases", {
    extend: 'Ext.app.Controller',

    models: ['TestCases',"TestCaseTags"],
    stores: ['TestCases',"TestCaseTags","TestCaseTree"],
    views:  ['TestCases','RecorderView'],

    init: function () {
        this.control({
            'testcases': {
                render: this.onTestCasesRender,
                newTestCase: this.onNewTestCase,
                recordTestCase: this.onRecordTestCase,
                saveTestCase: this.onSaveTestCase,
                editTestCase: this.onEditTestCase,
                deleteTestCase: this.onDeleteTestCase,
                cloneTestCase: this.onCloneTestCase,
                testCaseToCode: this.onTestCaseToCode
            }
        });
    },

    onTestCaseToCode: function(){
        var testcaseView = this.tabPanel.getActiveTab();
        var me = this;
        if (testcaseView === null){
            return;
        }
        if (testcaseView.title === "[New TestCase]"){
            return;
        }

        if (testcaseView.xtype == "codeeditorpanel"){
            return;
        }

        Ext.Ajax.request({
            url:"/testcasetocode",
            method:"POST",
            jsonData : {_id:testcaseView.dataRecord.get("_id")},
            success: function(response) {
                var obj = Ext.decode(response.responseText);
                if(obj.error){
                    Ext.Msg.alert('Error', obj.error);
                }
                else{
                    var tab = me.tabPanel.add({
                        inCollab:false,
                        inConflict:false,
                        path:"",
                        editorType:"text/x-groovy",
                        title:"[Groovy Code]"+testcaseView.dataRecord.get("name"),
                        closable:true,
                        xtype:"codeeditorpanel",
                        readOnly:true
                    });
                    me.tabPanel.setActiveTab(tab);
                    tab.setValue(obj.code);
                    tab.focus();
                    tab.clearDirty();
                }
            }
        });
    },

    onRevert: function(historyID){
        Ext.Ajax.request({
            url:"/testcasehistory",
            method:"POST",
            jsonData : {id:historyID},
            success: function(response) {
                var obj = Ext.decode(response.responseText);
                if(obj.error){
                    Ext.Msg.alert('Error', obj.error);
                }
            }
        });
    },

    onRecordTestCase:function(){
        var testcaseView = this.tabPanel.getActiveTab();
        var me = this;
        if (testcaseView === null){
            return;
        }
        var recorderWindow = new Redwood.view.RecorderView({type:"testcase"});
        recorderWindow.show();
    },

    onCloneTestCase:function(){
        var testcaseView = this.tabPanel.getActiveTab();
        var me = this;
        if (testcaseView === null){
            return;
        }
        if (testcaseView.xtype == "codeeditorpanel"){
            return;
        }
        if (testcaseView.dirty === true){
            Ext.Msg.show({title: "Clone Error",msg:"Please save any changes before cloning selected test case.",iconCls:'error',buttons : Ext.MessageBox.OK});
            return;
        }

        Ext.Msg.prompt('Name', 'Please enter new test case name:', function(btn, text){
            if (btn == 'ok'){
                var record = me.getStore('TestCases').query("name",text,false,true,true).getAt(0);
                if(record){
                    Ext.Msg.show({title: "Clone Error",msg:"Test Case name should be unique.",iconCls:'error',buttons : Ext.MessageBox.OK});
                    return;
                }

                var testCase = testcaseView.getTestCaseData();
                testCase.name = text;
                var newTestCase = me.getStore('TestCases').add(testCase)[0];
                me.getStore('TestCases').sync({success:function(batch,options){
                    var testcaseData = batch.operations[0].records[0].data;
                    testcaseData.project = Ext.util.Cookies.get('project');
                    Ext.socket.emit('AddTestCases', testcaseData);
                    me.onEditTestCase(newTestCase,false);
                }});
            }
        });

    },

    onDeleteTestCase:function(){
        var testcaseView = this.tabPanel.getActiveTab();
        var me = this;
        if (testcaseView === null){
            return;
        }
        if (testcaseView.xtype == "codeeditorpanel"){
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
        var me = this;
        var name = record.get("name");
        if(record.get("history") == true){
            name = "[HISTORY " + Ext.Date.format(record.get("date"),"m/d h:i:s") + "] "+name;
        }
        var foundIndex = this.tabPanel.items.findIndexBy(function(item) {
            return item.itemId === name;
        });
        //try again with the star
        if (foundIndex == -1){
            //foundIndex = this.tabPanel.items.findIndex("title",new RegExp("^"+record.get("name")+"\\*$"),0,false,true);
            foundIndex = this.tabPanel.items.findIndexBy(function(item,key){
                if(key == name){
                    return true;
                }
                else{
                    return false;
                }
            });
        }
        if (foundIndex == -1){
            Ext.Ajax.request({
                url:"/testcase/"+record.get("_id"),
                method:"GET",
                success: function(response) {
                    var obj = Ext.decode(response.responseText);
                    if(obj.error){
                        Ext.Msg.alert('Error', obj.error);
                    }
                    else{
                        record.set("collection",obj.testcase.collection);
                        record.set("name",obj.testcase.name);
                        record.set("description",obj.testcase.description);
                        record.set("status",obj.testcase.status);
                        record.set("tag",obj.testcase.tag);
                        record.set("type",obj.testcase.type);
                        record.set("afterState",obj.testcase.afterState);
                        record.set("script",obj.testcase.script);
                        record.set("scriptLang",obj.testcase.scriptLang);
                        if (obj.testcase.tcData){
                            record.set("tcData",obj.testcase.tcData);
                        }
                        record.dirty = false;
                        var tab = Ext.create('Redwood.view.TestCaseView',{
                            title:name,
                            closable:true,
                            dataRecord:record,
                            itemId:name
                        });

                        me.tabPanel.add(tab);

                        //foundIndex = this.tabPanel.items.findIndex("title",new RegExp("^"+record.get("name")+"$"),0,false,true);
                        foundIndex = me.tabPanel.items.findIndexBy(function(item,key){
                            if(key == name){
                                return true;
                            }
                            else{
                                return false;
                            }
                        });
                        if(!collapse == false){
                            tab.down("#testcaseDetails").collapse();
                        }
                        me.tabPanel.setActiveTab(foundIndex);
                    }
                }
            });

        }
        else{
            this.tabPanel.setActiveTab(foundIndex);
        }
    },

    onSaveTestCase: function(){
        var testcaseView = this.tabPanel.getActiveTab();
        if (testcaseView === null){
            return;
        }
        if (testcaseView.validate(this.getStore('TestCases')) === false){
            return;
        }
        if (testcaseView.dataRecord !== null && testcaseView.dataRecord.get("history") == true){
            return;
        }
        var lastScrollPos = testcaseView.getEl().dom.children[0].scrollTop;
        var testcase = testcaseView.getTestCaseData();
        if (testcaseView.dataRecord === null){
            testcaseView.dataRecord = this.getStore('TestCases').add(testcase)[0];
            this.getStore('TestCases').sync({success:function(batch,options){
                var testcaseData = batch.operations[0].records[0].data;
                testcaseData.project = Ext.util.Cookies.get('project');
                Ext.socket.emit('AddTestCases', testcaseData);
                window.history.replaceState("", "", '/index.html?testcase='+testcaseView.dataRecord.get("_id")+"&project="+Ext.util.Cookies.get('project'));
            }});
        }
        else{
            testcaseView.dataRecord.set("collection",testcase.collection);
            testcaseView.dataRecord.set("name",testcase.name);
            testcaseView.dataRecord.set("description",testcase.description);
            testcaseView.dataRecord.set("status",testcase.status);
            testcaseView.dataRecord.set("tag",testcase.tag);
            testcaseView.dataRecord.set("type",testcase.type);
            testcaseView.dataRecord.set("afterState",testcase.afterState);
            testcaseView.dataRecord.set("script",testcase.script);
            testcaseView.dataRecord.set("scriptLang",testcase.scriptLang);
            testcaseView.dataRecord.set("tcData",testcase.tcData);
            testcaseView.dataRecord.dirty = true;

            this.getStore('TestCases').sync();

        }
        this.getStore('TestCaseTags').sync();
        testcaseView.setTitle(testcase.name);
        testcaseView.dirty = false;
        testcaseView.getEl().dom.children[0].scrollTop = lastScrollPos;
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