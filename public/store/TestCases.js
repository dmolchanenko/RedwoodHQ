Ext.define('Redwood.store.TestCases', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestCases',

    autoLoad: true,
    autoSync: false,
    initialLoad: false,
    sorters: [{

        property : 'name',
        direction: 'ASC'

    }],
    listeners:{
        load: function(me){
            if (me.initialLoad == false){
                me.initialLoad = true;

                Ext.data.StoreManager.lookup('TestCaseTree').initialLoad();
            }
        }
    },

    proxy: {
        type: 'rest',
        url: '/testcases',
        reader: {
            type: 'json',
            root: 'testcases',
            successProperty: 'success'
        }
    }
});