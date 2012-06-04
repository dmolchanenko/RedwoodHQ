Ext.define('Redwood.store.Users', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Users',

    autoLoad: true,
    autoSync: false,
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'PUT',
        destroy: 'DELETE'
    },
    fields: ['_id','tag', 'username','password','role'],

    proxy: {
        type: 'rest',
        model: 'Redwood.model.Users',
        url: '/users',
        reader: {
            type: 'json',
            root: 'users',
            successProperty: 'success'
        }
    }
});