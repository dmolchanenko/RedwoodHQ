Ext.define('Redwood.store.Machines', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Machines',

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
        url: '/machines',
        reader: {
            type: 'json',
            root: 'machines',
            successProperty: 'success'
        }
    }
});