Ext.define('Redwood.store.TestCaseTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestCaseTags',

    autoSync: false,
    autoLoad: {
        callback: function(){Ext.data.StoreManager.lookup('TestCaseTree').initialLoad();}
    },
    sorters: [{
        property : 'value'
    }],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        idParam:"_id",
        url: '/testcasetags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    },
});