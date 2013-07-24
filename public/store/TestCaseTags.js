Ext.define('Redwood.store.TestCaseTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestCaseTags',

    autoSync: false,
    autoLoad: {
        callback: function(){Ext.data.StoreManager.lookup('TestCaseTree').initialLoad();}
    },

    proxy: {
        type: 'rest',
        url: '/testcasetags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});