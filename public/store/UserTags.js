Ext.define('Redwood.store.UserTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.UserTags',

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
        url: '/usertags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});