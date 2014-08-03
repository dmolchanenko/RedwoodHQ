Ext.define('Redwood.store.Executions', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.Executions',

    autoLoad: true,
    autoSync: false,
    sorters: [{
        property : 'name',
        direction: 'ASC'
    }],

    proxy: {
        type: 'rest',
        url: '/executions',
        reader: {
            type: 'json',
            root: 'executions',
            successProperty: 'success'
        }
    }
});