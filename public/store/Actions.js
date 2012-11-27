Ext.define('Redwood.store.Actions', {
    extend: 'Ext.data.Store',

    autoLoad: true,
    autoSync: false,
    sorters: [{

        property : 'name',
        direction: 'ASC'

    }],

    proxy: {
        type: 'rest',
        model: 'Redwood.model.Actions',
        url: '/actions',
        reader: {
            type: 'json',
            root: 'actions',
            successProperty: 'success'
        }
    }
});