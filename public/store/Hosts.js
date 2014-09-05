Ext.define('Redwood.store.Hosts', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Hosts',

    autoLoad: true,
    autoSync: false,
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'PUT',
        destroy: 'DELETE'
    },
    sorters: [{
        property : 'host'
    }],

    proxy: {
        type: 'rest',
        url: '/hosts',
        reader: {
            type: 'json',
            root: 'hosts',
            successProperty: 'success'
        }
    }
});