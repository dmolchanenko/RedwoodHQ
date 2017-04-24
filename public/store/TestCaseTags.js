Ext.define('Redwood.store.TestCaseTags', {
    extend: 'Ext.data.Store',
    model: 'Redwood.model.TestCaseTags',

    autoSync: false,
    autoLoad: {
        callback: function(){Ext.data.StoreManager.lookup('TestCaseTree').initialLoad();}
    },
    sorters: [{
        property : 'value'
    }],
    proxy: {
        type: 'rest',
        url: '/testcasetags',
        reader: {
            type: 'json',
            root: 'tags',
            successProperty: 'success'
        }
    },
    listeners:{
        add:function(store , records , index , eOpts ){
            records.forEach(function(record){
                if(record.get("_id") == ""){
                    record.set("_id",Ext.uniqueId());
                    delete record.dirty;
                    delete record.modified._id;
                }
            })
        }
    }
});