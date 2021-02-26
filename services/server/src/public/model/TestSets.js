Ext.define('Redwood.model.TestSets', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
            name:"name",
            type:"string"
        },
        {
            name: 'testcases',
            type: 'array'
        },
        {
            name: '_id',
            type: 'string'
        }
    ]
});