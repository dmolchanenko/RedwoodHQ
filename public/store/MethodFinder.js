Ext.define('Redwood.store.MethodFinder', {
    extend: 'Ext.data.TreeStore',
    model: 'Redwood.model.MethodFinder',

    autoLoad: true,
    autoSync: false,
    folderSort: true,

    sorters: [{

        property : 'cls',
        direction: 'ASC'

    },
        {
            property : 'text',
            direction: 'ASC'

        }

    ],
    proxy: {
        appendId:false,
        actionMethods: {
            read   : 'POST'
        },
        type: 'rest',
        url: '/methodFinder',
        reader: {
            type: 'json'
        }
    }

});