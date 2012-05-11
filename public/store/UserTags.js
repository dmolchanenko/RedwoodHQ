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
    fields: ['_id','value'],

    proxy: {
        type: 'rest',
        model: 'Redwood.model.UserTags',
        url: '/usertags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});