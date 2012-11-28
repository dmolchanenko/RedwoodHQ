Ext.define('Redwood.store.Actions', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Actions',

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
    }
});