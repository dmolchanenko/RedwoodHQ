Ext.define('Redwood.store.ActionTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.ActionTags',

    autoLoad: {
        callback: function(){Ext.data.StoreManager.lookup('ActionsTree').initialLoad();}
    },
    autoSync: false,

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