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
            name:"locked",
            type:"boolean"
        },
        {
            name:"ignoreStatus",
            type:"boolean"
        },
        {
            name: 'testset',
            type: 'string'
        },
        {
            name: 'resultID',
            type: 'string'
        },
        {
            name: 'baseStateTCID',
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
            name: 'machines',
            type: 'array'
        },
        {
            name: '_id',
            type: 'string'
        }
    ]
});