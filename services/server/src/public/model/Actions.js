Ext.define('Redwood.model.Actions', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [{
        name: 'tag',
        type: 'array'
    },{
        name: 'params',
        type: 'array'
    }, {
        name: 'name',
        type: 'string'
    },
    {
        name: 'description',
        type: 'string'
    },
    {
        name: 'type',
        type: 'string'
    },
    {
        name: 'status',
        type: 'string'
    },
    {
        name: '_id',
        type: 'string'
    },
    {
        name: 'collection',
        type: 'array'
    },
    {
        name: 'script',
        type: 'string'

    },
    {
        name: 'scriptLang',
        type: 'string'

    }
    ]
});