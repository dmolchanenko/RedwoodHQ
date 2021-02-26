Ext.define('Redwood.store.ActionsTree', {
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
    sortOnLoad:true,

    loadedData:true,
    icon:"images/action.png",

    initialLoad: function(){
        var me = this;
        var actionsStore = Ext.data.StoreManager.lookup('Actions');
        var tagStore = Ext.data.StoreManager.lookup('ActionTags');
        this.loadedData = true;

        if(actionsStore.isLoading() == true){this.loadedData = false}
        if(tagStore.isLoading() == true){this.loadedData = false}
        if(this.loadedData == false) return;
        var treeActionsStore = this;
        //var treeActionsStore = Ext.data.StoreManager.lookup('ActionsTree');
        var tags = [];
        tagStore.each(function(tag){
            tags.push({name:tag.get("value"),allowDrag:false,tagValue:tag.get("value"),_id:tag.get("_id"),leaf:false,children:[]});
        });

        var actions = [];
        actionsStore.each(function(action){
            if(action.get("tag").length > 0){
                action.get("tag").forEach(function(tagInTC){
                    tags.forEach(function(tag){
                        if (tag.name === tagInTC){
                            tag.children.push({name:action.get("name"),_id:action.get("_id"),leaf:true,icon:me.icon,qtip:action.get("description")})
                        }
                    })
                });
            }
            else{
                actions.push({name:action.get("name"),_id:action.get("_id"),leaf:true,icon:me.icon,qtip:action.get("description")})
            }

        });

        tags.concat(actions).forEach(function(node){
            treeActionsStore.getRootNode().appendChild(node);
        });
        me.sort();
    },

    deleteActions: function(records){
        var me = this;
        records.forEach(function(action){
            var actionID;
            if (action.get){
                actionID = action.get("_id");
            }
            else{
                actionID = action.id;
            }
            me.getRootNode().eachChild(function(node){
                if(!node) return;
                if(node.get("tagValue")){
                    var foundAction = node.findChild("_id",actionID);
                    if (foundAction != null){
                        node.removeChild(foundAction);
                        if (node.hasChildNodes() == false){
                            me.getRootNode().removeChild(node);
                        }
                    }
                }
                else{
                    if (node.get("_id") == actionID){
                        me.getRootNode().removeChild(node);
                    }
                }
            });
        });
    }
    ,
    addActions: function(records){
        var me = this;
        records.forEach(function(action){
            //if another project ignore it
            if(action.project && action.project != Ext.util.Cookies.get("project")){
                return;
            }

            var actionTags;
            var actionID;
            var actionName;
            var actionDescription;

            if (action.get){
                actionTags = action.get("tag");
                actionID = action.get("_id");
                actionName = action.get("name");
                actionDescription = action.get("description");
            }
            else{
                actionTags = action.tag;
                actionID = action._id;
                actionName = action.name;
                actionDescription = action.description;
            }
            //actionsCombo.add(r);
            if(actionTags && actionTags.length > 0){
                actionTags.forEach(function(tagInAction){
                    var foundTag = me.getRootNode().findChild("tagValue",tagInAction);
                    if (foundTag == null){
                        if (me.getRootNode().indexOfId(actionID) == -1) me.getRootNode().appendChild({name:tagInAction,allowDrag:false,tagValue:tagInAction,leaf:false,children:[{name:actionName,_id:actionID,leaf:true,icon:me.icon,qtip:actionDescription}]});
                    }
                    else{
                        if (foundTag.indexOfId(actionID) == -1) foundTag.appendChild({name:actionName,_id:actionID,leaf:true,icon:me.icon,qtip:actionDescription})
                    }
                });
            }
            else{
                if (me.getRootNode().indexOfId(actionID) == -1) me.getRootNode().appendChild({name:actionName,_id:actionID,leaf:true,icon:me.icon,qtip:actionDescription})
            }
        });
        me.sort();
    }
    ,
    updateActions: function(records){
        var me = this;
        records.forEach(function(action){
            var actionName;
            var actionTags;
            var actionID;
            var actionDescription;

            if (action.get){
                actionID = action.get("_id");
                actionName = action.get("name");
                actionTags = action.get("tag");
                actionDescription = action.get("description");
            }
            else{
                actionID = action._id;
                actionName = action.name;
                actionTags = action.tag;
                actionDescription = action.description;
            }
            me.getRootNode().eachChild(function(node){
                if (!node) return;
                if(node.get("tagValue")){
                    var foundAction = node.findChild("_id",actionID);
                    if (foundAction != null){
                        if(actionTags.indexOf(node.get("name")) == -1){
                            node.removeChild(foundAction);
                            if (node.hasChildNodes() == false){
                                me.getRootNode().removeChild(node);
                            }
                        }
                        else{
                            foundAction.set("name",actionName)
                            foundAction.set("qtip",actionDescription)
                        }
                    }
                    else{
                        if(actionTags.indexOf(node.get("name")) != -1){
                            if (node.indexOfId(actionID) == -1) node.appendChild({name:actionName,_id:actionID,leaf:true,icon:me.icon,qtip:actionDescription})
                        }
                    }
                }
                else{
                    if (node.get("_id") == actionID){
                        if (actionTags.length != 0){
                            me.getRootNode().removeChild(node);
                        }
                        else{
                            node.set("name",actionName)
                            node.set("qtip",actionDescription)
                        }
                    }
                }
            });

            actionTags.forEach(function(tag){
                var missingTag = me.getRootNode().findChild("tagValue",tag);
                if(missingTag == null){
                    if (me.getRootNode().indexOfId(actionID) == -1) me.getRootNode().appendChild({name:tag,allowDrag:false,tagValue:tag,leaf:false,children:[{name:actionName,_id:actionID,leaf:true,icon:me.icon,qtip:actionDescription}]});
                }
            });

            if (actionTags.length == 0){
                if(me.getRootNode().findChild("_id",actionID) == null){
                    if (me.getRootNode().indexOfId(actionID) == -1) me.getRootNode().appendChild({name:actionName,_id:actionID,leaf:true,icon:me.icon,qtip:actionDescription})
                }
            }
        });
        me.sort();
    }
});