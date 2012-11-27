Ext.define('Redwood.store.Actions', {
    extend: 'Ext.data.Store',

    autoLoad: true,
    autoSync: false,

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