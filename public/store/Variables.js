Ext.define('Redwood.store.Variables', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Variables',

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
        url: '/variables',
        reader: {
            type: 'json',
            root: 'variables',
            successProperty: 'success'
        }
    }
});