Ext.define('Redwood.model.Users', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
            name:"name",
            type:"string"
        },
        {
            name:"password",
            type:"string"
        },
        {
            name: 'tag',
            type: 'array'
        },{
            name: 'role',
            type: 'string'
        }, {
            name: 'username',
            type: 'string'
        }, {
            name: '_id',
            type: 'string'
        }
    ]
});