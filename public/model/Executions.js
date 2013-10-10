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
            name:"emails",
            type:"array"
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
            name:"allScreenshots",
            type:"boolean"
        },
        {
            name:"ignoreAfterState",
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
            name: 'lastRunDate',
            type: 'date'
        },
        {
            name: 'runtime',
            type: 'int'
        },
        {
            name: 'passed',
            type: 'int'
        },
        {
            name: 'failed',
            type: 'int'
        },
        {
            name: 'total',
            type: 'int'
        },
        {
            name: 'notRun',
            type: 'int'
        },
        {
            name: '_id',
            type: 'string'
        }
    ]
});