Ext.define('Redwood.model.Variables', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [{
        name: 'tag',
        type: 'array'
    }, {
        name: 'name',
        type: 'string'
    }, {
        name: 'value',
        type: 'string'
    }, {
        name: '_id',
        type: 'string'
    },
    {
        name: 'taskVar',
        type: 'bool'
    },
        {
            name: 'possibleValues',
            type: 'array'
        }
    ]
});