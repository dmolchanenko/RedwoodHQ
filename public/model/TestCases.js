Ext.define('Redwood.model.TestCases', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [{
        name: 'tag',
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
            name: 'tcData',
            type: 'array'
        },
        {
            name: 'rowIndex',
            type: 'int'
        },
        {
            name: 'script',
            type: 'string'

        },
        {
            name: 'scriptLang',
            type: 'string'

        },
        {
            name: 'host',
            type: 'string'

        },
        {
            name: 'type',
            type: 'string'
        },
        {
            name: 'afterState'
        }
    ]
});