Ext.define('Redwood.store.ExecutionTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.ExecutionTags',

    autoLoad: true,
    autoSync: false,
    sorters: [{
        property : 'value'

    }],

    proxy: {
        type: 'rest',
        url: '/executiontags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});