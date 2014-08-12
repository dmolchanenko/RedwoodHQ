Ext.define('Redwood.store.Executions', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Executions',

    autoLoad: true,
    autoSync: false,
    sorters: [{
        property : 'name',
        direction: 'ASC'
    }],

    listeners:{
        datachanged: function(store){
            var filters = store.filters.items;
            if(filters.length > 0) {
                if(store.resettingFilters != true){
                    store.resettingFilters = true;
                    store.clearFilter(true);
                    store.filter(filters);
                }
                else{
                    store.resettingFilters = false;
                }
            }
        }
    },

    proxy: {
        type: 'rest',
        url: '/executions',
        reader: {
            type: 'json',
            root: 'executions',
            successProperty: 'success'
        }
    }
});