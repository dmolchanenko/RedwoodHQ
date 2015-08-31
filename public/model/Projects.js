Ext.define('Redwood.model.Projects', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
            name:"name",
            type:"string"
        },
        {
            name:"key",
            type:"string"
        },
        {
            name: 'language',
            type: 'string'
        },
        {
            name: 'template',
            type: 'string'
        },
        {
            name: '_id',
            type: 'string'
        },
        {
            name: 'tcFields',
            type: 'array'
        }
    ]
});