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
                if(node.get("tagValue")){
                    var foundAction = node.findChild("_id",actionID);
                    if (foundAction != null){
                        node.removeChild(foundAction);
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
            var actionTags;
            var actionID;
            var actionName;

            if (action.get){
                actionTags = action.get("tag");
                actionID = action.get("_id");
                actionName = action.get("name");
            }
            else{
                actionTags = action.tag;
                actionID = action._id;
                actionName = action.name;
            }
            //actionsCombo.add(r);
            if(actionTags.length > 0){
                actionTags.forEach(function(tagInAction){
                    var foundTag = me.getRootNode().findChild("tagValue",tagInAction);
                    if (foundTag == null){
                        me.getRootNode().appendChild({name:tagInAction,allowDrag:false,tagValue:tagInAction,leaf:false,children:[{name:actionName,_id:actionID,leaf:true}]});
                    }
                    else{
                        foundTag.appendChild({name:actionName,_id:actionID,leaf:true})
                    }
                });
            }
            else{
                me.getRootNode().appendChild({name:actionName,_id:actionID,leaf:true})
            }
        });
    }
    ,
    updateActions: function(records){
        var me = this;
        records.forEach(function(action){
            var actionName;
            var actionTags;
            var actionID;
            if (action.get){
                actionID = action.get("_id");
                actionName = action.get("name");
                actionTags = action.get("tag");
            }
            else{
                actionID = action._id;
                actionName = action.name;
                actionTags = action.tag;
            }
            me.getRootNode().eachChild(function(node){
                if(node.get("tagValue")){
                    var foundAction = node.findChild("_id",actionID);
                    if (foundAction != null){
                        if(actionTags.indexOf(node.get("name")) == -1){
                            node.removeChild(foundAction);
                        }
                        else{
                            foundAction.set("name",actionName)
                        }
                    }
                    else{
                        if(actionTags.indexOf(node.get("name")) != -1){
                            node.appendChild({name:actionName,_id:actionID,leaf:true})
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
                        }
                    }
                }
            });

            actionTags.forEach(function(tag){
                var missingTag = me.getRootNode().findChild("tagValue",tag);
                if(missingTag == null){
                    me.getRootNode().appendChild({name:tag,allowDrag:false,tagValue:tag,leaf:false,children:[{name:actionName,_id:actionID,leaf:true}]});
                }
            });

            if (actionTags.length == 0){
                if(me.getRootNode().findChild("_id",actionID) == null){
                    me.getRootNode().appendChild({name:actionName,_id:actionID,leaf:true})
                }
            }
        });
    }
});