Ext.define('Redwood.model.Executions', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
            name:"name",
            type:"string"
        },
        {
            name:"status",
            type:"string"
        },
        {
            name: 'testset',
            type: 'string'
        },
        {
            name: 'testsetname',
            type: 'string'
        },
        {
            name: 'tag',
            type: 'array'
        },
        {
            name: 'variables',
            type: 'array'
        },
        {
            name: '_id',
            type: 'string'
        }
    ]
});