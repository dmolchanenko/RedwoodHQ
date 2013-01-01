Ext.define('Redwood.store.TestCases', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestCases',

    autoLoad: true,
    autoSync: false,
    sorters: [{

        property : 'name',
        direction: 'ASC'

    }],

    proxy: {
        type: 'rest',
        url: '/testcases',
        reader: {
            type: 'json',
            root: 'testcases',
            successProperty: 'success'
        }
    }
});