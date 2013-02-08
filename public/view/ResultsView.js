
Ext.define('Redwood.view.ResultsView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.resultsview',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    viewType: "Results",

    initComponent: function () {
        var me = this;

        var retultsStore =  new Ext.data.Store({
            storeId: "Results"+this.itemId,
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'tag',     type: 'array'},
                {name: 'status',     type: 'string'},
                {name: 'host',     type: 'string'},
                {name: 'result',     type: 'string'},
                {name: 'startdate',     type: 'date'},
                {name: 'enddate',     type: 'date'},
                {name: 'runtime',     type: 'string'},
                {name: 'error',     type: 'string'},
                {name: '_id',     type: 'string'},
                {name: 'testcaseID',     type: 'string'}
            ],
            data: []
        });

        var resultsTree = Ext.create('Ext.tree.Panel', {
            rootVisible: false,
            store: retultsStore,
            multiSelect: false,
            columns: [
                {
                    xtype: 'treecolumn',
                    text: 'Action Name',
                    flex: 2,
                    sortable: false,
                    dataIndex: 'name'
                },
                {

                }
            ]
        });

        this.items = [
            {
                xtype: 'fieldset',
                title: 'Details',
                defaultType: 'displayfield',
                flex: 1,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items: [
                    {
                        fieldLabel: "Name",
                        allowBlank: false,
                        labelStyle: "font-weight: bold",
                        itemId:"name",
                        anchor:'90%'
                    },
                    {
                        header: 'Status',
                        dataIndex: 'status',
                        width: 100,
                        renderer: function (value, meta, record) {
                            if(record.get("host") && (value == "Running")){
                                return "<a style= 'color: blue;' href='javascript:vncToMachine(&quot;"+ record.get("host") +"&quot;)'>" + value +"</a>";
                            }
                            else if (value == "Finished"){
                                return "<p style='color:green'>"+value+"</p>";
                            }
                            else if ( value == "Not Run"){
                                return "<p style='color:#ffb013'>"+value+"</p>";
                            }
                            else{
                                return value;
                            }
                        }
                    },
                    {
                        fieldLabel: "Result",
                        allowBlank: false,
                        labelStyle: "font-weight: bold",
                        itemId:"result",
                        anchor:'90%',
                        renderer: function(value,field){
                            if (value == "Passed"){
                                return "<p style='font-weight:bold;color:green'>"+value+"</p>"
                            }
                            else if (value == "Failed"){
                                return "<p style='font-weight:bold;color:red'>"+value+"</p>"
                            }
                            else{
                                return value;
                            }
                        }
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Results',
                flex: 1,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items:[
                    resultsTree
                ]
            }
        ]


    }

});