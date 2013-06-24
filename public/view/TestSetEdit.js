//loadRecord
Ext.apply(Ext.form.field.VTypes, {

    testsetnameTestText: 'Test Set with the same name already exists.',
    testsetnameTest: function(val,field){
        var store = Ext.data.StoreManager.lookup('TestSets');
        var index = store.findExact(field.name,val);
        if (index != -1){
            //return false;
            var foundID = store.getAt(index).get("_id");
            var testSetData = field.up("testsetEdit").testSetData;
            if (testSetData != null){
                if (testSetData.get("_id") != foundID){
                    this.testsetnameTestText = "Test Set name should be unique.";
                    return false;
                }
            }
        }

        return true;
    }
});

Ext.define('Redwood.view.TestSetEdit', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.testsetEdit',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    testSetData: null,
    defaultFocus: "testsetname",
    bodyPadding: 5,
    viewType: "TestSet",
    dirty: false,
    loadingData: true,
    listeners:{
        afterrender: function(me){
            if (me.testSetData != null){
                me.down("#testsetname").setValue(me.testSetData.get("name"));
                this.loadingData = false;
                me.down("#testcases").getRootNode().eachChild(function(node){
                    if ((node.get("leaf") == false)&&(node.findChild("checked",true) != null)){
                        me.onDirChecked(node.findChild("checked",true),true);
                    }
                });
            }

        },
        beforeclose: function(panel){
            if (this.dirty == true){
                var me = this;
                Ext.Msg.show({
                    title:'Save Changes?',
                    msg: 'You are closing a tab that has unsaved changes. Would you like to save your changes?',
                    buttons: Ext.Msg.YESNOCANCEL,
                    icon: Ext.Msg.QUESTION,
                    fn: function(id){
                        if (id == "no"){
                            me.destroy();
                        }
                        if (id == "yes"){
                            var editor = me.up('testsetsEditor');
                            editor.fireEvent('save');
                            me.destroy();
                        }
                    }
                });
                return false;
            }
        }
    },

    initTree: function(){
        var me = this;
        me.down("#testcases").getRootNode().eachChild(function(node){
            if ((node.get("leaf") == false)&&(node.findChild("checked",true) != null)){
                me.onDirChecked(node.findChild("checked",true),true);
            }
        });
    },

    onTCSelChange: function(store){
        var me = this;
        var allMarked = true;
        store.each(function(file){
            if (file.get("selected")== false){
                allMarked = false;
                return false;
            }
        });
        var selectedNode = me.down("#testcases").getSelectionModel().getSelection()[0];
        if (allMarked == true){
            selectedNode.set("checked",true);
            this.markWhite(selectedNode,me.down("#testcases"));
            this.markParents(selectedNode,me.down("#testcases"));
        }else{
            selectedNode.set("checked",true);
            this.markGrey(selectedNode,me.down("#testcases"));
            this.markParents(selectedNode,me.down("#testcases"));
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
            this.markGrey(node,this.down("#testcases"));
        }
    },

    onDirChecked: function(firstNode,checked){
        //mark all children checked
        var me = this;
        var changeCheck = function(node){
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
        this.markParents(firstNode,me.down("#testcases"));

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

    markDirty: function(){
        this.dirty = true;
        if(this.title.charAt(this.title.length-1) != "*"){
            this.setTitle(this.title+"*")
        }
    },

    validate: function(){
        return this.down("#testsetname").validate();
    },

    initComponent: function () {
        var me = this;
        var testcases = [];
        var tags = [];
        var tagStore = Ext.data.StoreManager.lookup('TestCaseTags');
        tagStore.each(function(tag){
            tags.push({name:tag.get("value"),_id:tag.get("_id"),leaf:false,checked:false,children:[]});
        });

        Ext.data.StoreManager.lookup('TestCases').query("name",/.*/).each(function(testcase){
            var foundTC = false;
            if (me.testSetData != null){
                me.testSetData.get("testcases").forEach(function(recordedTestcase){
                    if(recordedTestcase._id === testcase.get("_id")){
                        foundTC = true;
                    }
                })
            }

            if(testcase.get("tag").length > 0){
                testcase.get("tag").forEach(function(tagInTC){
                    tags.forEach(function(tag){
                        if (tag.name === tagInTC){
                            tag.children.push({name:testcase.get("name"),_id:testcase.get("_id"),leaf:true,checked:foundTC})
                        }
                    })
                });
            }
            else{
                testcases.push({name:testcase.get("name"),_id:testcase.get("_id"),leaf:true,checked:foundTC})
            }

        });

        var treeStore =  new Ext.data.TreeStore({
            fields: [
                {name: 'name',     type: 'string'},
                {name: '_id',     type: 'string'}
            ],
            root: {
                expanded: true,
                children: tags.concat(testcases)
            }
        });

        this.items = [{
            xtype:'textfield',
            itemId:"testsetname",
            labelStyle: "font-weight: bold",
            //afterLabelTextTpl: this.requiredText,
            fieldLabel: 'Test Set Name',
            name: 'name',
            width: 300,
            vtype:'testsetnameTest',
            allowBlank: false,
            listeners:{
                change: function(){
                    if (me.loadingData === false){
                        me.markDirty();
                    }
                }
            }
        },
            {
                xtype:"treepanel",
                title: 'Test Cases',
                multiSelect: false,
                itemId: "testcases",
                rootVisible: false,
                store: treeStore,
                displayField:"name",
                focused: false,
                autoScroll:true,
                listeners: {
                    checkchange:function(firstNode,checked,eOpt){
                        if (me.loadingData === false){
                            me.markDirty();
                        }
                        me.onDirChecked(firstNode,checked);
                        me.down("#testcases").getRootNode().cascadeBy(function(node){
                            if ((firstNode !== node)&&(node.get("_id") == firstNode.get("_id"))){
                                node.set("checked",checked);
                                me.onDirChecked(node,checked);
                            }
                        });
                        //snapshotBrowser.fireEvent('dirChecked',firstNode,checked);
                    },
                    selectionchange:function(opt1,selectedRecord,opt3){
                        //snapshotBrowser.fireEvent("dirSelection",selectedRecord[0]);
                    },
                    afteritemcollapse:function(node){
                        me.onDirCollapsed(node);
                        //snapshotBrowser.fireEvent("dirCollapsed",node);
                    },
                    afteritemexpand:function(node){
                        me.onDirCollapsed(node);
                        //snapshotBrowser.fireEvent("dirCollapsed",node);
                    }
                }
            }
        ];

        this.callParent(arguments);
    }

});