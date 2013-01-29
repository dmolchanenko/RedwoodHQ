Ext.define('Ext.ux.ComboGridBox',
    {extend : 'Ext.form.ComboBox',
        alias : 'widget.combogridbox',
        dataIndex:null,
        grid:null,
        displayNULLOption:false,

        initComponent: function(){
            var me = this;

            this.data = new Ext.util.MixedCollection();

            this.store = Ext.create('Ext.data.Store', {
                autoDestroy: true,
                fields: [
                    {name: 'value', type: 'string'},
                    {name: 'text', type: 'string'}
                ],
                data:this.data,
                autoLoad: true,
                autoSync: true
            });

            this.grid.on('beforeedit', function (editor,e,eOpt) {
                var array = e.record.get(me.dataIndex);
                me.store.removeAll();

                for(var i=0;i<array.length;i++){
                    var tmpObj = {};
                    tmpObj[me.displayField] = Ext.util.Format.htmlEncode(array[i]);
                    tmpObj[me.valueField] = array[i];
                    me.store.add(tmpObj);
                    //me.store.add({'value':array[i]});
                }
                if (me.displayNULLOption == true){
                    var tmpObj = {};
                    tmpObj[me.displayField] = Ext.util.Format.htmlEncode("<NULL>");
                    tmpObj[me.valueField] = "<NULL>";
                    me.store.add(tmpObj);
                }
                return true;
            });
            this.callParent();
        }
});
