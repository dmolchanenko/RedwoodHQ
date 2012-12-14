Ext.define('Redwood.store.Projects', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Projects',

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
        url: '/projects',
        reader: {
            type: 'json',
            root: 'projects',
            successProperty: 'success'
        }
    }
});