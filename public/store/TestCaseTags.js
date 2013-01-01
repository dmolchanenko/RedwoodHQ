Ext.define('Redwood.store.TestCaseTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestCaseTags',

    autoLoad: true,
    autoSync: false,

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