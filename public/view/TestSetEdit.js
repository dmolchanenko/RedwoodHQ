//loadRecord
Ext.apply(Ext.form.field.VTypes, {

    testsetnameTestText: 'Test Set with the same name already exists.',
    testsetnameTest: function(val,field){
        var store = Ext.data.StoreManager.lookup('TestSets');
        var index = store.findExact(field.name,val);
        if (index != -1){
            //return false;
            var foundID = store.getAt(index).internalId;
            var testSetData = field.up("testsetEdit").testSetData;
            if (testSetData != null){
                if (testSetData.get("_id") != foundID){
                    this.testsetnameTestText = "Test Set name should be unique.";
                    return false;
                }
            }
        }

        return true;
    }
});

Ext.define('Redwood.view.TestSetEdit', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testsetEdit',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    testSetData: null,
    defaultFocus: "testsetname",
    bodyPadding: 5,
    viewType: "TestSet",
    listeners:{
        afterrender: function(me){
            if (me.testSetData != null){
                me.down("#testsetname").setValue(me.testSetData.get("name"));
            }
        }
    },

    validate: function(){
        return this.down("#testsetname").validate();
    },

    initComponent: function () {
        var me = this;
        var testcases = [];
        Ext.data.StoreManager.lookup('TestCases').each(function(testcase){
            var foundTC = false;
            if (me.testSetData != null){
                me.testSetData.get("testcases").forEach(function(recordedTestcase){
                    if(recordedTestcase._id === testcase.get("_id")){
                        foundTC = true;
                    }
                })
            }
            testcases.push({name:testcase.get("name"),_id:testcase.get("_id"),leaf:true,checked:foundTC})
        });

        var treeStore =  new Ext.data.TreeStore({
            fields: [
                {name: 'name',     type: 'string'},
                {name: '_id',     type: 'string'}
            ],
            root: {
                expanded: true,
                children: testcases
            }
        });

        this.items = [{
            xtype:'textfield',
            itemId:"testsetname",
            afterLabelTextTpl: this.requiredText,
            fieldLabel: 'Test Set Name',
            name: 'name',
            width: 300,
            vtype:'testsetnameTest',
            allowBlank: false
        },
            {
                xtype:"treepanel",
                title: 'Test Cases',
                multiSelect: false,
                itemId: "testcases",
                rootVisible: false,
                store: treeStore,
                displayField:"name",
                focused: false,
                autoScroll:true,
                listeners: {
                    checkchange:function(firstNode,checked,eOpt){
                        //snapshotBrowser.fireEvent('dirChecked',firstNode,checked);
                    },
                    selectionchange:function(opt1,selectedRecord,opt3){
                        //snapshotBrowser.fireEvent("dirSelection",selectedRecord[0]);
                    },
                    afteritemcollapse:function(node){
                        //snapshotBrowser.fireEvent("dirCollapsed",node);
                    },
                    afteritemexpand:function(node){
                        //snapshotBrowser.fireEvent("dirCollapsed",node);
                    }
                }
            }
        ];
        this.itemssss= {
            xtype:"form",
            layout:"anchor",
            bodyPadding: 5,
            defaults: {
                anchor: '100%'
            },
            buttons: [
                {
                    text: 'Submit',
                    itemId: "submit",
                    formBind: true, //only enabled once the form is valid
                    disabled: true,
                    handler: function() {
                        var form = this.up('form').getForm();
                        if (form.isValid()) {
                            var window = this.up('window');
                            var newTestSet = {};
                            newTestSet.name = form.getFieldValues().name;
                            newTestSet.testcases = [];
                            window.down("#testcases").store.getRootNode().eachChild(function(testcase){
                                if (testcase.get("checked") == true){
                                    newTestSet.testcases.push({_id:testcase.get("_id")});
                                }
                            });
                            if (me.newTestSet == false){
                                me.testSetData.set("name", newTestSet.name);
                                me.testSetData.set("testcases",newTestSet.testcases);
                            }
                            else{
                                Ext.data.StoreManager.lookup('TestSets').add(newTestSet);
                            }

                            Ext.data.StoreManager.lookup('TestSets').sync({success:function(batch,options){
                                if (me.newTestSet == false){
                                    Ext.Ajax.request({
                                        url:"/executiontestcases/udatetestset",
                                        method:"POST",
                                        jsonData : {testset:me.testSetData.get("_id")},
                                        success: function(response, action) {
                                        }
                                    });
                                }
                            }});
                            window.close();
                        }
                    }
                },
                {
                    text: 'Cancel',
                    handler: function() {
                        this.up('form').up('window').close();
                    }
                }]

        };
        this.callParent(arguments);
    }

});