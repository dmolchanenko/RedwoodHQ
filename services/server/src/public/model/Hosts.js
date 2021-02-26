Ext.define('Redwood.model.Hosts', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
            name:"host",
            type:"string"
        },
        {
            name: 'description',
            type: 'string'
        },
        {
            name: 'maxVMs',
            type: 'int'
        },
        {
            name: '_id',
            type: 'string'
        }
    ]
});