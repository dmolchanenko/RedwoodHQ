Ext.define('Redwood.view.ImageView', {
    extend: 'Ext.panel.Panel',
    dataRecord: null,
    _id:null,
    alias: 'widget.imageview',
    dirty:false,
    loadingData:true,
    bodyPadding: 5,

    initComponent: function () {
        var me = this;
        this.markDirty = function(){
            this.dirty = true;
            if(me.title.charAt(me.title.length-1) != "*"){
                me.setTitle(me.title+"*")
            }
        };
        this.items = [
            {
                xtype: 'fieldset',
                title: 'Details',
                defaultType: 'textfield',
                flex: 1,
                collapsible: true,
                items:[
                    {
                        xtype:"textfield",
                        fieldLabel: "Name",
                        allowBlank: false,
                        labelStyle: "font-weight: bold",
                        itemId:"name",
                        //anchor:'90%',
                        listeners:{
                            change: function(){
                                if (me.loadingData === false){
                                    me.markDirty();
                                }
                            }
                        }
                    }
                ]
            },
            {
                xtype:"panel",
                html: '<img src="'+location.protocol + "//" + location.host +"/image/"+me._id +'" height="200">'
            }
        ];

        this.callParent(arguments);
    }
});