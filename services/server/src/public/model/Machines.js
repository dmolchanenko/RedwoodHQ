Ext.define('Redwood.model.Machines', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [{
        name: 'tag',
        type: 'array'
    },{
        name: 'roles',
        type: 'array'
    },
    {
        name: 'state',
        type: 'string'
    }, {
        name: 'host',
        type: 'string'
    }, {
        name: 'macAddress',
        type: 'string'
    }, {
        name: 'port',
        type: 'string'
    }, {
        name: 'vncport',
        type: 'string'
    }, {
        name: 'description',
        type: 'string'
    }, {
        name: 'maxThreads',
        type: 'int'
    },{
        name: 'machineVars',
        type: 'array'
    },
    {
        name: '_id',
        type: 'string'
    }
    ]
});