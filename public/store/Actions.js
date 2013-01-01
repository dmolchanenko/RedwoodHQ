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
        reader: {
            type: 'json',
            root: 'actions',
            successProperty: 'success'
        }
    },
    listeners:{
        load: function(me){
            if (me.initialLoad == false){
                me.initialLoad = true;

                //create another store for actions combo box
                //keep two stores in sync
                var actionsStore = me;

                var actionsCombo = Ext.create('Ext.data.ArrayStore', {
                    storeId: 'ActionsCombo',
                    model:"Redwood.model.Actions",
                    data:[]
                });

                actionsStore.on("beforesync", function(options,eOpts){
                    if (options.create){
                        options.create.forEach(function(r){
                            actionsCombo.add(r);
                        });
                    }
                    if (options.destroy){
                        options.destroy.forEach(function(r){
                            actionsCombo.remove(actionsCombo.findRecord("_id", r.get("_id")));
                        });
                    }
                    if (options.update){
                        options.update.forEach(function(r){
                            actionsCombo.remove(actionsCombo.findRecord("_id", r.get("_id")));
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