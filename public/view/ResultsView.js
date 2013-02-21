
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
                {name: 'paramvalue',     type: 'string'},
                {name: 'result',     type: 'string'},
                {name: 'error',     type: 'string'},
                {name: 'trace',     type: 'string'},
                {name: 'status',     type: 'string'}
            ]
        });

        var transformed = me.dataRecord.testcase.children;

        var transform = function(children){
            children.forEach(function(action){
                if (!action.paramvalue){
                    action.icon = "/images/action.png";
                }
                if (action.parameters){
                    action.parameters.forEach(function(parameter){
                        action.children.unshift({name:parameter.paramname,paramvalue:parameter.paramvalue,leaf:true})
                    });
                }
                if (action.children){
                    transform(action.children)
                }
            });
        };

        transform(transformed);

        retultsStore.setRootNode({"text":".","children":transformed });

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
                    width:300,
                    sortable: false,
                    dataIndex: 'name'
                },
                {
                    header: 'Parameter Value',
                    //flex: 2,
                    width:120,
                    sortable: false,
                    dataIndex: 'paramvalue'
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

        var logStore =  Ext.create('Ext.data.Store', {
            storeId: "ResultLogs"+this.itemId,
            idProperty: '_id',
            fields: [
                {name: 'actionName',     type: 'string'},
                {name: 'message',     type: 'string'},
                {name: 'date',     type: 'date'}
            ],
            sorters: [{
                property : 'date',
                direction: 'ASC'
            }],
            data:[]
        });

        me.dataRecord.logs.forEach(function(log){
            var timestamp = log._id.substring(0,8);
            logStore.add({message:log.message,actionName:log.actionName,date:new Date( parseInt( timestamp, 16 ) * 1000 )})
        });

        var logGrid = Ext.create('Ext.grid.Panel', {
            store: logStore,
            itemId:"executionLogs",
            selType: 'rowmodel',
            viewConfig: {
                markDirty: false,
                enableTextSelection: true
            },
            columns:[
                {
                    header: 'Action Name',
                    dataIndex: 'actionName',
                    width: 200
                },
                {
                    xtype:"datecolumn",
                    format:'m/d h:i:s',
                    header: 'Date',
                    dataIndex: 'date',
                    width: 100
                },
                {
                    header: 'Message',
                    dataIndex: 'message',
                    flex: 1
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
                        value:"<p style='font-weight:bold'>"+me.dataRecord.testcase.name+"</p>",
                        anchor:'90%'
                    },
                    {
                        fieldLabel: 'Status',
                        labelStyle: "font-weight: bold",
                        value:me.dataRecord.testcase.status,
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
                        value:me.dataRecord.testcase.result,
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
            },
            {
                xtype: 'fieldset',
                title: 'Logs',
                flex: 1,
                //minHeight:600,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items:[
                    logGrid
                ]
            }
        ];

        this.callParent(arguments);
    }

});