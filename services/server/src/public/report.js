Ext.require([
    '*'
]);

Ext.onReady(function() {
    var bd = Ext.getDom("report");

    var executionTCStore =  new Ext.data.Store({
        storeId: "ExecutionTCs"+this.itemId,
        fields: [
            {name: 'name',     type: 'string'},
            {name: 'tag',     type: 'array'},
            {name: 'status',     type: 'string'},
            {name: 'resultID',     type: 'string'},
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

    var testcasesGrid = new Ext.grid.Panel({
        store: executionTCStore,
        itemId:"executionTestcases",
        selType: 'rowmodel',
        viewConfig: {
            markDirty: false,
            enableTextSelection: true
        },
        selModel: Ext.create('Ext.selection.CheckboxModel', {
            singleSelect: false,
            sortable: true,
            stateful: true,
            showHeaderCheckbox: true
        }),
        minHeight: 150,
        manageHeight: true,
        flex: 1,
        plugins: [
            Ext.create('Ext.grid.plugin.CellEditing', {
                clicksToEdit: 1

            })],
        listeners:{
            edit: function(editor, e ){
                if ((e.field == "endAction") &&(e.value != "") &&(e.record.get("startAction") == "")){
                    e.record.set("startAction",1);
                }
                testcasesGrid.getSelectionModel().select([e.record]);
            }
        },
        columns:[
            {
                header: 'Name',
                dataIndex: 'name',
                flex: 1,
                renderer: function (value, meta, record) {
                    return value;

                }
            },
            {
                header: 'Tags',
                dataIndex: 'tag',
                width: 200
            },
            {
                header: 'Start Action',
                dataIndex: 'startAction',
                width: 100,
                editor: {
                    xtype: 'textfield',
                    maskRe: /^\d+$/,
                    allowBlank: true,
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            },
            {
                header: 'End Action',
                dataIndex: 'endAction',
                width: 100,
                editor: {
                    xtype: 'textfield',
                    maskRe: /^\d+$/,
                    allowBlank: true,
                    listeners:{
                        focus: function(){
                            this.selectText();
                        }
                    }
                }
            },
            {
                header: 'Status',
                dataIndex: 'status',
                width: 100,
                renderer: function (value, meta, record) {
                    if(record.get("resultID") != ""){
                        record.set("name","<a style= 'color: blue;' href='javascript:openResultDetails(&quot;"+ record.get("resultID") +"&quot;)'>" + record.get("tempName") +"</a>");
                    }

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
                xtype:"datecolumn",
                format:'m/d h:i:s',
                header: 'Started',
                dataIndex: 'startdate',
                width: 100
            },
            {
                xtype:"datecolumn",
                format:'m/d h:i:s',
                header: 'Finished',
                dataIndex: 'enddate',
                width: 100
            },
            {
                header: 'Elapsed Time',
                dataIndex: 'runtime',
                width: 75,
                renderer: function(value,meta,record){
                    if (value == "") return "";
                    var hours = Math.floor(parseInt(value,10) / 36e5),
                        mins = Math.floor((parseInt(value,10) % 36e5) / 6e4),
                        secs = Math.floor((parseInt(value,10) % 6e4) / 1000);
                    return hours+"h:"+mins+"m:"+secs+"s";
                }
            },
            {
                header: 'Error',
                dataIndex: 'error',
                width: 250,
                renderer: function(value,meta,record){
                    //if(value.indexOf("<div style") == -1){
                    meta.tdAttr = 'data-qtip="' + value + '"';
                    //    record.set("error",'<div style="color:red" ext:qwidth="150" ext:qtip="' + value + '">' + value + '</div>');
                    //}
                    return '<div style="color:red" ext:qwidth="150" ext:qtip="' + value + '">' + value + '</div>'

                }
            },
            {
                header: 'Result',
                dataIndex: 'result',
                width: 120,
                renderer: function(value,record){
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
            }
        ]

    });

    var report = Ext.widget({

        xtype: 'panel',
        overflowY: 'auto',
        bodyPadding: 5,

        style: "margin: 0px auto 0px auto;",
        items: [
            {
                xtype: 'fieldset',
                title: 'Used Variables',
                flex: 1,
                collapsible: true,
                items:[
                    variablesGrid
                ]
            }
        ]
    });

    report.render(bd);
});
