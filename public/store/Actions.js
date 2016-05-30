Ext.define('Redwood.store.Actions', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Actions',

    initialLoad: false,
    autoLoad: true,
    autoSync: false,
    sorters: [{

        property : 'name',
        direction: 'ASC'

    }],

    proxy: {
        type: 'rest',
        url: '/actions',
        batchActions:true,
        reader: {
            type: 'json',
            root: 'actions',
            successProperty: 'success'
        }
    },

    createSyncedStore: function(name){

    },
    listeners:{
        load: function(me){
            if (me.initialLoad == false){
                me.initialLoad = true;

                Ext.data.StoreManager.lookup('ActionsTree').initialLoad();

                //create another store for actions combo box
                //keep two stores in sync
                var actionsStore = me;

                var actionsCombo = Ext.create('Ext.data.ArrayStore', {
                    storeId: 'ActionsCombo',
                    model:"Redwood.model.Actions",
                    data:[],
                    sorters: [{
                        property : 'name',
                        direction: 'ASC'
                    }]
                });

                actionsStore.on("beforesync", function(options,eOpts){
                    if (options.create){
                        options.create.forEach(function(r){
                            if(actionsCombo.query("name", r.get("name")).length == 0){
                                actionsCombo.add(r);
                            }
                        });
                    }
                    if (options.destroy){
                        options.destroy.forEach(function(r){
                            if (r != null){
                                actionsCombo.remove(actionsCombo.query("_id", r.get("_id")).getAt(0));
                            }
                        });
                    }
                    if (options.update){
                        options.update.forEach(function(r){
                            actionsCombo.remove(actionsCombo.query("_id", r.get("_id")).getAt(0));
                            actionsCombo.add(r);
                        });
                    }
                });

                var records = [];
                actionsStore.each(function(r){
                    records.push(r.copy());
                });
                actionsCombo.add(records);
            }
        }
    }

});