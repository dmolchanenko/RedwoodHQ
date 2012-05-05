Ext.define('Ext.ux.ComboGridBox',
    {extend : 'Ext.form.ComboBox',
        alias : 'widget.combogridbox',
        dataIndex:null,
        grid:null,

        initComponent: function(){
            var me = this;

            this.data = new Ext.util.MixedCollection();

            this.store = Ext.create('Ext.data.Store', {
                autoDestroy: true,
                fields: [
                    {name: 'value', type: 'string'}
                ],
                data:this.data,
                autoLoad: true,
                autoSync: true
            });

            this.grid.on('beforeedit', function (editor,e,eOpt) {
                var array = e.record.get(me.dataIndex);
                me.store.removeAll();

                for(var i=0;i<array.length;i++){
                    me.store.add({'value':array[i]});
                }
                return true;
            });
            this.callParent();
        }
});
