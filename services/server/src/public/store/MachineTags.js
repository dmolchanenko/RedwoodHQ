Ext.define('Redwood.store.MachineTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.MachineTags',

    autoLoad: true,
    autoSync: false,
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'PUT',
        destroy: 'DELETE'
    },
    sorters: [{
        property : 'value'
    }],

    proxy: {
        type: 'rest',
        url: '/machinetags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});