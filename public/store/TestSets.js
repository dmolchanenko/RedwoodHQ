Ext.define('Redwood.store.TestSets', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestSets',

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
        url: '/testsets',
        reader: {
            type: 'json',
            root: 'testsets',
            successProperty: 'success'
        }
    }
});