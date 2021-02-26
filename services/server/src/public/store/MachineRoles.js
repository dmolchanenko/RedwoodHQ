Ext.define('Redwood.store.MachineRoles', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.MachineRoles',

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
        url: '/machineroles',
        reader: {
            type: 'json',
            root: 'roles',
            successProperty: 'success'
        }
    }
});