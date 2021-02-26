Ext.define('Redwood.store.Scripts', {
    extend: 'Ext.data.TreeStore',
    model: 'Redwood.model.Scripts',

    autoLoad: true,
    autoSync: false,
    folderSort: true,
    sorters: [{

        property : 'cls',
        direction: 'DESC'

    },
    {
        property : 'text',
        direction: 'ASC'

    }

    ],
    proxy: {
        type: 'rest',
        url: '/scripts',
        reader: {
            type: 'json'
        }
    }
    /*
    root: {
        //leaf : true,
        text: 'src',
        id: 'src',
        cls: 'folder',
        expanded: true,
        fullpath: ""
    }
    */
});