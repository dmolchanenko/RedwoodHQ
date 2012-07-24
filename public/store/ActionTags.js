Ext.define('Redwood.store.ActionTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.ActionTags',

    autoLoad: true,
    autoSync: false,
    fields: ['_id','value'],

    proxy: {
        type: 'rest',
        url: '/actiontags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});