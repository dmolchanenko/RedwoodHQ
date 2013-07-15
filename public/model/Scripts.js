Ext.define('Redwood.model.Scripts', {
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
        },{
            name: 'inConflict',
            type: 'boolean'
        },{
            name: 'name',
            type: 'string'
        },{
            name: 'qtip',
            type: 'string'
        }
    ]

});