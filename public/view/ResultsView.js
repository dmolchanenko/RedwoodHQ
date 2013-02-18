
Ext.define('Redwood.view.ResultsView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.resultsview',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    viewType: "Results",

    initComponent: function () {
        var me = this;

        var retultsStore =  Ext.create('Ext.data.TreeStore', {
            storeId: "Results"+this.itemId,
            idProperty: 'name',
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'result',     type: 'string'},
                {name: 'error',     type: 'string'},
                {name: 'trace',     type: 'string'},
                {name: 'status',     type: 'string'}
            ]//,
            //root: {"text":".","children": [me.dataRecord.children]}
            //root: [{"text":".","children": [{name:"BLIN",text:"TEXT"}]}]
        });
        //retultsStore.setRootNode({"text":".","children": [{name:"BLIN",result:"adsf",anything:"adsf"}]});
        retultsStore.setRootNode({"text":".","children": me.dataRecord.children});
        var resultsTree = Ext.create('Ext.tree.Panel', {
            rootVisible: false,
            store: retultsStore,
            //minHeight:600,
            viewConfig: {
                markDirty: false,
                enableTextSelection: true
            },
            multiSelect: false,
            columns: [
                {
                    xtype: 'treecolumn',
                    header: 'Action Name',
                    //flex: 2,
                    width:400,
                    sortable: false,
                    dataIndex: 'name'
                },
                {
                    header: 'Status',
                    sortable: false,
                    dataIndex: 'status',
                    renderer: function (value, meta, record) {
                        if(record.get("host") && (value == "Running")){
                            return "<a style= 'color: blue;' href='javascript:vncToMachine(&quot;"+ record.get("host") +"&quot;,&quot;"+ record.get("vncport") +"&quot;)'>" + value +"</a>";
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
                    header: 'Result',
                    dataIndex: "result",
                    renderer: function(value,meta,record){

                        if (value == "Passed"){
                            return "<p style='color:green'>"+value+"</p>"
                        }
                        else if (value == "Failed"){
                            return "<p style='color:red'>"+value+"</p>"
                        }
                        else{
                            return value;
                        }

                    }
                },
                {
                    header: 'Error',
                    dataIndex: "error",
                    width:240,
                    renderer: function(value,meta,record){
                        meta.tdCls = 'x-redwood-results-cell';
                        return "<p style='color:red'>"+value+"</p>";
                    }
                },
                {
                    header: 'Trace',
                    dataIndex: "trace",
                    flex:1,
                    //width: 800,
                    renderer: function(value,meta,record){
                        meta.tdCls = 'x-redwood-results-cell';
                        return "<p style='color:red'>"+value+"</p>"
                    }
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
                        labelStyle: "font-weight: bold",
                        style:"font-weight: bold",
                        itemId:"name",
                        value:"<p style='font-weight:bold'>"+me.dataRecord.name+"</p>",
                        anchor:'90%'
                    },
                    {
                        fieldLabel: 'Status',
                        labelStyle: "font-weight: bold",
                        value:me.dataRecord.status,
                        anchor:'90%',
                        renderer: function (value) {
                            if(value == "Running"){
                                return "<a style= 'color:font-weight:bold;blue;' href='javascript:vncToMachine(&quot;"+ record.get("host") +"&quot;)'>" + value +"</a>";
                            }
                            else if (value == "Finished"){
                                return "<p style='font-weight:bold;color:green'>"+value+"</p>";
                            }
                            else if ( value == "Not Run"){
                                return "<p style='font-weight:bold;color:#ffb013'>"+value+"</p>";
                            }
                            else{
                                return value;
                            }
                        }
                    },
                    {
                        fieldLabel: "Result",
                        labelStyle: "font-weight: bold",
                        itemId:"result",
                        value:me.dataRecord.result,
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
                //minHeight:600,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items:[
                    resultsTree
                ]
            }
        ];

        this.callParent(arguments);
    }

});