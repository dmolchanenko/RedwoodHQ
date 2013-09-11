Ext.define('Redwood.store.TestCaseTree', {
    extend: 'Ext.data.TreeStore',

    fields: [
        {name: 'name',     type: 'string'},
        {name: 'tagValue',     type: 'string'},
        {name: '_id',     type: 'string'}
    ],
    root: {
        expanded: true,
        children: []
    },
    sorters: [{

        property : 'name',
        direction: 'ASC'

    }],

    loadedData:true,
    icon:"images/testcase.png",

    initialLoad: function(){
        var me = this;
        var testCasesStore = Ext.data.StoreManager.lookup('TestCases');
        var tagStore = Ext.data.StoreManager.lookup('TestCaseTags');
        this.loadedData = true;

        if(testCasesStore.isLoading() == true){this.loadedData = false}
        if(tagStore.isLoading() == true){this.loadedData = false}
        if(this.loadedData == false) return;
        var treeTestCaseStore = this;
        var tags = [];
        tagStore.each(function(tag){
            tags.push({name:tag.get("value"),allowDrag:false,tagValue:tag.get("value"),_id:tag.get("_id"),leaf:false,children:[]});
        });

        var testCases = [];
        testCasesStore.each(function(action){
            if(action.get("tag").length > 0){
                action.get("tag").forEach(function(tagInTC){
                    tags.forEach(function(tag){
                        if (tag.name === tagInTC){
                            tag.children.push({name:action.get("name"),_id:action.get("_id"),leaf:true,icon:me.icon})
                        }
                    })
                });
            }
            else{
                testCases.push({name:action.get("name"),_id:action.get("_id"),leaf:true,icon:me.icon})
            }

        });

        tags.concat(testCases).forEach(function(node){
            treeTestCaseStore.getRootNode().appendChild(node);
        });
        me.sort();
    },

    delete: function(records){
        var me = this;
        records.forEach(function(action){
            var ID;
            if (action.get){
                ID = action.get("_id");
            }
            else{
                ID = action.id;
            }
            me.getRootNode().eachChild(function(node){
                if(!node) return;
                if(node.get("tagValue")){
                    var found = node.findChild("_id",ID);
                    if (found != null){
                        node.removeChild(found);
                        if (node.hasChildNodes() == false){
                            me.getRootNode().removeChild(node);
                        }
                    }
                }
                else{
                    if (node.get("_id") == ID){
                        me.getRootNode().removeChild(node);
                    }
                }
            });
        });
    }
    ,
    add: function(records){
        var me = this;
        records.forEach(function(action){
            var tags;
            var ID;
            var name;

            if (action.get){
                tags = action.get("tag");
                ID = action.get("_id");
                name = action.get("name");
            }
            else{
                tags = action.tag;
                ID = action._id;
                name = action.name;
            }
            //actionsCombo.add(r);
            if(tags.length > 0){
                tags.forEach(function(tagInAction){
                    var foundTag = me.getRootNode().findChild("tagValue",tagInAction);
                    if (foundTag == null){
                        if (me.getRootNode().indexOfId(ID) == -1) me.getRootNode().appendChild({name:tagInAction,allowDrag:false,tagValue:tagInAction,leaf:false,children:[{name:name,_id:ID,leaf:true,icon:me.icon}]});
                    }
                    else{
                        if (foundTag.indexOfId(ID) == -1) foundTag.appendChild({name:name,_id:ID,leaf:true,icon:me.icon})
                    }
                });
            }
            else{
                if (me.getRootNode().indexOfId(ID) == -1) me.getRootNode().appendChild({name:name,_id:ID,leaf:true,icon:me.icon})
            }
        });
        me.sort();
    }
    ,
    update: function(records){
        var me = this;
        records.forEach(function(action){
            var name;
            var tags;
            var ID;
            if (action.get){
                ID = action.get("_id");
                name = action.get("name");
                tags = action.get("tag");
            }
            else{
                ID = action._id;
                name = action.name;
                tags = action.tag;
            }
            me.getRootNode().eachChild(function(node){
                if (!node) return;
                if(node.get("tagValue")){
                    var found = node.findChild("_id",ID);
                    if (found != null){
                        if(tags.indexOf(node.get("name")) == -1){
                            node.removeChild(found);
                            if (node.hasChildNodes() == false){
                                me.getRootNode().removeChild(node);
                            }
                        }
                        else{
                            found.set("name",name)
                        }
                    }
                    else{
                        if(tags.indexOf(node.get("name")) != -1){
                            if (node.indexOfId(ID) == -1) node.appendChild({name:name,_id:ID,leaf:true,icon:me.icon})
                        }
                    }
                }
                else{
                    if (node.get("_id") == ID){
                        if (tags.length != 0){
                            me.getRootNode().removeChild(node);
                        }
                        else{
                            node.set("name",name)
                        }
                    }
                }
            });

            tags.forEach(function(tag){
                var missingTag = me.getRootNode().findChild("tagValue",tag);
                if(missingTag == null){
                    if (me.getRootNode().indexOfId(ID) == -1) me.getRootNode().appendChild({name:tag,allowDrag:false,tagValue:tag,leaf:false,children:[{name:name,_id:ID,leaf:true,icon:me.icon}]});
                }
            });

            if (tags.length == 0){
                if(me.getRootNode().findChild("_id",ID) == null){
                    if (me.getRootNode().indexOfId(ID) == -1) me.getRootNode().appendChild({name:name,_id:ID,leaf:true,icon:me.icon})
                }
            }
        });
        me.sort();
    }
});