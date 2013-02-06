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
        name: 'description',
        type: 'string'
    },
    {
        name: '_id',
        type: 'string'
    }
    ]
});