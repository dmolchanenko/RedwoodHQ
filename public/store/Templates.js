Ext.define('Redwood.store.Templates', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Templates',

    autoLoad: true,
    autoSync: false,
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'PUT',
        destroy: 'DELETE'
    },

    proxy: {
        type: 'rest',
        url: '/templates',
        reader: {
            type: 'json',
            root: 'templates',
            successProperty: 'success'
        }
    }
});