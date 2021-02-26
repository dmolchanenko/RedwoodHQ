Ext.define('Redwood.store.VariableTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.VariableTags',

    autoLoad: true,
    autoSync: false,
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'PUT',
        destroy: 'DELETE'
    },
    sorters: [{
        property : 'value'
    }],

    proxy: {
        type: 'rest',
        url: '/variabletags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    }
});