var adminStore = Ext.create('Ext.data.TreeStore', {
    root: {
        expanded: true,
        children: [
            { text: "Users", leaf: true,icon:"images/user_go.png" },
            { text: "Projects", leaf: true,icon:"images/project.png" },
            { text: "Email", leaf: true,icon:"images/e-mail.png" }//,
            //{ text: "License", leaf: true,icon:"images/pc.png" }
        ]
    }
});

var executionStore = Ext.create('Ext.data.TreeStore', {
    root: {
        expanded: true,
        children: [
            { text: "Executions", leaf: true,icon:"images/user_go.png" },
            { text: "Test Sets", leaf: true,icon:"images/project.png" },
            { text: "Variables", leaf: true },
            { text: "Machines", leaf: true,icon:"images/pc.png" }
            //{ text: "Cloud", leaf: true,icon:"images/cloud.png" }
        ]
    }
});

Ext.define('Redwood.view.Viewport', {
    extend: 'Ext.container.Viewport',

    layout: 'border',
    id: "mainViewport",
    style: {height:"100%"},
    listeners:{
        afterrender: function(me){
            me.insert(0,{
                xtype:"panel",
                region:"north",
                height: "22px",
                bodyStyle: { background: '#DDE0E4'},
                tbar: {
                    xtype: 'toolbar',
                    style: { background: '#DDE0E4'},
                    dock: 'top',
                    items:[
                        {
                            xtype:"box",
                            html: '<a href="http://www.redwoodhq.com" target="blank"><img border="0" width="80" height="auto" style="margin:0 auto;" src="../images/rwhq.png" alt="RedwoodHQ logo"></a>'
                        },"","",
                        {
                            xtype:"box",
                            html: '<a href="/agentsetup/Agent_RedwoodHQ_Setup.exe" style="color:blue">Download Agent</a>'
                        },
                        "->",
                        {
                            xtype:"button",
                            icon: 'images/help.png',
                            tooltip: "Go to help page.",
                            handler: function(){
                                window.open ("http://www.manula.com/manuals/primatest/redwoodhq/2.0/en/topic/documentation");
                            }

                        },{
                            xtype:"button",
                            icon: 'images/earth2.png',
                            tooltip: "Notifications",
                            arrowCls:"",
                            hidden: true,
                            menu: {
                                xtype:"menu",
                                plain:true,
                                items:[
                                    {
                                        xtype:"panel",
                                        html: "asdfsdfds"
                                    }
                                ]
                            },
                            afterRender : function(){
                                var me = this;
                                this.customMenu = Ext.create('Ext.Component', {
                                    cls:"x-redwood-noti_bubble",
                                    html:"5",
                                    id: "notiBubble",
                                    renderTo: me.getEl(),
                                    floating: true
                                });
                                this.customMenu.anchorTo(this.getEl(), 'r-r', [-5, 0]);
                            },
                            handler: function(){
                            }

                        },
                        "",
                        {
                            xtype:"button",
                            icon: 'images/talk.png',
                            tooltip: "Notifications",
                            arrowCls:"",
                            hidden: true,
                            menu: {
                                xtype:"menu",
                                plain:true,
                                showSeparator: false,

                                items:[
                                    {
                                        text:"User Name",
                                        //xtype:"panel",
                                        //html: "asdfsdfds",
                                        menu:{
                                            plain:true,
                                            width:24,
                                            showSeparator: false,
                                            //floating: false,
                                            items:[
                                                {
                                                    disabled: true,
                                                    text:"Share"
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            xtype:"combo",
                            store: Ext.data.StoreManager.lookup('Projects'),
                            queryMode: 'local',
                            displayField: 'name',
                            valueField: 'name',
                            itemID: "projectSelection",
                            fieldLabel:"Choose Project",
                            labelStyle: "font-weight: bold",
                            width: 350,
                            forceSelection: true,
                            editable: false,
                            listeners:{
                                afterrender: function(me){
                                    var project = Ext.util.Cookies.get("project");
                                    me.getStore().on("load",function(store,records){
                                        me.internalSelect = true;
                                        records.forEach(function(record){
                                            if (record.get("name") === project){
                                                me.setValue(record);
                                            }
                                        });
                                        me.internalSelect = false;
                                    });

                                },
                                change: function(me,value,oldValue){
                                    if ( me.internalSelect === true) return;
                                    Ext.Msg.show({
                                        title:'Project Change Confirmation',
                                        msg: 'Are you sure you want to change project?<br>Please note that all unsaved changes will be lost.',
                                        buttons: Ext.Msg.YESNO,
                                        icon: Ext.Msg.QUESTION,
                                        fn: function(id){
                                            if (id == "yes"){
                                                window.history.replaceState("", "", '/index.html');
                                                Ext.util.Cookies.set("project",value);
                                                window.location.reload(true);
                                            }
                                            else{
                                                me.internalSelect = true;
                                                me.setValue(oldValue);
                                                me.internalSelect = false;
                                            }
                                        }
                                    });


                                }
                            }
                        },
                        "-",
                        {
                            xtype:"button",
                            text: Ext.util.Cookies.get("username",""),
                            arrowAlign: 'right',
                            menu:{
                                plain:true,
                                items:[
                                    {
                                        text: 'SSH Key',
                                        handler: function(){
                                            var win = Ext.create('Redwood.view.SSHKeyView',{});
                                            win.show();
                                        }
                                    },
                                    {
                                        text: 'Logout',
                                        handler : function() {
                                            Ext.Msg.show({
                                                title:'Logout Confirmation',
                                                msg: 'Are you sure you want to logout?<br>Please note that all unsaved changes will be lost.',
                                                buttons: Ext.Msg.YESNO,
                                                icon: Ext.Msg.QUESTION,
                                                fn: function(id){
                                                    if (id == "yes"){
                                                        Ext.util.Cookies.set("sessionid","");
                                                        window.location.reload(true);
                                                    }
                                                }
                                            });

                                        }
                                    }
                                ]

                            }
                        }
                    ]

                }
            });
        }
    },
    items: [
        {
        xtype: 'tabpanel',
        itemId: 'mainTabPanel',
        region: "center",
        ui: "blue-tab",
        listeners:{
            tabchange: function(me,tab){
                if (tab.id == "testcasesBrowser"){
                    if ((tab.down("tabpanel").getActiveTab() != null) && (tab.down("tabpanel").getActiveTab().dataRecord != null)){
                        window.history.replaceState("", "", '/index.html?testcase='+tab.down("tabpanel").getActiveTab().dataRecord.get("_id")+"&project="+Ext.util.Cookies.get('project'));
                    }
                    else{
                        window.history.replaceState("", "", '/index.html');
                    }
                }
                else if (tab.id == "actionsBrowser"){
                    if ((tab.down("tabpanel").getActiveTab() != null) && (tab.down("tabpanel").getActiveTab().dataRecord != null)){
                        window.history.replaceState("", "", '/index.html?action='+tab.down("tabpanel").getActiveTab().dataRecord.get("_id")+"&project="+Ext.util.Cookies.get('project'));
                    }
                    else{
                        window.history.replaceState("", "", '/index.html');
                    }
                }
                else if (tab.itemId == "executionTab"){
                    var activeSelection = tab.down("tabpanel").getActiveTab();
                    //return;
                    if (activeSelection.itemId == "Executions"){
                        var activeTab = this.down("#executionsTab");
                        activeTab.setURLs();
                    }
                    else{
                        window.history.replaceState("", "", '/index.html');
                    }
                }
                else{
                    window.history.replaceState("", "", '/index.html');
                }

            }
        },
        items: [
            {
                xtype: 'panel',
                layout: 'border',
                title: 'Execution',
                itemId: "executionTab",

                items: [
                    {
                        region: 'west',
                        split:true,
                        xtype: 'treepanel',
                        itemId: "executionPanel",
                        collapseDirection: "left",
                        collapsible: true,
                        multiSelect: false,
                        rootVisible: false,
                        store: executionStore,
                        width: 150,
                        focused: true,
                        listeners:{
                            itemclick: function(me,record,item,index,evt,eOpts){
                                me.up("#executionTab").down("tabpanel").setActiveTab(record.get("text").replace(" ",""));
                            }
                        }
                    },
                    {
                        xtype:"tabpanel",
                        region: "center",
                        //autoScroll: true,
                        listeners:{
                            afterrender: function(me){
                                me.tabBar.setVisible(false);
                                me.setActiveTab("Executions");
                            },
                            tabchange: function(me,tab){
                                if(me.getActiveTab().itemId != "Executions"){
                                    window.history.replaceState("", "", '/index.html');
                                }
                                else{
                                    me.getActiveTab().down("#executionsTab").setURLs();
                                }
                            }
                        },
                        items:[

                            {
                                xtype: "executionsEditor",
                                title: "Executions",
                                itemId: "Executions"
                            },

                            {
                                xtype: "testsetsEditor",
                                title: "Test Sets",
                                itemId: "TestSets"
                            },
                            {
                                xtype: "variablesEditor",
                                itemId: "Variables"
                            },
                            {
                                xtype: "machinesEditor",
                                itemId: "Machines"
                            },
                            {
                                xtype: "cloudView",
                                itemId: "Cloud"
                            }
                        ]
                    }
                ],

                listeners:{
                    afterrender: function(me){
                        var treePanel = me.down("#executionPanel");
                        treePanel.getSelectionModel().select(treePanel.getRootNode().getChildAt(0));
                    }
                }
            },
            {
                xtype: "testcases"
            },
            {
                xtype: "actions"
            },
            {
                xtype: 'scriptBrowser'
            },
            {

                xtype: 'panel',
                layout: 'border',
                title: 'Settings',
                itemId: "adminTab",

                items: [
                    {
                        region: 'west',
                        split:true,
                        xtype: 'treepanel',
                        collapseDirection: "left",
                        collapsible: true,
                        multiSelect: false,
                        rootVisible: false,
                        store: adminStore,
                        width: 150,
                        focused: true,
                        listeners:{
                            itemclick: function(me,record,item,index,evt,eOpts){
                                me.up("#adminTab").down("tabpanel").setActiveTab(record.get("text"));
                            }
                        }
                    },
                    {
                        xtype:"tabpanel",
                        region: "center",
                        autoScroll: true,
                        listeners:{
                            afterrender: function(me){
                                me.tabBar.setVisible(false);
                                me.setActiveTab("Users");
                            }
                        },
                        items:[

                            {
                                xtype: "usersEditor",
                                itemId: "Users"
                            }
                            ,
                            {
                                xtype: "projectsEditor",
                                itemId: "Projects"
                            } ,
                            {
                                xtype: "licenseEditor",
                                itemId: "License"
                            },
                            {
                                xtype: "emailSettings",
                                itemId: "Email"
                            }
                        ]
                    }
                ],

                listeners:{
                    afterrender: function(me){
                        var treePanel = me.down("treepanel");
                        treePanel.getSelectionModel().select(treePanel.getRootNode().getChildAt(0));
                    }
                }
            }
        ]
    }]


});