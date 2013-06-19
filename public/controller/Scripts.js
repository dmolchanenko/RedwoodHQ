function openScript(path,lineNumber){
    var tab = Ext.ComponentQuery.query("#mainTabPanel")[0];
    tab.setActiveTab(tab.down("#ScriptBrowser"));
    Ext.getCmp("ScriptBrowser").fireEvent('scriptEdit',path,parseInt(lineNumber,10));
    //scriptController.onScriptEdit(path,lineNumber);
    if(Ext.isChrome){
        return false;
    }
}


Ext.define("Redwood.controller.Scripts", {
    extend: 'Ext.app.Controller',

    stores: ['Scripts'],
    models: ['Scripts'],
    views:  ['ScriptBrowser'],
    clipBoard: [],
    lastFocused: "",

    init: function () {
        this.control({
            'scriptBrowser': {
                newScript: this.onNewScript,
                scriptEdit: this.onScriptEdit,
                render: this.onScriptRender,
                saveAll: this.onScriptSave,
                deleteScript: this.onDelete,
                newFolder: this.onNewFolder,
                rename: this.onRename,
                copy: this.onCopy,
                focused: this.onFocus,
                paste: this.onPaste,
                terminal: this.onTerminal,
                find: this.onFind,
                findNext: this.onFindNext,
                clearSearch: this.onClearSearch,
                findPrev: this.onFindPrev,
                replace: this.onReplace,
                replaceAll: this.onReplaceAll,
                uploadFile: this.onUpload,
                compile: this.onCompile,
                pushChanges: this.onPushChanges,
                pullChanges: this.onPullChanges

            },
            'scriptBrowser button': {

            }
        });
    },

    compileEventAttached: false,

    onPushChanges: function(){
        Ext.Ajax.request({
            url:"/scripts/push",
            method:"POST",
            jsonData : {},
            success: function(response) {

            }
        });
    },

    onPullChanges: function(){
        var me = this;
        Ext.Ajax.request({
            url:"/scripts/pull",
            method:"POST",
            jsonData : {},
            success: function(response) {
                me.getStore('Scripts').reload();
            }
        });
    },

    onCompile: function(){
        Ext.socket.emit('compile', {project:Ext.util.Cookies.get("project"),username:Ext.util.Cookies.get("username")});
        var me = this;

        var output = me.scriptBrowser.down("#compileOutput");
        var elem = output.getEl();
        //elem.dom.innerHTML = "";
        while (elem.dom.hasChildNodes()) {
            elem.dom.removeChild(elem.dom.lastChild);
        }
        var panel = me.scriptBrowser.down("#outputPanel");
        panel.expand();
        if (me.compileEventAttached == false){
            //handle compile messages
            Ext.socket.on('compile',function(msg){
                var output = me.scriptBrowser.down("#compileOutput");
                var elem = output.getEl();

                msg.split("\n").forEach(function(line){
                    //see if we get our file to show up
                    var srcIndex = line.lastIndexOf("\\src\\");
                    if(srcIndex != -1){
                        var endOfPath = line.indexOf(":",srcIndex);
                        if (endOfPath == -1){
                            srcIndex = line.indexOf("\\src\\");
                            endOfPath = line.indexOf(":",srcIndex);
                        }
                        var path = line.slice(srcIndex,endOfPath);
                        //var lineNumber = line.substr(endOfPath+2,1);
                        var lineNumber = line.slice(endOfPath+1,line.indexOf(":",endOfPath+1));
                        lineNumber = parseInt(lineNumber,10) -1;

                        normalisedPath = path;
                        while(normalisedPath.indexOf("\\") != -1){
                            var normalisedPath = normalisedPath.replace("\\","/");
                        }
                        var linkHmtl = "<a href='javascript:openScript(&quot;"+ normalisedPath +"&quot;,"+lineNumber+")'>"+ path +"</a>";

                        var newMsg = line.replace(path,linkHmtl);
                        //var newMsg = line.replace(path,"<a href='javascript:function(){return false;}'>"+ path +"</a>");
                        Ext.DomHelper.append(elem, {tag: 'div',html:newMsg});
                    }
                    else{
                        Ext.DomHelper.append(elem, {tag: 'div',html:line});
                    }
                });
            });
            me.compileEventAttached = true;
        }
    },

    getIconType: function(fileName){
        var icon;
        if (fileName.slice(-6) == "groovy"){
            icon = "images/fileTypeGroovy.png";
        }else if (fileName.slice(-4) == "java"){
            icon = "images/fileTypeJava.png";
        }
        return icon;
    },

    onUpload: function(form){
        if(this.treePanel.getSelectionModel().getSelection().length == 1){
            var me = this;
            var path = "";
            var selection = this.treePanel.getSelectionModel().getSelection()[0];
            if ((selection.get("fileType") != "folder")&&(selection.get("fileType") != "libs")){
                selection = selection.parentNode;
                path = selection.get("fullpath");
            }
            else{
                path = selection.get("fullpath");
            }
            var fileName = form.down("#uploadFileName").getValue();
            fileName = fileName.replace(/^.*[\\\/]/, '');
            form.down("#destDir").setValue(path);
            form.submit({
                url: '/fileupload',
                waitMsg: 'Uploading...',
                success: function(fp, o) {
                    Ext.Msg.alert('Success', 'cool').hide();
                    var newNode = selection.appendChild({text:fileName,fileType:"file",leaf:true,icon:me.getIconType(fileName),fullpath:path+"/"+fileName});
                    me.getStore('Scripts').sort();
                    newNode.parentNode.expand();
                    me.treePanel.getSelectionModel().select(newNode);

                },
                //don't know why but failed actually means success
                failure: function(form,info){
                    var obj = Ext.decode(info.response.responseText);
                    if(obj.error != null){
                        Ext.Msg.alert('Error', obj.error);
                        return;
                    }

                    var newNode = selection.appendChild({text:fileName,fileType:"file",leaf:true,icon:me.getIconType(fileName),fullpath:path+"/"+fileName});
                    me.treePanel.getStore().sort();
                    newNode.parentNode.expand();
                    me.treePanel.getSelectionModel().select(newNode);
                }
            });
        }
    },

    GetOpenedEditor: function(){
        var tab = this.tabPanel.getActiveTab();
        if (tab == null) return null;
        return tab.down("codeeditorfield").editor;
    },

    onFindPrev: function(){
        if (this.GetOpenedEditor() != null){
            Ext.editorCommands.search(this.GetOpenedEditor(),true);
        }
    },

    onClearSearch: function(){
        if (this.GetOpenedEditor() != null){
            Ext.editorCommands.clearSearch(this.GetOpenedEditor());
        }

    },

    onFindNext: function(){
        if (this.GetOpenedEditor() != null){
            Ext.editorCommands.search(this.GetOpenedEditor());
        }
    },

    onFind: function(){
        if (this.GetOpenedEditor() != null){
            Ext.editorCommands.clearSearch(this.GetOpenedEditor());
            Ext.editorCommands.search(this.GetOpenedEditor());
        }
    },

    onReplace: function(){
        if (this.GetOpenedEditor() != null){
            Ext.editorCommands.replace(this.GetOpenedEditor());
        }
    },

    onReplaceAll: function(){
        if (this.GetOpenedEditor() != null){
            Ext.editorCommands.replace(this.GetOpenedEditor(),true);
        }
    },

    onTerminal: function(){
        var terminalWin = Ext.create('Redwood.ux.TerminalWindow',{

        });
        terminalWin.show();
    },

    onPaste: function(){
        if(this.treePanel.getSelectionModel().getSelection().length == 1){
            var me = this;
            var selection = this.treePanel.getSelectionModel().getSelection()[0];
            var path = me.getPathFromNode(selection);

            var allScripts = [];
            this.clipBoard.forEach(function(node){
                if(!node.parentNode.isRoot()){
                    allScripts.push(node.get("fullpath"));
                }
            });

            var expandedNodes = [];
            var isExpanded = function(node){
                if (node.isExpanded()){
                    if (!node.isRoot()){
                        expandedNodes.push(node.get("fullpath"));
                    }
                    node.eachChild(function(child){
                        isExpanded(child);
                    });
                }
            };
            isExpanded(this.treePanel.getRootNode());
            expandedNodes.reverse();

            Ext.Ajax.request({
                url:"/scripts/copy",
                method:"POST",
                jsonData : {scripts:allScripts,destDir:path},
                success: function(response, action) {
                    var obj = Ext.decode(response.responseText);
                    if(obj.error != null){
                        Ext.Msg.alert('Error', obj.error);
                    }
                    else{
                        var expandAll = function(store){
                            expandedNodes.forEach(function(node,index,array){
                                var toExpand = me.treePanel.getRootNode().findChild("fullpath",node,true);
                                if (toExpand){
                                    me.treePanel.getRootNode().findChild("fullpath",node,true).expand();
                                }
                                if (array.length-1 == index){
                                    var destNode = me.treePanel.getRootNode().findChild("fullpath",path,true);
                                    if (destNode){
                                        me.treePanel.getSelectionModel().select(destNode);
                                        destNode.expand();
                                    }
                                    store.removeListener("load",expandAll);
                                }
                            });

                        };
                        me.getStore('Scripts').on("load",expandAll);
                        me.getStore('Scripts').load();
                        //newNode.parentNode.expand();
                    }

                }
            });
        }

    },

    onFocus: function(object){
        this.lastFocused = object;
    },

    onCopy: function(){
        this.clipBoard = this.treePanel.getSelectionModel().getSelection();
    },

    onRename: function(){
        if(this.treePanel.getSelectionModel().getSelection().length == 1){
            var selection = this.treePanel.getSelectionModel().getSelection()[0];
            var path = "";
            var objectType;
            var me = this;

            path = selection.get("fullpath");

            //if (selection.get("cls") != "folder"){
            //    objectType = "script";
            //}
            //else{
                objectType = "folder";
            //}

            var win = Ext.create('Redwood.view.FileName',{
                path:path,
                objectType:objectType,
                title: "Rename",
                operationType:"rename",
                defaultName:selection.get("text"),
                fn: function(newName){
                    //new path
                    var newPath = path.substring(0,path.lastIndexOf("/")+1)+newName;
                    selection.set({text:newName,fullpath:newPath,icon:me.getIconType(newName)});
                    selection.dirty = false;
                    me.getStore('Scripts').sort();
                    me.treePanel.getSelectionModel().select(selection);
                    me.tabPanel.items.each(function(tab){
                        if(tab.path === path){
                            //tab.itemId = newPath;
                            tab.path = newPath;
                            tab.tooltip = newPath;
                            tab.setTitle(newName);
                        }
                    });
                    //var foundTab = me.tabPanel.down("#"+path);
                }
            });
            win.show();
        }
    },

    onNewFolder: function(){
        if(this.treePanel.getSelectionModel().getSelection().length > 0){
            var me = this;
            var selection = this.treePanel.getSelectionModel().getSelection()[0];
            var path = me.getPathFromNode(selection);

            var win = Ext.create('Redwood.view.FileName',{
                path:path,
                title: "New Folder",
                objectType: "folder",
                fn: function(folderName){
                    var newNode = selection.appendChild({text:folderName,cls:"folder",fileType:"folder",fullpath:path+"/"+folderName,children: []});
                    me.getStore('Scripts').sort();
                    newNode.parentNode.expand();
                    me.treePanel.getSelectionModel().select(newNode);
                }
            });
            win.show();
        }
    },

    onDelete: function(){
        var me = this;
        var selection = this.treePanel.getSelectionModel().getSelection();
        if(selection.length > 0){
            var message = 'Are you sure you want to delete selected files/folders?';
            if (selection.length == 1){
                message = 'Are you sure you want to delete: <b>'+selection[0].get("text")+'</b> ?';
            }
            Ext.Msg.show({
                title:'Delete Confirmation',
                msg: message,
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.QUESTION,
                fn: function(id){
                    if (id == "yes"){
                        var scripts = [];
                        for (var i=0;selection.length > i;i++){
                            //if (selection[i].get("fullpath") == "public/automationscripts/src"){
                            if (selection[i].parentNode.isRoot()==true){
                                //see if src dir is about to be deleted
                                Ext.Msg.alert('Error', 'Can not delete this src/libs/build.xml items.');
                                return;
                            }
                            scripts.push({fullpath:selection[i].get("fullpath"),cls:selection[i].get("cls")})
                        }
                        Ext.Ajax.request({
                            url:"/scripts/delete",
                            method:"POST",
                            jsonData : scripts,
                            success: function(response, action) {
                                for (var i=0;selection.length > i;i++){
                                    selection[i].remove();
                                    me.tabPanel.remove(selection[i].get("fullpath"));
                                }
                            }
                        });
                    }
                }
            });
        }
    },

    getPathFromNode: function(node){
        var path;
        if (node.get("fileType") != "folder"){
            node = node.parentNode;
            path = node.get("fullpath");
        }
        else{
            path = node.get("fullpath");
        }
        return path;
    },

    onNewScript: function(){
        if(this.treePanel.getSelectionModel().getSelection().length > 0){
            var me = this;
            var selection = this.treePanel.getSelectionModel().getSelection()[0];
            var path = me.getPathFromNode(selection);

            var win = Ext.create('Redwood.view.FileName',{
                path:path,
                fn: function(fileName){

                    var newNode = selection.appendChild({text:fileName,fileType:"file",leaf:true,icon:me.getIconType(fileName),fullpath:path+"/"+fileName});
                    me.onScriptEdit(newNode);
                    me.getStore('Scripts').sort();
                    newNode.parentNode.expand();
                    me.treePanel.getSelectionModel().select(newNode);

                }
            });
            win.show();
        }
    },

    onScriptSave: function(callback){
        var allScripts = Ext.ComponentQuery.query('codeeditorpanel');
        var total = 0;
        if (allScripts.length == 0){
            if (callback != null) callback();
            return;
        }
        Ext.each(allScripts, function(script, index) {
            if (script.dirty == true){
                Ext.Ajax.request({
                    url:"/script",
                    method:"PUT",
                    jsonData : {path:script.path,text:script.getValue()},
                    success: function(response, action) {
                        script.clearDirty();
                        total++;
                        if (total == allScripts.length){
                            if (callback != null) callback();
                        }
                    }
                });
            }
            else{
                total++;
                if (total == allScripts.length){
                    if (callback != null) callback();
                }
            }
        });
    },

    onScriptEdit: function(record,lineNumber){
        var me = this;
        //if string search for
        if (typeof(record) == "string"){
            this.treePanel.getRootNode().cascadeBy(function(node) {
                if (node.get("fullpath").indexOf(record) != -1){
                    node.parentNode.expand();
                    me.treePanel.getSelectionModel().select(node);
                    record = node;
                }
            });
        }
        //if still a string node was not found
        if (typeof(record) == "string"){
            return;
        }

        var foundTab = null;

        this.tabPanel.items.each(function(tab){
            if (tab.path === record.get("fullpath")){
                foundTab = tab;
            }
        });
        if (foundTab == null){
            var editorType = "text";

            if (record.get("fullpath").slice(-6) == "groovy"){
                editorType = "text/x-groovy";
            }else if (record.get("fullpath").slice(-4) == "java"){
                editorType = "text/x-java";
            }else if (record.get("fullpath").slice(-3) == "xml"){
                editorType = "application/xml";
            }

            var tab = this.tabPanel.add({
                path:record.get("fullpath"),
                editorType:editorType,
                title:record.get("text"),
                closable:true,
                xtype:"codeeditorpanel",
                itemId:record.get("fullpath"),
                tooltip:record.get("fullpath"),
                listeners:{
                    focus: function(me){
                        me.up('scriptBrowser').fireEvent('focused',me.down("codeeditorfield").editor);
                    }
                }
            });
            Ext.Ajax.request({
                url:"/script/get",
                method:"POST",
                jsonData : {path:record.get("fullpath")},
                success: function(response, action) {
                    var obj = Ext.decode(response.responseText);
                    //tab.title = record.get("text");
                    //tab.up("tab").setTooltip(record.get("fullpath"));
                    //tab.path = record.get("fullpath");
                    tab.setValue(obj.text);
                    if (typeof(lineNumber) == "number"){
                        tab.setCursor({line:lineNumber,ch:0});
                    }
                    tab.clearDirty();
                }
            });
            foundTab = tab;
        }

        me.tabPanel.setActiveTab(foundTab);
        if (typeof(lineNumber) == "number"){
            me.tabPanel.getActiveTab().setCursor({line:lineNumber,ch:0});
            foundTab.focus();
        }
    },

    onScriptRender: function(){
        var me = this;
        this.scriptBrowser = Ext.ComponentQuery.query('scriptBrowser')[0];
        this.tabPanel = Ext.ComponentQuery.query('tabpanel',this.scriptBrowser)[0];
        this.treePanel = Ext.ComponentQuery.query('treepanel',this.scriptBrowser)[0];
        this.searchField = Ext.ComponentQuery.query('#findTextField',this.scriptBrowser);
        this.treePanel.on("afterrender",function(tree){
        new Ext.util.KeyMap({
                target:  me.treePanel.getEl(),
                binding: [{
                        key: "c",
                        ctrl:true,
                        fn: function(){
                            tree.up('scriptBrowser').fireEvent('copy');}
                    },
                    {
                        key: "v",
                        ctrl:true,
                        fn: function(){
                            tree.up('scriptBrowser').fireEvent('paste');}
                    },
                    {
                        key: Ext.EventObject.DELETE,
                        fn: function(){
                            tree.up('scriptBrowser').fireEvent('delete');}
                    }
                ]
            });
        });
    }


});