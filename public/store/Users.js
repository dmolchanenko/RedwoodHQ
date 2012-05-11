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
    fields: ['_id','tag', 'host','description','roles'],

    proxy: {
        type: 'rest',
        model: 'Redwood.model.Machines',
        url: '/machines',
        reader: {
            type: 'json',
            root: 'machines',
            successProperty: 'success'
        }
    }
});