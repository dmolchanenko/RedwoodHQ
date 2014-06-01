Ext.define('Redwood.model.Templates', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
            name:"name",
            type:"string"
        },
        {
            name: 'description',
            type: 'string'
        },
        {
            name: 'os',
            type: 'string'
        },
        {
            name: '_id',
            type: 'string'
        }
    ]
});