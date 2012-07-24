Ext.define('Redwood.model.ActionTags', {
    extend: 'Ext.data.Model',
    idProperty: '_id',

    fields: [
        {
        name: 'value',
        type: 'string'
    }, {
        name: '_id',
        type: 'string'
    }]
});