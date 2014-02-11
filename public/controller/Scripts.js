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
    views:  ['ScriptBrowser','ImageView'],
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
                pullChanges: this.onPullChanges,
                recordImage: this.onRecordImage,
                imageEdit:this.onImageEdit

            },
            'scriptBrowser button': {

            }
        });
    },

    compileEventAttached: false,

    onRecordImage: function(){
        Ext.Ajax.request({
            url:"/recordimage",
            method:"POST",
            jsonData : {},
            success: function(response) {
                //Ext.MessageBox.hide();
                //Ext.Msg.alert('Success', "Code was successfully pushed to the main branch.");
            }
        });
    },

    onImageRecorded: function(id){
        var tab = this.tabPanel.add({
            title:"[New Image]*",
            dirty: true,
            closable:true,
            xtype:"imageview",
            _id:id
        });
        this.tabPanel.setActiveTab(tab);
    },

    onImageEdit: function(record){
        var tab = this.tabPanel.add({
            title:record.get("name"),
            closable:true,
            xtype:"imageview",
            dataRecord:record,
            _id:record.get("_id")
        });
        this.tabPanel.setActiveTab(tab);
    },

    onPushChanges: function(){
        Ext.MessageBox.show({
            msg: 'Pushing changes to master branch, please wait...',
            progressText: 'Pushing...',
            width:300,
            wait:true,
            waitConfig: {interval:200}
        });
        var me = this;
        var allScripts = Ext.ComponentQuery.query('codeeditorpanel');
        allScripts = allScripts.concat(Ext.ComponentQuery.query('mergepanel'));

        var foundDirty = false;
        Ext.each(allScripts, function(script, index) {
            if(script.dirty == true){
                foundDirty = true;
            }
        });

        var doPush = function(){
            Ext.Ajax.request({
                url:"/scripts/push",
                method:"POST",
                jsonData : {},
                success: function(response) {
                    me.treePanel.getRootNode().cascadeBy(function(node) {
                        if(node.get("text").indexOf("<span") != -1){
                            node.set("text",node.get("name"));
                            node.set("qtip","");
                        }
                    });
                    Ext.MessageBox.hide();
                    var obj = Ext.decode(response.responseText);
                    if(obj.error){
                        Ext.Msg.alert('Error', obj.error);
                    }
                    else{
                        Ext.Msg.alert('Success', "Code was successfully pushed to the main branch.");
                    }
                }
            });
        };

        if (foundDirty == true){
            Ext.Msg.show({
                title:'Save Confirmation',
                msg: "It appears you have unsaved changes.  Would you like to save them first?",
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.QUESTION,
                fn: function(id){
                    if (id == "yes"){
                        me.onScriptSave(function(){
                            doPush()
                        })
                    }
                    else{
                        Ext.Msg.alert('Warning', "The code was not pushed due to changes not being saved.")
                    }
                }
            });
        }
        else{
            var foundConflict = false;
            me.treePanel.getRootNode().cascadeBy(function(node) {
                var openInConflict = false;
                if(node.get("inConflict") == true){
                    if ((foundConflict == true) &&(openInConflict == false)) return false;
                    if (openInConflict == true){
                        me.onScriptEdit(node);
                        return;
                    }
                    foundConflict = true;
                    Ext.Msg.show({
                        title:'Error',
                        msg: "It appears you have files in conflict.  Would you like to resolve them now?",
                        buttons: Ext.Msg.YESNO,
                        icon: Ext.Msg.QUESTION,
                        fn: function(id){
                            if (id == "yes"){
                                openInConflict = true;
                                me.onScriptEdit(node);
                            }
                        }
                    });
                }
            });
            if(foundConflict == false) doPush();
        }


    },

    onPullChanges: function(){
        var me = this;
        Ext.MessageBox.show({
            msg: 'Pulling changes from master branch, please wait...',
            progressText: 'Pulling...',
            width:300,
            wait:true,
            waitConfig: {interval:200}
        });

        var me = this;
        var allScripts = Ext.ComponentQuery.query('codeeditorpanel');
        allScripts = allScripts.concat(Ext.ComponentQuery.query('mergepanel'));
        var expandedNodes = me.getExpandedNodes(me.treePanel.getRootNode());

        var foundDirty = false;
        Ext.each(allScripts, function(script, index) {
            if(script.dirty == true){
                foundDirty = true;
            }
        });

        var doPull = function(){
            Ext.Ajax.request({
                url:"/scripts/pull",
                method:"POST",
                jsonData : {},
                success: function(response) {
                    var obj = Ext.decode(response.responseText);
                    var message = "";
                    if (obj.conflicts.length > 0){
                        message = "Code was pulled but the following files are in conflict:<br>";
                        Ext.each(obj.conflicts,function(conflict){
                            message = message + "<b color='red'>"+conflict+"</b><br>";
                        });
                    }
                    else{
                        message = "Code was successfully pulled from the main branch.";
                    }
                    me.getStore('Scripts').reload({callback:function(){
                        me.expandNodes(expandedNodes);
                        Ext.each(allScripts,function(script){
                            var foundIt = false;
                            me.treePanel.getRootNode().cascadeBy(function(node) {
                                if (node.get("fullpath").indexOf(script.path) != -1){
                                    foundIt = true;
                                    //script.close();
                                    //node.parentNode.expand();
                                    if (node.get("inConflict") == true){
                                        script.close();
                                        me.onScriptEdit(node);
                                        node.parentNode.expand();
                                    }
                                    else{
                                        script.node = node;
                                        //me.onScriptEdit(node);
                                        Ext.Ajax.request({
                                            url:"/script/get",
                                            method:"POST",
                                            jsonData : {path:script.path},
                                            success: function(response, action) {
                                                var obj = Ext.decode(response.responseText);
                                                script.setValue(obj.text);
                                                script.clearDirty();
                                                script.refreshNeeded = true;
                                            }
                                        });
                                    }
                                }
                            });
                            if (foundIt == false) script.close();
                        });
                    }});
                    Ext.MessageBox.hide();

                    Ext.Msg.alert('Success', message);
                }
            });
        };

        if (foundDirty == true){
            Ext.Msg.show({
                title:'Save Confirmation',
                msg: "It appears you have unsaved changes.  Would you like to save them first?",
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.QUESTION,
                fn: function(id){
                    if (id == "yes"){
                        me.onScriptSave(function(){
                            doPull()
                        })
                    }
                    else{
                        Ext.Msg.alert('Warning', "The code was not pulled due to changes not being saved.")
                    }
                }
            });
        }
        else{
            doPull();
        }

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
        }else if (fileName.slice(-2) == "js"){
            icon = "images/fileTypeJavascript.png";
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
                    var newNode = selection.appendChild({name:fileName,text:fileName,fileType:"file",leaf:true,icon:me.getIconType(fileName),fullpath:path+"/"+fileName});
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

                    var newNode = selection.appendChild({name:fileName,text:fileName,fileType:"file",leaf:true,icon:me.getIconType(fileName),fullpath:path+"/"+fileName});
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
        if (tab.down("codeeditorfield") != null){
            return tab.down("codeeditorfield").editor;
        }
        else{
            return tab.editor.edit;
        }

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

    getExpandedNodes: function(root){
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
        isExpanded(root);
        return expandedNodes.reverse();
    },

    expandNodes: function(nodes,callback){
        var me = this;
        nodes.forEach(function(node,index,array){
            var toExpand = me.treePanel.getRootNode().findChild("fullpath",node,true);
            if (toExpand){
                me.treePanel.getRootNode().findChild("fullpath",node,true).expand();
            }
            if (array.length-1 == index){
                if(callback) callback();
            }
        });

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

            var expandedNodes = me.getExpandedNodes(this.treePanel.getRootNode());

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
                        /*
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
                         */
                        var expandAll = function(store){
                            me.expandNodes(expandedNodes,function(){
                                var destNode = me.treePanel.getRootNode().findChild("fullpath",path,true);
                                if (destNode){
                                    me.treePanel.getSelectionModel().select(destNode);
                                    destNode.expand();
                                }
                                store.removeListener("load",expandAll);
                            });
                        };

                        me.getStore('Scripts').on("load",expandAll);
                        me.getStore('Scripts').load();
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

            if (selection.get("cls") != "folder"){
                objectType = "script";
            }
            else{
                objectType = "folder";
            }

            var win = Ext.create('Redwood.view.FileName',{
                path:path,
                objectType:objectType,
                title: "Rename",
                operationType:"rename",
                defaultName:selection.get("name"),
                //defaultName:selection.get("text"),
                fn: function(newName){
                    //new path
                    var newPath = path.substring(0,path.lastIndexOf("/")+1)+newName;
                    selection.set({name:newName,text:newName,fullpath:newPath,icon:me.getIconType(newName)});
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
                    var newNode = selection.appendChild({name:folderName,text:folderName,cls:"folder",fileType:"folder",fullpath:path+"/"+folderName,children: []});
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
                message = 'Are you sure you want to delete: <b>'+selection[0].get("name")+'</b> ?';
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
                                    if (selection[i].hasChildNodes()){
                                        selection[i].cascadeBy(function(node){
                                            if (!node.hasChildNodes()){
                                                me.tabPanel.remove(node.get("fullpath"));
                                            }
                                        });

                                    }
                                    else{
                                        me.tabPanel.remove(selection[i].get("fullpath"));
                                    }
                                    selection[i].remove();
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

                    var newNode = selection.appendChild({name:fileName,text:fileName,fileType:"file",leaf:true,icon:me.getIconType(fileName),fullpath:path+"/"+fileName});
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
        var me = this;
        var allScripts = Ext.ComponentQuery.query('codeeditorpanel');
        allScripts = allScripts.concat(Ext.ComponentQuery.query('mergepanel'));
        var total = 0;
        if (allScripts.length == 0){
            if (callback) callback();
            return;
        }
        Ext.each(allScripts, function(script, index) {
            if (script.dirty == true){
                if (script.inConflict == false){
                    Ext.Ajax.request({
                        url:"/script",
                        method:"PUT",
                        jsonData : {path:script.path,text:script.getValue()},
                        success: function(response, action) {
                            script.clearDirty();
                            script.node.set("text",'<span style="color:blue">' + script.node.get("name") + '</span>');
                            script.node.set("qtip",'This file is not yet pushed.');
                            total++;
                            if (total == allScripts.length){
                                if (callback) callback();
                            }
                        }
                    });
                }
                else{
                    Ext.Ajax.request({
                        url:"/script/resolveconflict",
                        method:"POST",
                        jsonData : {path:script.path,text:script.getValue()},
                        success: function(response, action) {
                            script.clearDirty();
                            total++;
                            if (total == allScripts.length){
                                script.close();
                                script.node.set("inConflict",false);
                                script.node.set("text",script.node.get("name"));
                                if (callback) callback();
                            }
                        }
                    });
                }
            }
            else{
                total++;
                if (total == allScripts.length){
                    if (callback) callback();
                }
            }
        });
    },

    onScriptEdit: function(record,lineNumber){
        var me = this;
        //if string search for
        if (typeof(record) == "string"){
            this.treePanel.getRootNode().cascadeBy(function(node) {
                if ((node.get("fullpath") && (node.get("fullpath").indexOf(record) != -1))){
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
            }else if (record.get("fullpath").slice(-2) == "js"){
                editorType = "text/javascript";
            }

            var tab;

            if (record.get("inConflict") == false){

                tab = this.tabPanel.add({
                    inConflict:false,
                    path:record.get("fullpath"),
                    editorType:editorType,
                    title:record.get("name"),
                    closable:true,
                    xtype:"codeeditorpanel",
                    itemId:record.get("fullpath"),
                    tooltip:record.get("fullpath"),
                    node:record,
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
                        tab.setValue(obj.text);
                        if (typeof(lineNumber) == "number"){
                            tab.setCursor({line:lineNumber,ch:0});
                        }
                        tab.clearHistory();
                        tab.clearDirty();
                    }
                });
            }
            else{

                tab = this.tabPanel.add({
                    inConflict:true,
                    path:record.get("fullpath"),
                    editorType:editorType,
                    title:record.get("text"),
                    closable:true,
                    xtype:"mergepanel",
                    itemId:record.get("fullpath"),
                    tooltip:record.get("fullpath"),
                    node:record,
                    listeners:{
                        focus: function(me){
                            me.up('scriptBrowser').fireEvent('focused',me.down("mergepanel").editor);
                        }
                    }
                });

                Ext.Ajax.request({
                    url:"/script/mergeinfo",
                    method:"POST",
                    jsonData : {path:record.get("fullpath")},
                    success: function(response, action) {
                        var obj = Ext.decode(response.responseText);
                        tab.setMine(obj.mine);
                        tab.setTheirs(obj.theirs);
                    }
                });
            }

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