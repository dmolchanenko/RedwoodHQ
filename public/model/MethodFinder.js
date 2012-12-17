Ext.define('Redwood.model.MethodFinder', {
    extend: 'Ext.data.Model',
    idProperty: 'fullpath',

    fields: [
        {
            name:"text",
            type:"string"
        },
        {
            name:"cls",
            type:"string"
        },
        {
            name:"fileType",
            type:"string"
        },
        {
            name: 'expanded',
            type: 'boolean'
        },{
            name: 'children',
            type: 'array'
        },{
            name: 'fullpath',
            type: 'string'
        }
    ]

});