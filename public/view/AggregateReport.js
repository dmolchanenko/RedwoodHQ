Ext.define('Redwood.view.AggregateReport', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.aggregatereport',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    dirty: false,
    loadingData: true,
    viewType: "Execution",
    noteChanged: false,

    initComponent: function () {

        var me = this;

        me.aggregateStore =  new Ext.data.Store({
            fields: [
                {name: 'failed',     type: 'int'},
                {name: 'id',     type: 'string'},
                {name: 'lastRunDate',     type: 'date'},
                {name: 'name',     type: 'string'},
                {name: 'notRun',     type: 'int'},
                {name: 'passed',     type: 'int'},
                {name: 'tag',     type: 'array'},
                {name: 'total',     type: 'int'}
            ],
            data: []
        });

        me.dataRecord.aggregateData.forEach(function(execution){
            me.aggregateStore.add(execution)
        });

        var aggregateGrid = new Ext.grid.Panel({
            store: me.aggregateStore,
            selType: 'rowmodel',
            viewConfig: {
                markDirty: false
            },
            minHeight: 150,
            manageHeight: true,
            flex: 1,
            columns:[
                {
                    header: 'Name',
                    dataIndex: 'name',
                    width: 200
                },
                {
                    xtype:"datecolumn",
                    format:'m/d h:i:s',
                    header: 'Last Run',
                    dataIndex: 'lastRunDate',
                    width: 100
                },
                {
                    header: 'Passed',
                    dataIndex: 'passed',
                    //flex: 1,
                    width: 100,
                    renderer: function (value, meta, record) {
                        return "<p style='color:green'>"+value+"</p>";
                    }
                },
                {
                    header: 'Failed',
                    dataIndex: 'failed',
                    //flex: 1,
                    width: 100,
                    renderer: function (value, meta, record) {
                        return "<p style='color:red'>"+value+"</p>";
                    }
                },
                {
                    header: 'Not Run',
                    dataIndex: 'notRun',
                    //flex: 1,
                    width: 100,
                    renderer: function (value, meta, record) {
                        return "<p style='color:#ffb013'>"+value+"</p>";
                    }
                },
                {
                    header: 'Total',
                    dataIndex: 'total',
                    //flex: 1,
                    width: 100
                }
            ]

        });

        var aggregateChart = Ext.create('Ext.chart.Chart',{
            xtype: 'chart',
            width:1200,
            height: 500,
            animate: true,
            shadow: true,
            store: me.aggregateStore,
            legend: {
                position: 'left'
            },
            axes: [{
                type: 'Numeric',
                position: 'left',
                fields: ['notRun', 'passed', 'failed'],
                title: false,
                grid: true
            }, {
                type: 'Category',
                position: 'bottom',
                fields: ['name'],
                title: false
            }],
            series: [{
                type: 'column',
                axis: 'left',
                gutter: 80,
                showInLegend: true,
                xField: 'name',
                yField: ['notRun', 'passed', 'failed'],
                stacked: true,
                title: ["Not Run","Passed","Failed"],
                tips: {
                    trackMouse: true,
                    width: 65,
                    height: 40,
                    renderer: function(storeItem, item) {
                        var label;
                        if (item.yField == "failed") label = "Failed: ";
                        if (item.yField == "passed") label = "Passed: ";
                        if (item.yField == "notRun") label = "Not Run: ";
                        this.setTitle(label+item.value[1]);
                    }
                }
            }]
        });

        aggregateChart.themeAttrs.colors = ['#ffb013','green','red'];


        var nameRenderer = function(value, meta, record){
            var tcName = Ext.data.StoreManager.lookup('TestCases').query("_id",value).getAt(0);

            return "<a style= 'color:font-weight:bold;blue;' href='javascript:openTestCase(&quot;"+ value +"&quot;)'>" + tcName.get("name") +"</a>";
        };

        var aggregateRenderer = function(value, meta, record){
            /*
            var aggregation = "Mixed";
            var didNotPass = false;
            var didNotFail = false;
            //now I'm just fucking with ya
            var didNotNotRun = false;
            me.dataRecord.executionIDs.forEach(function(id){
                var result = record.get(id.executionID);
                if(result != null){
                    if(result != "Passed") {
                        didNotPass = true;
                    }
                    if(result != "Failed") {
                        didNotFail = true;
                    }
                    if ((result == "Passed") || (result == "Failed")) didNotNotRun = true;
                }
            });
            if ((didNotPass == true) &&(didNotFail == true) &&(didNotNotRun == true)) {
                return "Mixed"
            }

            else if (didNotPass == false){
                return "<p style='color:green'>Passed</p>";
            }
            else if(didNotFail == false){
                return "<p style='color:red'>Failed</p>";
            }
            else{
                return "<p style='color:#ffb013'>Not Run</p>";
            }
            */

            if (value == "Mixed") {
                return "Mixed"
            }

            else if (value == "Passed"){
                return "<p style='color:green'>Passed</p>";
            }
            else if(value == "Failed"){
                return "<p style='color:red'>Failed</p>";
            }
            else{
                return "<p style='color:#ffb013'>Not Run</p>";
            }

        };

        var resultRenderer = function(value, meta, record){
            if (value == "Passed"){
                return "<p style='color:green'>"+value+"</p>"
            }
            else if (value == "Failed"){
                return "<p style='color:red'>"+value+"</p>"
            }
            else if (value == ""){
                return "N/A"
            }
            else{
                return "<p style='color:#ffb013'>Not Run</p>";
            }
        };

        var columns = [];
        columns.push({header: 'Test Case Name',
            dataIndex: 'name',
            renderer:nameRenderer,
            width: 200});


        var fields = [];
        fields.push({name: 'name',type: 'string'});
        fields.push({name: 'aggregate',type: 'string'});
        me.dataRecord.executionIDs.forEach(function(id){
            fields.push({name: id.executionID,type: 'string'});

            columns.push({header: Ext.data.StoreManager.lookup('Executions').query("_id",id.executionID).getAt(0).get("name"),
                dataIndex: id.executionID,
                renderer:resultRenderer,
                width: 200});
        });

        columns.push({header: 'Aggregate Total',
            dataIndex: 'aggregate',
            renderer:aggregateRenderer,
            width: 100});

        me.testCaseStore =  new Ext.data.Store({
            fields: fields,
            data: []
        });

        for(var propt in me.dataRecord.testCases){
            var obj = me.dataRecord.testCases[propt];
            obj.name = propt;
            obj.aggregate = "";
            me.testCaseStore.add(obj);
        }

        me.testCaseStore.each(function(record){
            var didNotPass = false;
            var didNotFail = false;
            //now I'm just fucking with ya
            var didNotNotRun = false;
            me.dataRecord.executionIDs.forEach(function(id){
                var result = record.get(id.executionID);
                if(result != null){
                    if (result == ""){
                        didNotNotRun = true;
                        //didNotFail = true;
                        //didNotPass = true;
                    }
                    else if(result == "Not Run") {
                        didNotFail = true;
                        didNotPass = true;
                    }
                    else if(result != "Passed") {
                        didNotPass = true;
                    }
                    else if(result != "Failed") {
                        didNotFail = true;
                    }
                    if ((result == "Passed") || (result == "Failed")) didNotNotRun = true;
                }
            });
            if ((didNotPass == true) &&(didNotFail == true) &&(didNotNotRun == true)) {
                record.set("aggregate","Mixed");
            }

            else if (didNotPass == false){
                record.set("aggregate","Passed");
            }
            else if(didNotFail == false){
                record.set("aggregate","Failed");
            }
            else{
                record.set("aggregate","Not Run");
            }
        });

        var testcasesGrid = new Ext.grid.Panel({
            /*
            tbar:{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    {
                        width: 400,
                        fieldLabel: 'Search',
                        labelWidth: 50,
                        xtype: 'searchfield',
                        paramNames: ["name","tag"],
                        //paramNames: ["tempName","tag","status","result"],
                        store: me.testCaseStore
                    }
                    ]
            },
            plugins: [
                "bufferedrenderer"
            ],
            */
            store: me.testCaseStore,
            //height: 500,
            selType: 'rowmodel',
            viewConfig: {
                markDirty: false
            },
            minHeight: 150,
            manageHeight: true,
            flex: 1,
            columns:columns
        });


        this.items = [
            {
                xtype: 'fieldset',
                title: 'Aggregate Data',
                layout:"fit",
                flex: 1,
                collapsible: true,
                items: [
                    aggregateGrid
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Aggregate Chart',
                flex: 1,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items: [
                    aggregateChart
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Test Case Details',
                flex: 1,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items: [
                    testcasesGrid
                ]
            }
        ];


        this.callParent(arguments);
    }
});
