Ext.define('Redwood.view.CommitView', {
    extend: 'Ext.window.Window',
    alias: 'widget.commitView',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    defaultFocus: "commitMessage",
    title: 'Push Changes',
    id: "commitView",
    draggable: true,
    resizable: true,
    width: 480,
    height: 500,
    layout: 'fit',
    modal: true,
    initComponent: function () {
        var me = this;

        this.items= {
            xtype:"form",
            layout:"anchor",
            bodyPadding: 5,
            defaults: {
                anchor: '100%'
            },
            buttons: [
                {
                    text: 'Cancel',
                    handler: function() {
                        var controller = Redwood.app.getController("Scripts");
                        this.up('form').up('window').close();
                    }
                },
                {
                    text: 'Submit',
                    itemId: "submit",
                    formBind: true, //only enabled once the form is valid
                    disabled: true,
                    handler: function() {
                        var controller = Redwood.app.getController("Scripts");
                        this.setDisabled(true);
                        var form = this.up('form').getForm();
                        if (form.isValid()) {
                            var window = this.up('window');

                            Ext.MessageBox.show({
                                msg: 'Pushing changes to master branch, please wait...',
                                progressText: 'Pushing...',
                                width:300,
                                wait:true,
                                waitConfig: {interval:200}
                            });

                            var comment = form.findField("commitMessage").getValue();
                            var files = [];
                            me.down("#scripts").getRootNode().cascadeBy(function(node){
                                if (node.get("fullpath") && node.get("checked") == true){
                                    files.push(node.get("fullpath"));
                                }
                            });

                            Ext.Ajax.request({
                                url:"/scripts/push",
                                method:"POST",
                                timeout: 400000,
                                jsonData : {comment:comment,files:files},
                                success: function(response) {
                                    window.close();
                                    Ext.MessageBox.hide();
                                    var obj = Ext.decode(response.responseText);
                                    if(obj.error){
                                        Ext.Msg.alert('Error', obj.error);
                                    }
                                    else{
                                        controller.loadVersionHistory(controller.tabPanel.getActiveTab());
                                        Ext.Msg.alert('Success', "Code was successfully pushed to the main branch.");
                                        Ext.ComponentQuery.query('#scriptsTree')[0].getRootNode().cascadeBy(function(node) {
                                            if(node.get("text").indexOf("<span") != -1){
                                                for(var i=0;i<files.length;i++){
                                                    if(node.get("fullpath").indexOf(files[i]) != -1){
                                                        node.set("text",node.get("name"));
                                                        node.set("qtip","");
                                                        break;
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                            });

                        }
                    }
                }
            ],

            items: [
                {
                    xtype:"commitTree",
                    itemId:"commitTree",
                    maxHeight: 300
                },
                {
                    xtype:'textarea',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'Commit Message',
                    name: 'commitMessage',
                    itemId: "commitMessage",
                    labelAlign:"top",
                    allowBlank: false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                }
            ]
        };


        this.callParent(arguments);
    }
});

Ext.define('Redwood.view.CommitTree', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.commitTree',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    //bodyPadding: 5,
    loadingData: true,
    //layout: 'fit',
    //autoScroll:true,
    listeners: {
        afterrender: function (me) {
            Ext.Ajax.request({
                url:"/scripts/notpushed",
                method:"GET",
                success: function(response, action) {
                    var obj = Ext.decode(response.responseText);
                    if(obj.notPushed.length == 0){
                        Ext.Msg.alert('Error', 'There Is Nothing To Push.');
                        me.up("window").close();
                    }
                    obj.notPushed.forEach(function(node){
                        me.down("#scripts").getRootNode().appendChild(node,false,true);
                    })
                }
            });
        }
    },


    onFileChecked: function(node){
        var me = this;
        var allMarked = true;
        var allUnmarked = false;
        var unmarkedCount = 0;
        node.parentNode.eachChild(function(file){
            if (file.get("checked")== false){
                allMarked = false;
                unmarkedCount ++;
            }
        });
        if(unmarkedCount == node.parentNode.childNodes.length){
            allUnmarked = true;
        }
        if (allMarked == true){
            node.parentNode.set("checked",true);
            this.markWhite(node.parentNode,me.down("#scripts"));
            this.markParents(node.parentNode,me.down("#scripts"));
        }else if(allUnmarked == true){
            node.parentNode.set("checked",false);
            //this.markWhite(node.parentNode,me.down("#scripts"));
            this.markParents(node.parentNode,me.down("#scripts"));
        }
        else{
            node.parentNode.set("checked",true);
            this.markGrey(node.parentNode,me.down("#scripts"));
            this.markParents(node.parentNode,me.down("#scripts"));
        }
    },

    onDirAdd:function(parentNode,node){
        if(node.isRoot()==false){
            if(node.parentNode.data.checked == true){
                node.set("checked",true);
                node.set("propagatedCheck",true);
            }
            else{
                node.set("checked",false);
            }
        }
    },

    onDirCollapsed: function(node){
        if (node.get("greyCheck")== true){
            this.markGrey(node,this.down("#scripts"));
        }
    },

    onDirChecked: function(firstNode,checked){
        //mark all children checked
        var me = this;
        var changeCheck = function(node){
            //if not a dir
            if (node.hasChildNodes() == false){
                me.down("#scripts").getRootNode().cascadeBy(function(searchNode){
                    if ((node != searchNode) && (node.get("_id") == searchNode.get("_id"))){
                        if (searchNode.get("checked") != checked){
                            searchNode.set("checked",checked);
                            searchNode.set("propagatedCheck",checked);
                        }
                    }
                })
            }

            node.childNodes.forEach(function(child,index,array){
                if (child.get("checked") != checked){
                    child.set("checked",checked);
                    child.set("propagatedCheck",checked);
                }
                changeCheck(child);
            });
        };

        changeCheck(firstNode);

        //now see if parents need to be grey or white checks
        this.markParents(firstNode,me.down("#scripts"));

    },

    markGrey: function(node,tree){
        var checkBox = Ext.query("input",tree.getView().getNode(node))[0];
        if (checkBox.className.indexOf("x-tree-checkbox") != -1){
            checkBox.className = "x-grey-checked-box x-tree-checkbox";
            node.data.greyCheck = true;
        }
    },

    markWhite: function(node,tree){
        var checkBox = Ext.query("input",tree.getView().getNode(node))[0];
        if (checkBox.className.indexOf("x-tree-checkbox") != -1){
            checkBox.className = "x-tree-checkbox-checked x-tree-checkbox";
            node.data.greyCheck = false;
        }
    },

    markParents: function(node,tree){
        if (node.parentNode.isRoot()) return;
        if (node.parentNode.findChild("checked",true) == null){
            node.parentNode.set("checked",false);
        }
        else if (node.parentNode.findChild("greyCheck",true) != null){
            node.parentNode.set("checked",true);
            this.markGrey(node.parentNode,tree);
        }
        else if (node.parentNode.findChild("checked",false) != null){
            node.parentNode.set("checked",true);
            this.markGrey(node.parentNode,tree);
        }
        else{
            node.parentNode.set("checked",true);
            this.markWhite(node.parentNode,tree);
        }
        this.markParents(node.parentNode,tree)
    },

    initComponent: function () {
        var me = this;
        var scripts = [];

        var treeStore =  new Ext.data.TreeStore({
            fields: [
                {name: 'name',     type: 'string'},
                {name: 'fullpath',     type: 'string'},
                {name: 'icon',     type: 'string'},
                {name: 'leaf',     type: 'boolean'},
                {name: 'cls',     type: 'string'},
                {name: 'checked',     type: 'boolean'},
                {name: 'expanded',     type: 'boolean'}
            ],
            root: {
                expanded: true,
                children:[]
            }
        });

        this.items = [
            {
                xtype:"treepanel",
                title: 'Commit Scripts',
                maxHeight: 300,
                multiSelect: false,
                itemId: "scripts",
                rootVisible: false,
                store: treeStore,
                displayField:"name",
                focused: false,
                minHeight:300,
                listeners: {
                    checkchange:function(firstNode,checked,eOpt){
                        if(firstNode.get("leaf") == true){
                            me.onFileChecked(firstNode);
                        }
                        else{
                            me.onDirChecked(firstNode,checked);
                        }
                    },
                    afteritemcollapse:function(node){
                        me.onDirCollapsed(node);
                    },
                    afteritemexpand:function(node){
                        me.onDirCollapsed(node);
                    }
                }
            }
        ];

        this.callParent(arguments);
    }

});