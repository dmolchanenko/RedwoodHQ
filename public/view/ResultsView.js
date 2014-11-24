
Ext.define('Redwood.view.ResultsView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.resultsview',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    viewType: "Results",
    UpdateResultCache: null,

    refreshHeight: function(){
        var grid = this.down("#resultsGrid");
        grid.resetHeight(grid);
    },
    listeners:{
        afterrender: function(me){
            Ext.socket.on('UpdateResult'+me.itemId,function(result){
                if(!me.UpdateResultCache){
                    me.UpdateResultCache = result;
                    setTimeout(function(){
                        me.refreshResult(me.UpdateResultCache);
                        me.UpdateResultCache = null;
                    },3000)
                }
                else{
                    me.UpdateResultCache = result;
                }

            });

            if (me.dataRecord.testcase.script){
                if(me.dataRecord.screenshot){
                    me.down("#screenShots").addNewScreenShot(me.dataRecord.screenshot._id);
                }
                me.down("#results").hide();
                me.down("#error").show();
                me.down("#trace").show();
            }
        },
        beforeclose:function(panel){
            Ext.socket.removeAllListeners('UpdateResult'+panel.itemId);
            panel.resultsStore.destroy();
            //panel.logStore.destroy();
            panel.dataRecord = null;
        }
    },

    lastResult: {},

    refreshResult: function(result){
        var me = this;
        me.latestResult = result;

        var refresh = function(){
            if(!me.latestResult) return;
            var resultNodes = [];
            var cascadeResult = function(nodes){
                nodes.forEach(function(node){
                    resultNodes.push(node);
                    if((node.children) && (node.children.length > 0)){
                        cascadeResult(node.children);
                    }
                })
            };
            if(me.latestResult.children) cascadeResult(me.latestResult.children);
            delete me.latestResult;
            var index = 0;
            me.resultsStore.getRootNode().cascadeBy(function(node){
                if(!node.isRoot()){
                    if((node.get("status") != "Finished") && (resultNodes[index].status != "No Run")){
                        node.set("result",resultNodes[index].result);
                        node.set("status",resultNodes[index].status);
                        node.set("parameters",resultNodes[index].parameters);
                        node.set("error",resultNodes[index].error);
                        node.set("screenshot",resultNodes[index].screenshot);
                        node.set("trace",resultNodes[index].trace);
                        if(resultNodes[index].expanded == true){
                            node.expand();
                            me.down("#resultsGrid").resetHeight(me.down("#resultsGrid"));
                        }
                        else{
                            //node.collapse();
                        }
                        if(resultNodes[index].screenshot){
                            me.down("#screenShots").addNewScreenShot(node);
                        }
                    }
                    index++;
                }
            });
        };
        setTimeout(function(){
            refresh();
            if(me.down("#status") == null) return;
            if(me.down("#status").getValue() != result.status){
                me.down("#status").setValue(result.status);
            }

            if(me.down("#result").getValue() != result.result){
                me.down("#result").setValue(result.result);
            }

            if(me.down("#trace").getValue() != result.trace){
                me.down("#trace").setValue(result.trace);
            }

            if(me.down("#error").getValue() != result.error){
                me.down("#error").setValue(result.error);
            }

        },500);


        /*
        var lastNode = null;
        if(result.children.length == 0) return;
        this.resultsStore.getRootNode().cascadeBy(function(node){
            if (!node.isRoot()){
                var matchedNode = null;
                if(lastNode == null){
                    lastNode = result.children[0];
                    lastNode.parent = result;
                    matchedNode = lastNode;
                }
                else{
                    if(lastNode.parent.children.length == 0){
                        var findNextNode = function(parent){

                        };

                        for(var i = 0;i<lastNode.parent.children.length;i++){
                            if(lastNode == lastNode.parent.children[i]){

                            }
                        }
                    }
                    else{
                        matchedNode = lastNode.children[0];
                        matchedNode.parent = lastNode;
                        lastNode = matchedNode;
                    }
                }

                node.set("result",matchedNode.result);
                node.set("status",matchedNode.status);
                node.set("parameters",matchedNode.parameters);
                node.set("error",matchedNode.error);
                node.set("screenshot",matchedNode.screenshot);
                node.set("trace",matchedNode.trace);
                if(matchedNode.expanded == true){
                    node.expand();
                }
                else{
                    node.collapse();
                }
            }
        });
        /*
        me.lastResult = {};
        var index = 0;
        this.resultsStore.getRootNode().cascadeBy(function(node){
            me.lastResult[index] = node.isExpanded();
            index++;
        });
        this.resultsStore.setRootNode({"text":".","children":result.children});
        this.down("#status").setValue(result.status);
        this.down("#result").setValue(result.result);
        index = 0;
        this.resultsStore.getRootNode().cascadeBy(function(node){
            if(me.lastResult[index] === true){
                node.expand();
            }
            index++;
        });
        */
    },

    initComponent: function () {
        var me = this;

        me.resultsStore =  Ext.create('Ext.data.TreeStore', {
            storeId: "Results"+this.itemId,
            idProperty: 'name',
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'actionid',     type: 'string'},
                {name: 'order',     type: 'string'},
                {name: 'paramvalue',     type: 'string'},
                {name: 'parameters',     type: 'array'},
                {name: 'result',     type: 'string'},
                {name: 'error',     type: 'string'},
                {name: 'trace',     type: 'string'},
                {name: 'screenshot',     type: 'string'},
                {name: 'status',     type: 'string'}
            ]
        });

        var transformed = me.dataRecord.testcase.children;

        me.resultsStore.setRootNode({"text":".","children":transformed });

        var resultsTree = Ext.create('Ext.tree.Panel', {
            rootVisible: false,
            store: me.resultsStore,
            cls:"x-redwood-alternative-tree-row-even x-redwood-alternative-tree-row-odd",
            height:700,
            //minHeight:1600,
            //managerHeight:true,
            //autoHeight: true,
            itemId:"resultsGrid",
            viewConfig: {
                markDirty: false,
                enableTextSelection: true
            },

            listeners:{
                afterrender: function(me){
                    me.resetHeight(me);
                    //me.getView().updateLayout();
                },
                load: function(me){
                    //me.resetHeight(me);
                    //me.getView().updateLayout();
                },
                itemexpand: function(me){
                    this.resetHeight(this);
                },
                itemcollapse: function(me){
                    this.resetHeight(this);
                }
            },

            resetHeight: function(cmp){
                setTimeout(function(){
                    var innerElement = cmp.getEl().down('table.x-grid-table');
                    if(innerElement){
                        var height = innerElement.getHeight();
                        if(height > 700){
                            cmp.setHeight(700);
                        }
                        else{
                            cmp.setHeight(height+50);
                        }

                        //var width = innerElement.getWidth();
                        //cmp.setWidth(width);
                    }
                }, 300);
            },

            multiSelect: false,
            columns: [
                {
                    header: 'Order',
                    width:40,
                    sortable: false,
                    dataIndex: 'order',
                    renderer: function(value,meta,record){
                        //return "<a style= 'color: blue;' href='javascript:openAction(&quot;"+ record.get("actionid") +"&quot;)'>" + value +"</a>";
                        if (record.get("parentId") == "root"){
                            return value;
                        }
                        else{
                            return "";
                        }
                    }
                },

                {
                    xtype: 'treecolumn',
                    header: 'Action Name',
                    //flex: 2,
                    width:300,
                    sortable: false,
                    dataIndex: 'name',
                    renderer: function(value,meta,record){
                        return "<a style= 'color: blue;' href='javascript:openAction(&quot;"+ record.get("actionid") +"&quot;)'>" + value +"</a>";
                    }
                },

                {
                    header: 'Parameters',
                    //flex: 2,
                    width:450,
                    sortable: false,
                    dataIndex: 'parameters',
                    renderer: function(value,meta,record){
                        if (!value) return "";
                        if (value.length == 0) return "";
                        var rows = "";
                        value.forEach(function(param){
                            rows += '<div style="display:table-row;">'+
                                    '<span style="display:table-cell; padding: 3px; border: 1px solid #8b8b8b; font-weight: bold;width:100px;white-space: normal;word-wrap: break-word;">'+param.paramname+'</span>'+
                                    '<span style="display:table-cell; padding: 3px; border: 1px solid #8b8b8b;width:250px;white-space: normal;word-wrap: break-word;">'+Ext.util.Format.htmlEncode(param.paramvalue)+'</span>'+
                                '</div>';
                        });
                        var table = '<div style="display:table;table-layout: fixed;width: 100%;">'+ rows +'</div>';

                        return table;
                    }
                    //dataIndex: 'paramvalue'
                },
                {
                    header: 'Status',
                    sortable: false,
                    dataIndex: 'status',
                    renderer: function (value, meta, record) {
                        if(record.get("host") && (value == "Running")){
                            return "<a style= 'color: blue;font-weight: bold;' href='javascript:vncToMachine(&quot;"+ record.get("host") +"&quot;,&quot;"+ record.get("vncport") +"&quot;)'>" + value +"</a>";
                        }
                        else if (value == "Finished"){
                            return "<p style='color:green;font-weight: bold;'>"+value+"</p>";
                        }
                        else if ( value == "Not Run"){
                            return "<p style='color:#ffb013;font-weight: bold;'>"+value+"</p>";
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
                            return "<p style='color:green;font-weight: bold;'>"+value+"</p>"
                        }
                        else if (value == "Failed"){
                            return "<p style='color:red;font-weight: bold;'>"+value+"</p>"
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
                        return "<p style='color:red;font-weight: bold;'>"+Ext.util.Format.htmlEncode(value)+"</p>";
                    }
                },
                {
                    header: 'Screen Shot',
                    dataIndex: "screenshot",
                    width:80,
                    renderer: function(value,meta,record){
                        meta.tdCls = 'x-redwood-results-cell';
                        if(value){
                            return "<a style= 'color: blue;' href='javascript:openScreenShot(&quot;"+ value +"&quot;)'>View</a>";
                        }
                        else{
                            return ""
                        }
                    }
                },
                {
                    header: 'Trace',
                    dataIndex: "trace",
                    flex:1,
                    //width: 800,
                    renderer: function(value,meta,record){
                        if(value == "") return;
                        var displayValue = "";
                        while(value.indexOf("&quot;NaN&quot;)'>&quot;") != -1){
                            var junk = value.indexOf("&quot;NaN&quot;)'>&quot;");
                            var endOfJunk = value.indexOf("&",junk+23);
                            var properValue = value.substring(junk+24,endOfJunk);
                            value = value.replace("&quot;NaN&quot;)'>&quot;"+properValue+"&quot;)'>","&quot;"+properValue+"&quot;)'>");
                            value = value.replace("</a></a>","</a>");
                        }
                        value.split("),").forEach(function(line){
                            if(line.indexOf("</a>")!= -1){
                                var lineArray = line.split("</a>");
                                if(lineArray.length > 2){
                                    lineArray.forEach(function(innerLine){
                                        if(innerLine.indexOf("<a") != -1){
                                            displayValue += "<p>"+innerLine.split("</a>")[0] + ",</p>";
                                        }
                                    })
                                }
                                else{
                                    displayValue += "<p>"+lineArray[0] + ",</p>";
                                }
                            }
                        });
                        //if python
                        if(value.indexOf("Traceback") == 0){
                            value.split("File ").forEach(function(line,index){
                                if(index > 0){
                                    var filePath = "";
                                    if(line.indexOf("/src/") != -1){
                                        filePath = line.substring(line.indexOf("/src/"),line.indexOf(",")-1);
                                    }
                                    else if (line.indexOf("\\src\\") != -1){
                                        filePath = line.substring(line.indexOf("\\src\\"),line.indexOf(",")-1);
                                    }
                                    else{
                                        return
                                    }

                                    var pathLink = filePath.replace(/\\/g,"/");
                                    var lineNumber = line.split(",")[1].split(" ")[2];
                                    pathLink = '<p><a style="color: blue;" href="javascript:openScript(\''+pathLink+'\',\''+ (parseInt(lineNumber) - 1).toString() +'\')">' + filePath+'</a></p>';

                                    displayValue += line.replace(filePath,pathLink);
                                }
                            });
                            //displayValue += "adfdsa";
                        }
                        displayValue += '<p><a style="color: blue;" href="javascript:openDetailedTrace(\''+record.internalId+'\')">Full Trace...</a></p>';
                        meta.tdCls = 'x-redwood-results-cell';
                        return "<p>"+displayValue+"</p>"
                    }
                }
            ]
        });

        this.logStore =  Ext.create('Ext.data.Store', {
            autoLoad: true,
            storeId: "ResultLogs"+this.itemId,
            idProperty: '_id',
            proxy: {
                type: 'rest',
                url: '/resultslogs/'+me.itemId,
                reader: {
                    type: 'json',
                    root: 'logs',
                    successProperty: 'success'
                }
            },
            fields: [
                {name: 'actionName',     type: 'string'},
                {name: 'message',     type: 'string'},
                {name: 'date',     type: 'date'}
            ],
            sorters: [{
                property : 'date',
                direction: 'ASC'
            }]
            //data:[]
        });

        //this.logStore.
        /*
        me.dataRecord.logs.forEach(function(log){
            //var timestamp = log._id.substring(0,8);
            me.logStore.add({message:log.message,actionName:log.actionName,date:log.date});
            //logStore.add({message:log.message,actionName:log.actionName,date:new Date( parseInt( timestamp, 16 ) * 1000 )})
        });
        */

        var logGrid = Ext.create('Ext.grid.Panel', {
            store: me.logStore,
            itemId:"executionLogs",
            selType: 'rowmodel',
            height:500,
            overflowY: 'auto',
            viewConfig: {
                markDirty: false,
                enableTextSelection: true
            },
            plugins: [
                "bufferedrenderer"],
            columns:[
                {
                    header: 'Action Name',
                    dataIndex: 'actionName',
                    width: 200
                },
                {
                    xtype:"datecolumn",
                    format:'m/d h:i:s:ms',
                    header: 'Date',
                    dataIndex: 'date',
                    width: 120
                },
                {
                    header: 'Message',
                    dataIndex: 'message',
                    flex: 1,
                    renderer: function(value,meta,record){
                        meta.tdCls = 'x-redwood-results-cell';
                        return "<p>"+value+"</p>"
                    }
                }

            ]

        });

        var screenShots = Ext.create('Ext.panel.Panel', {
            layout: 'card',
            height:400,
            bodyStyle: 'padding:15px',
            itemId:"screenShots",
            defaults: {
                // applied to each contained panel
                border: false
            },
            addNewScreenShot: function(node){
                var html;
                if(node.getPath){
                    var path = node.getPath("name");
                    path = path.substring(2,path.length);
                    html = "<h1>"+path+"</h1>";
                    html = html + '<p><a href="javascript:openScreenShot(&quot;'+ node.get("screenshot") +'&quot;)"><img src="'+location.protocol + "//" + location.host +"/screenshots/"+node.get("screenshot") +'" height="360"></a></p>';
                    screenShots.add({
                        node: node,
                        html: html
                    })
                }
                else{
                    html = '<p><a href="javascript:openScreenShot(&quot;'+ node +'&quot;)"><img src="'+location.protocol + "//" + location.host +"/screenshots/"+node +'" height="360"></a></p>';
                    screenShots.add({
                        node: null,
                        html: html
                    })
                }
            },
            tbar: [
                {
                    itemId: 'move-prev',
                    text: 'Back',
                    handler: function(btn) {
                        if(screenShots.getLayout().getPrev()){
                            me.lastScrollPos = me.getEl().dom.children[0].scrollTop;
                            screenShots.getLayout().prev();
                            resultsTree.getSelectionModel().select(screenShots.getLayout().getActiveItem().node);
                            me.getEl().dom.children[0].scrollTop = me.lastScrollPos;
                        }
                    }
                },
                '->', // greedy spacer so that the buttons are aligned to each side
                {
                    itemId: 'move-next',
                    text: 'Next',
                    handler: function(btn) {
                        if(screenShots.getLayout().getNext()){
                            me.lastScrollPos = me.getEl().dom.children[0].scrollTop;
                            screenShots.getLayout().next();
                            resultsTree.getSelectionModel().select(screenShots.getLayout().getActiveItem().node);
                            me.getEl().dom.children[0].scrollTop = me.lastScrollPos;
                        }
                        //screenShots.add({
                            //id: 'card-2',
                        //    html: '<h1>HAHAHAHAHAHAHAH!</h1><p>Step 3 of 3 - Complete</p>'
                        //})
                    }
                }
            ],
            items: []
            //renderTo: Ext.getBody()
        });

        this.resultsStore.getRootNode().cascadeBy(function(node){
            if(!node.isRoot()){
                if(node.get("screenshot")){
                    screenShots.addNewScreenShot(node);
                }
            }
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
                        value:"<a style= 'color:font-weight:bold;blue;' href='javascript:openTestCase(&quot;"+ me.dataRecord.testcase.testcaseID +"&quot;)'>" + me.dataRecord.testcase.name +"</a>",
                        anchor:'90%'
                    },
                    {
                        fieldLabel: 'Status',
                        labelStyle: "font-weight: bold",
                        itemId:"status",
                        value:me.dataRecord.testcase.status,
                        anchor:'90%',
                        renderer: function (value) {
                            if(value == "Running"){
                                //return "<a style= 'color:font-weight:bold;blue;' href='javascript:vncToMachine(&quot;"+ record.get("host") +"&quot;)'>" + value +"</a>";
                                return "<p style='font-weight:bold;color:blue'>"+value+"</p>"
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
                    },
                    {
                        fieldLabel: "Error",
                        labelStyle: "font-weight: bold",
                        hidden: true,
                        maxWidth: 500,
                        itemId:"error",
                        value:me.dataRecord.testcase.error,
                        anchor:'90%',
                        renderer: function(value,field){
                            return "<p style='font-weight:bold;color:red'>"+Ext.util.Format.htmlEncode(value)+"</p>"
                        }
                    },
                    {
                        fieldLabel: "Trace",
                        labelStyle: "font-weight: bold",
                        hidden: true,
                        itemId:"trace",
                        //maxWidth: 500,
                        minWidth:300,
                        value:me.dataRecord.testcase.trace,
                        anchor:'90%',
                        renderer: function(value){
                            var displayValue = "";
                            if(value.indexOf("Traceback") == 0){
                                value.split("File ").forEach(function(line,index){
                                    if(index > 0){
                                        var filePath = "";
                                        if(line.indexOf("/src/") != -1){
                                            filePath = line.substring(line.indexOf("/src/"),line.indexOf(",")-1);
                                        }
                                        else if (line.indexOf("\\src\\") != -1){
                                            filePath = line.substring(line.indexOf("\\src\\"),line.indexOf(",")-1);
                                        }
                                        else{
                                            displayValue += line;
                                        }

                                        var pathLink = filePath.replace(/\\/g,"/");
                                        var lineNumber = line.split(",")[1].split(" ")[2];
                                        pathLink = '<p><a style="color: blue;" href="javascript:openScript(\''+pathLink+'\',\''+ (parseInt(lineNumber) - 1).toString() +'\')">' + filePath+'</a></p>';

                                        displayValue += line.replace(filePath,pathLink);
                                    }
                                });
                                return displayValue;
                                //displayValue += "adfdsa";
                            }
                        }
                    }

                ]
            },
            {
                xtype: 'fieldset',
                title: 'Screen Shots',
                flex: 1,
                type: 'hbox',
                itemId:"screenShotsPanel",
                //minHeight:600,
                constrainAlign: true,
                collapsible: true,
                //collapsed: true,
                defaults: {
                    flex: 1
                },
                items:[
                    screenShots
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Results',
                itemId:"results",
                flex: 1,
                type: 'hbox',
                //minHeight:600,
                constrainAlign: true,
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
                itemId:"logs",
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
        setTimeout(function(){me.down("#screenShotsPanel").collapse();},100);

    }

});