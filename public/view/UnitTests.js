Ext.define('Redwood.view.UnitTests', {
    extend: 'Ext.window.Window',
    alias: 'widget.unittests',
    title: 'Unit Tests',
    draggable: true,
    resizable: true,
    autoScroll: true,
    overflowY: 'auto',
    width: 400,
    height: 300,
    layout: 'fit',
    modal: true,
    dataRecord: [],
    importFlag: false,
    initComponent: function () {
        var me = this;

        var selectionMode = "MULTI";
        var showHeaderCheckbox = true;
        if(me.importFlag == false){
            selectionMode = "SINGLE";
            showHeaderCheckbox = false;
        }

        var unitTestsStore =  new Ext.data.Store({
            sorters: [{
                property : 'name',
                direction: 'ASC'

            }],
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'path',     type: 'string'},
                {name: 'type',     type: 'string'}
            ],
            data: me.dataRecord
        });

        var unitTestsGrid = new Ext.grid.Panel({
            autoScroll: true,
            minHeight: 150,
            maxHeight:200,
            overflowY: 'auto',
            manageHeight: true,
            viewConfig:{
                markDirty: false
            },
            store:unitTestsStore,
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                singleSelect: false,
                sortable: true,
                mode:selectionMode,
                //checkOnly: true,
                stateful: true,
                showHeaderCheckbox: showHeaderCheckbox
            }),
            columns:[
            {
                header: 'Name',
                dataIndex: 'name',
                //flex: 1,
                width: 200
            }, {
                header: 'Test Type',
                dataIndex: 'type',
                //width: 500,
                flex: 1,
                renderer:function(value, meta, record){
                    return Ext.util.Format.htmlEncode(value);
                }

            }
        ]
    });

    var form = new Ext.panel.Panel(
        {
            layout: 'form',
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            //layout:"fit",
            bodyPadding: 5,
            border: false,
            items:[
                unitTestsGrid
            ],
            buttons: [
                {
                    xtype: "button",
                    text: "OK",
                    itemId: "SubmitForm",
                    handler: function(btn){
                        var testCases = [];
                        unitTestsGrid.getSelectionModel().getSelection().forEach(function(testcase){
                            testCases.push({path:testcase.get("path"),name:testcase.get("name"),type:testcase.get("type")})
                        });

                        if( testCases.length == 0){
                            if(me.importFlag == true){
                                Ext.Msg.show({title: "Tests Selected",msg:"Please select test cases to import.",buttons : Ext.MessageBox.OK});
                            }
                            else{
                                Ext.Msg.show({title: "Test Selection",msg:"Please select test case to run.",buttons : Ext.MessageBox.OK});
                            }
                            return
                        }
                        if(me.importFlag == true){
                            Ext.MessageBox.show({
                                msg: 'Importing test cases, please wait...',
                                progressText: 'Importing...',
                                width:300,
                                wait:true,
                                waitConfig: {interval:200}
                            });
                            Ext.Ajax.request({
                                url:"/importselectedtcs",
                                method:"POST",
                                jsonData : {testcases:testCases},
                                success: function(response) {

                                    //Ext.MessageBox.hide();
                                    //Ext.Msg.alert('Success', "Code was successfully pushed to the main branch.");
                                }
                            });
                        }
                        else{
                            Ext.Ajax.request({
                                url:"/rununittest",
                                method:"POST",
                                jsonData : {testcase:testCases[0]},
                                success: function(response) {

                                    //Ext.MessageBox.hide();
                                    //Ext.Msg.alert('Success', "Code was successfully pushed to the main branch.");
                                }
                            });
                            Ext.getCmp('runUnitTest').setIcon('images/stop.png');
                            Ext.getCmp('scriptOutputPanel').expand();
                            var elem = Ext.getCmp('scriptOutputPanel').down("#compileOutput").getEl();
                            while (elem.dom.hasChildNodes()) {
                                elem.dom.removeChild(elem.dom.lastChild);
                            }
                            Ext.DomHelper.append(elem, {tag: 'div',html:"Starting Test..."});
                            Ext.getCmp('scriptOutputPanel').expand();
                        }
                        me.close();
                    }
                },{
                    xtype: "button",
                    text: "Cancel",
                    handler: function(){
                        me.close();
                    }
                }

            ]
        }

    );

    this.items = [
        form
    ];

    this.callParent(arguments);

    }
});
