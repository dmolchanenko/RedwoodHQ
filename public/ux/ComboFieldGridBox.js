Ext.define('Ext.ux.ComboFieldGridBox',
    {extend : 'Ext.ux.ComboFieldBox',
        alias : 'widget.combofieldgridbox',
        grid: null,
        dataIndex:null,
        data:null,


        initComponent: function(){
            var me = this;

            this.data = new Ext.util.MixedCollection();
            //this.data.add('value','');
            //this.store.data = this.data;

            this.store = Ext.create('Ext.data.Store', {
                autoDestroy: true,
                fields: [
                    {name: 'value', type: 'string'}
                ],
                data:this.data,
                autoLoad: true,
                autoSync: true
            });

            /*
            var array = e.record.get(me.dataIndex);
            this.data = new Ext.util.MixedCollection();
            for(var i=0;i<array.length;i++){
                coll.add('value', array[i]);
            }
            */
            this.grid.on('beforeedit', function (editor,e,eOpt) {
                //return true;
                var array = e.record.get(me.dataIndex);
                me.store.removeAll();

                //var coll = new Ext.util.MixedCollection();
                for(var i=0;i<array.length;i++){
                    me.store.add({'value':array[i]});
                }
                //me.store.data = coll;
                return true;
            });
            me.callParent();
        }
});