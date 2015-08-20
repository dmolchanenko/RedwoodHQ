var pushAction = Ext.create('Ext.Action', {
    icon: 'images/install.png',
    tooltip: "Push Changes to Master Branch",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('pushChanges');
    }
});

var recordImageAction = Ext.create('Ext.Action', {
    icon: 'images/media_record.png',
    tooltip: "Record Image From Desktop",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('recordImage');
    }
});

var uploadFiles = Ext.create('Ext.Action', {
    icon: 'images/uploadFolders.png',
    tooltip: "Upload multiple directories and files.",
    //margin: "0 3 0 3",
    text:"Upload Directories",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('uploadFiles');
    }
});

var runPip = Ext.create('Ext.Action', {
    icon: 'images/python.png',
    tooltip: "Run pip install against current requirement file.",
    text:"Run Pip Install",
    itemId: "runPip",
    visible: false,

    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('runPip');
    }
});

var recordStepsAction = Ext.create('Ext.Action', {
    icon: 'images/media_record.png',
    tooltip: "Start Looking Glass Utility",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('recordSteps');
    }
});

var shareScriptAction = Ext.create('Ext.Action', {
    icon: 'images/share.png',
    tooltip: "Collaborate with another user.",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        var tab = this.up('scriptBrowser').down("#scriptstab").getActiveTab();
        if(tab){
            Redwood.app.getController("Collaboration").onShareScript(tab);
        }
        else{
            Ext.Msg.alert('Error', "Please open script you want to share.");
        }

    }
});

var pullAction = Ext.create('Ext.Action', {
    icon: 'images/uninstall.png',
    tooltip: "Pull Latest Changes From Master Branch",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('pullChanges');
    }
});

var copyAction = Ext.create('Ext.Action', {
    icon: 'images/page_copy.png',
    tooltip: "Copy File/Folder",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('copy');
    }
});


var uploadActionHidden = Ext.create('Ext.form.field.File', {
    name:"file",
    itemId:"uploadFileName",
    listeners: {
        change: function(me,value){
            Ext.getCmp("ScriptBrowser").fireEvent("uploadFile",me.up("form"));
        }
    }
});

var uploadForm = Ext.create('Ext.form.Panel', {
    renderTo: Ext.getBody(),
    standardSubmit : false,
    hidden: true,
    items: [uploadActionHidden,
        {xtype:"textfield",
            name:"destDir",
        itemId:"destDir"}
    ]
});


var uploadAction = Ext.create('Ext.Action', {
    icon: 'images/upload.png',
    tooltip: "Upload File",
    text:"Upload",
    handler: function(widget, event) {
        //uploadActionHidden.handler.call(uploadActionHidden.scope, uploadActionHidden, Ext.EventObject)
        uploadActionHidden.fileInputEl.dom.click();
    }
});

var importAllTCsAction = Ext.create('Ext.Action', {
    tooltip: "Import TestNG/Junit Test Cases.",
    text:"Import Test Cases",
    icon: 'images/import.png',
    handler: function(widget, event) {
        Redwood.app.getController("Scripts").onImportAllTCs();
    }
});

var runTCAction = Ext.create('Ext.Action', {
    tooltip: "Run TestNG/Junit Test Case in opened script.",
    icon: 'images/play.png',
    id:"runUnitTest",
    //hidden:true,
    handler: function(widget, event) {
        if(widget.icon == 'images/play.png'){
            Redwood.app.getController("Scripts").onRunTC();
        }
        else{
            Redwood.app.getController("Scripts").onStopTC();
            widget.setIcon('images/play.png');
        }
    }
});




var findPrev = Ext.create('Ext.Action', {
    icon: 'images/arrow_up.png',
    tooltip: "Find Previous",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('findPrev');
    }
});


var findNext = Ext.create('Ext.Action', {
    icon: 'images/arrow_down.png',
    tooltip: "Find Next",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('findNext');
    }
});

var findText = Ext.create('Ext.form.field.Trigger', {
    id:"findTextField",
    width: 240,
    margin: "0 3 0 3",
    emptyText: 'find text',
    trigger1Cls: Ext.baseCSSPrefix + 'form-clear-trigger',
    onTrigger1Click: function(){
        this.setValue("");
        this.focus();
    },
    listeners: {
        afterrender: function(me){
            me.triggerCell.item(0).setDisplayed(false);
        },
        change: function(me,newVal,oldVal){
            if (me.getValue() == ""){
                me.triggerCell.item(0).setDisplayed(false);
            }
            else{
                me.triggerCell.item(0).setDisplayed(true);
            }
            this.up('scriptBrowser').fireEvent('find');
        },
        specialkey: function(field, e){
            if (e.getKey() == e.ENTER) {
                if (this.getValue() != ""){
                    this.up('scriptBrowser').fireEvent('findNext');
                }
            }
        }
    }
});

var regExpression = Ext.create('Ext.form.field.Checkbox', {
    id:"searchRegex",
    boxLabel: "Regex",
    style: "font-size: 11px;",
    listeners:{
        change: function(){
            this.up('scriptBrowser').fireEvent('find');
        }
    }
});

var caseSensitive = Ext.create('Ext.form.field.Checkbox', {
    id:"searchCase",
    boxLabel: "Case",
    style: "font-size: 11px;",
    listeners:{
        change: function(){
            this.up('scriptBrowser').fireEvent('find');
        }
    }
});

var replaceText = Ext.create('Ext.form.field.Text', {
    id:"replaceTextField",
    margin: "0 3 0 0",
    width:"240px",
    emptyText:"replace text"
});

var replaceAction = Ext.create('Ext.Button', {
    text: "Replace",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('replace');
    }
});

var replaceAllAction = Ext.create('Ext.Button', {
    text: "Replace All",
    margin: "0 3 0 0",
    style: "border-style:solid;border-width:1px;",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('replaceAll');
    }
});


var terminalAction = Ext.create('Ext.Action', {
    icon: 'images/terminal.png',
    tooltip: "Open terminal",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('terminal');
    }
});

var pasteAction = Ext.create('Ext.Action', {
    icon: 'images/paste_plain.png',
    itemId: "pasteBar",
    tooltip: "Paste File/Folder",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('paste');
    }
});

var newScriptAction = Ext.create('Ext.Action', {
    icon: 'images/page_add.png',
    text: 'File',
    itemId: "newScript",
    tooltip: "New File",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('newScript',"script");
    }
});

var newGroovyScriptAction = Ext.create('Ext.Action', {
    icon: 'images/fileTypeGroovy.png',
    text: 'Groovy Action',
    tooltip: "New Groovy Action",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('newScript',"groovyAction");
    }
});

var newPythonScriptAction = Ext.create('Ext.Action', {
    icon: 'images/python.png',
    text: 'Python Action',
    tooltip: "New Python Action",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('newScript',"pythonAction");
    }
});

var newCSharpScriptAction = Ext.create('Ext.Action', {
    icon: 'images/csharp.png',
    text: 'C# Action',
    tooltip: "New C# Action",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('newScript',"csharpAction");
    }
});

var newJavaScriptAction = Ext.create('Ext.Action', {
    icon: 'images/fileTypeJava.png',
    text: 'Java Action',
    tooltip: "New Java Action",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('newScript',"javaAction");
    }
});

var newFolderAction = Ext.create('Ext.Action', {
    icon: 'images/folder.gif',
    text: 'Folder',
    itemId: "newFolder",
    tooltip: "New Folder",
    handler: function(widget, event) {
        var editor = this.up('scriptBrowser');
        if (editor == undefined){
            editor = this.up('#treeContext').scriptEditor;
        }
        editor.fireEvent('newFolder');
    }
});

var saveScriptAction = Ext.create('Ext.Action', {
    icon: 'images/saveAll.png',
    //text: '',
    disabled: false,
    tooltip: "Save All",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.setDisabled(true);
        var me = this;
        this.up('scriptBrowser').fireEvent('saveAll',function(){
            me.setDisabled(false);
        });
    }
});

var deleteMenuAction = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    text: 'Delete',
    itemId: "deleteMenu",
    //tooltip: "Delete",
    handler: function(widget, event) {
        this.up('menu').scriptEditor.fireEvent('deleteScript');
    }
});

var copyMenuAction = Ext.create('Ext.Action', {
    icon: 'images/page_copy.png',
    itemId: "copyMenu",
    text: 'Copy',
    handler: function(widget, event) {
        this.up('menu').scriptEditor.fireEvent('copy');
    }
});

var pasteMenuAction = Ext.create('Ext.Action', {
    icon: 'images/paste_plain.png',
    itemId: "pasteMenu",
    text: 'Paste',
    handler: function(widget, event) {
        this.up('menu').scriptEditor.fireEvent('paste');
    }
});

var deleteScriptAction = Ext.create('Ext.Action', {
    icon: 'images/delete.png',
    //text: 'Delete',
    itemId: "deleteBar",
    tooltip: "Delete",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        this.up('scriptBrowser').fireEvent('deleteScript');
    }
});

var compileAction = Ext.create('Ext.Action', {
    icon: 'images/compile.png',
    //text: 'Delete',
    itemId: "compileBar",
    tooltip: "Build Scripts",
    margin: "0 3 0 3",
    handler: function(widget, event) {
        var me = this;
        this.up('scriptBrowser').fireEvent('saveAll',function(){
            me.up('scriptBrowser').fireEvent('compile');
        });
    }
});

var newMenuItem = Ext.create('Ext.Action', {
    itemId:"newItemsBar",
    text: "New",
    iconCls: 'icon-add',
    menu: new Ext.menu.Menu({
        items: [
            newJavaScriptAction,
            newGroovyScriptAction,
            newPythonScriptAction,
            newCSharpScriptAction,
            newScriptAction,
            newFolderAction,
            uploadAction,
            uploadFiles
        ]
    })
});

var newItemButton = Ext.create('Ext.button.Split',{
    text: "New",
    itemId:"newItemsMenu",
    iconCls: 'icon-add',
    handler: function(){
        this.showMenu();
    },
    menu: new Ext.menu.Menu({
        items: [
            newJavaScriptAction,
            newGroovyScriptAction,
            newPythonScriptAction,
            newScriptAction,
            newFolderAction,
            uploadAction,
            uploadFiles
        ]
    })
});

var importTCButton = Ext.create('Ext.button.Split',{
    text: "Import Test Cases",
    itemId:"importTCMenu",
    icon: 'images/import.png',
    handler: function(){
        this.showMenu();
    },
    menu: new Ext.menu.Menu({
        items: [
            importAllTCsAction
        ]
    })
});


var renameMenuAction = Ext.create('Ext.Action', {
    text: "Rename",
    itemId: "renameMenu",
    handler: function(widget, event) {
        this.up('menu').scriptEditor.fireEvent('rename');
    }
});

var contextMenu = Ext.create('Ext.menu.Menu', {
    itemId:"treeContext",
    items: [
        //runPip,
        newMenuItem,
        {xtype: 'menuseparator'},
        deleteMenuAction,
        renameMenuAction,
        {xtype: 'menuseparator'},
        copyMenuAction,
        pasteMenuAction
    ],
    listeners:{
        beforeshow: function(me){
            var selection = me.treePanel.getSelectionModel().getSelection();
            if (me.treePanel.getSelectionModel().getSelection().length == 1){
                me.down("#renameMenu").setDisabled(false);
            }
            else{
                me.down("#renameMenu").setDisabled(true);
            }
            var foundRootItem = false;
            selection.forEach(function(node){
                if (node.parentNode.isRoot() == true){
                    me.down("#renameMenu").setDisabled(true);
                    me.down("#deleteMenu").setDisabled(true);
                    me.down("#copyMenu").setDisabled(true);
                    if (node.get("fileType")=="libs"){
                        me.down("#newFolder").setDisabled(true);
                        me.down("#newScript").setDisabled(true);
                    }
                    var pipReqFilePath = "/"+Ext.util.Cookies.get("username")+"/PipRequirements";
                    if(node.get("fullpath").indexOf(pipReqFilePath) == node.get("fullpath").length -pipReqFilePath.length){
                        //me.down("#runPip").setVisible(true);
                    }
                    else{
                        //me.down("#runPip").setVisible(false);
                    }
                    foundRootItem = true;
                }
            });

            if (foundRootItem == false){
                me.down("#newFolder").setDisabled(false);
                me.down("#newScript").setDisabled(false);
                me.down("#renameMenu").setDisabled(false);
                me.down("#deleteMenu").setDisabled(false);
                me.down("#copyMenu").setDisabled(false);
            }
            //

        }
    }
});


Ext.define('Redwood.view.ScriptBrowser', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.scriptBrowser',
    id: "ScriptBrowser",
    title: "Scripts",

    layout: 'fit',
    listeners:{
        show: function(panel){
            var tab = panel.down("#scriptstab").getActiveTab();
            if(tab) {
                setTimeout(function(){tab.focus();},100);
            }
        },
        afterrender:function(){
            this.setHeight(this.findParentByType('viewport').getHeight()-27);
        }
    },

    initComponent: function () {
        var scriptEditor = this;
        var versionControlStore = Ext.create('Ext.data.Store', {
            autoLoad: false,
            storeId: "VersionControl",
            idProperty: 'version',
            proxy: {
                type: 'ajax',
                actionMethods: {
                    read: 'POST'
                },
                timeout : 240000,
                url: '/versioncontrolhistory',
                reader: {
                    type: 'json',
                    root: 'history',
                    successProperty: 'success'
                },
                paramsAsJson:true
            },
            fields: [
                {name: 'version',     type: 'string'},
                {name: 'author',     type: 'string'},
                {name: 'commitMessage',     type: 'string'},
                {name: 'masterMatch',     type: 'boolean'},
                {name: 'date',     type: 'date'}
            ],
            sorters: [{
                property : 'date',
                direction: 'DESC'
            }]
            //data:[]
        });

        var scriptView = Ext.create('Ext.Panel', {
            layout: 'border',

            items: [

                {
                    region: "south",
                    split: true,
                    itemId: "outputPanel",
                    id: "scriptOutputPanel",
                    xtype: "panel",
                    height: 200,
                    collapseDirection:"down",
                    collapsible: true,
                    readOnly: true,
                    //title: "Output",
                    collapsed: true,
                    layout: 'fit',
                    items:[
                        {
                            xtype:"tabpanel",
                            ui: "red-tab",
                            tabPosition:"bottom",
                            items:[
                                {
                                    xtype: "box",
                                    autoScroll:true,
                                    title: "Output",
                                    itemId: "compileOutput",
                                    anchor: '100%'
                                },
                                {
                                    xtype: "grid",
                                    autoScroll:true,
                                    title: "Version Control",
                                    itemId: "versionControl",
                                    anchor: '100%',
                                    selType: 'rowmodel',
                                    viewConfig: {
                                        markDirty: false
                                    },
                                    flex: 1,
                                    overflowY: 'auto',
                                    header: 'Name',
                                    dataIndex: 'name',
                                    store: versionControlStore,
                                    lastTab:null,
                                    listeners:{
                                        celldblclick: function(me,td,cell,record){
                                            scriptEditor.fireEvent('scriptVersionDiff',me.up("scriptBrowser").down("#scriptstab").getActiveTab().node, record.get("version"));
                                        }
                                    },
                                    columns:[
                                        {
                                            header: 'Version',
                                            dataIndex: 'version',
                                            width: 200
                                        },
                                        {
                                            header: 'Date',
                                            dataIndex: 'date',
                                            width: 200
                                        },
                                        {
                                            header: 'Author',
                                            dataIndex: 'author',
                                            width: 200
                                        },
                                        {
                                            header: 'Commit Message',
                                            dataIndex: 'commitMessage',
                                            width: 200
                                        },
                                        {
                                            header: 'Exists in Master',
                                            dataIndex: 'masterMatch',
                                            width: 100,
                                            renderer: function(value,meta){
                                                if(value == true){
                                                    meta.style = 'background-image: url(images/online.png);background-position: center; background-repeat: no-repeat;';
                                                    meta.tdAttr = 'data-qtip="Exists in Master"';
                                                }
                                                else{
                                                    meta.style = 'background-image: url(images/offline.png);background-position: center; background-repeat: no-repeat;';
                                                    meta.tdAttr = 'data-qtip="Does not exist in Master"';
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'actioncolumn',
                                            width: 30,
                                            items: [
                                                {
                                                    icon: 'images/edit-diff-icon.png',
                                                    tooltip: 'Diff',
                                                    handler: function(grid, rowIndex, colIndex) {
                                                        scriptEditor.fireEvent('scriptVersionDiff',grid.up("scriptBrowser").down("#scriptstab").getActiveTab().node, grid.store.getAt(rowIndex).get("version"));
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }

                    ]
                },
                {
                    region: 'west',
                    split:true,
                    xtype: 'treepanel',
                    collapseDirection: "left",
                    collapsible: true,
                    title: 'Scripts',
                    multiSelect: true,
                    rootVisible: false,
                    id:"scriptsTree",
                    store: Ext.data.StoreManager.lookup('Scripts'),
                    width: 150,
                    focused: false,
                    viewConfig: {
                        markDirty: false,
                        stripeRows: true,
                        preserveScrollOnRefresh:true,
                        onRowDeselect: function(rowIdx){
                            this.removeRowCls(rowIdx,"x-redwood-tree-unfocused");
                            this.removeRowCls(rowIdx, this.selectedItemCls);
                            this.removeRowCls(rowIdx, this.focusedItemCls);
                        },
                        listeners: {
                            itemcontextmenu: function(view, rec, node, index, e) {
                                e.stopEvent();
                                view.getSelectionModel().select(rec);
                                contextMenu.treePanel = view;
                                contextMenu.scriptEditor = scriptEditor;
                                contextMenu.showAt(e.getXY());
                                return false;
                            }
                        }
                    },
                    listeners: {
                        afterrender: function(me){
                            me.el.on("click",function(){
                                me.getView().focus();
                            });
                        },
                        itemdblclick: function(me,record,item,index,evt,eOpts){
                            if (record.get("fileType") === "file"){
                                scriptEditor.fireEvent('scriptEdit', record);
                            }
                            else if(record.get("fileType") === "image"){
                                scriptEditor.fireEvent('imageEdit', record);
                            }
                        },
                        load: function(){
                            this.getSelectionModel().select(this.getRootNode().getChildAt(0));
                        },
                        itemclick: function(me,record,item,index,evt,eOpts){
                            //console.log(evt)
                        },
                        selectionchange: function(model,selected,eOpts){
                            if ((selected.length === 0)||(selected.length > 1)){
                                newItemButton.setDisabled(true);

                            }else{
                                newItemButton.setDisabled(false);
                            }
                            var foundRootItem = false;
                            selected.forEach(function(node){
                                if (node.parentNode.isRoot()){
                                    copyAction.setDisabled(true);
                                    deleteScriptAction.setDisabled(true);
                                    if (node.get("fileType") === "libs"){
                                        newScriptAction.setDisabled(true);
                                        newGroovyScriptAction.setDisabled(true);
                                        newJavaScriptAction.setDisabled(true);
                                        newPythonScriptAction.setDisabled(true);
                                        newFolderAction.setDisabled(true);
                                    }
                                    foundRootItem = true;

                                }
                            });
                            if (foundRootItem === false){
                                newScriptAction.setDisabled(false);
                                newGroovyScriptAction.setDisabled(false);
                                newJavaScriptAction.setDisabled(false);
                                newPythonScriptAction.setDisabled(false);
                                newFolderAction.setDisabled(false);
                                deleteScriptAction.setDisabled(false);
                                copyAction.setDisabled(false);
                            }
                        }
                    }
                },
                {
                    xtype:'tabpanel',
                    itemId: 'scriptstab',
                    id:'scriptstab',
                    ui: "orange-tab",
                    region: 'center',
                    defaults:{ autoScroll:true },
                    plugins: [
                        Ext.create('Ext.ux.TabCloseMenu', {

                        }),
                        Ext.create('Ext.ux.TabReorderer', {

                        })
                    ],

                    listeners: {
                        tabchange: function(tabPanel,newCard,oldCard,eOpts){
                            if(newCard.path){
                                if(newCard.xtype == "codeeditorpanel" && tabPanel.up("#ScriptBrowser").down("#versionControl").lastTab != newCard){
                                    scriptEditor.fireEvent('loadVersionHistory',newCard);
                                }
                                setTimeout(function(){newCard.focus();},100);
                                if(newCard.refreshNeeded == true) {
                                    newCard.focusArea();
                                    newCard.refreshNeeded = false;
                                }
                                var username = Ext.util.Cookies.get('username');
                                var project = Ext.util.Cookies.get('project');
                                var loc = newCard.path.indexOf(project+"/"+username);
                                var urlPath = newCard.path.substring(loc+username.length+project.length+1,newCard.path.length);
                                window.history.replaceState("", "", '/index.html?script='+urlPath+"&project="+Ext.util.Cookies.get('project'));
                            }

                        },
                        render: function(me){
                            me.el.on("click",function(){
                                if ((me.getActiveTab() != null)&&(me.path)){
                                    me.getActiveTab().focus();
                                }
                            });
                            me.items.on("remove",function(){
                                if(me.items.length == 0){
                                    window.history.replaceState("", "", '/index.html');
                                }
                            })
                        }
                    }

                }
            ]

        });

        this.items = [scriptView];

        this.tbar = {
            xtype: 'toolbar',
            dock: 'top',

            items:[newItemButton,saveScriptAction,deleteScriptAction,'-',
                copyAction,pasteAction,'-',terminalAction,
                //recordImageAction,
                "-",
                compileAction,
                "-",
                pushAction,
                pullAction,
                recordStepsAction,
                "-",
                runTCAction,
                //importTCButton,
                "->",
                importAllTCsAction,
                "-",
                findText,
                findPrev,
                findNext,
                caseSensitive,
                regExpression,
                ' ',
                replaceText,
                replaceAction,
                replaceAllAction
            ]
        };


        this.callParent(arguments);
    }
});