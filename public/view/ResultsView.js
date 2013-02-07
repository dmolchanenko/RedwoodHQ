
Ext.define('Redwood.view.ResultsView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.resultsview',
    overflowY: 'auto',
    bodyPadding: 5,
    dataRecord: null,
    viewType: "Results",

    initComponent: function () {
        var me = this;

        this.items = [
            {
                xtype: 'fieldset',
                title: 'Details',
                defaultType: 'textfield',
                flex: 1,
                collapsible: true,
                defaults: {
                    flex: 1
                },
                items: [
                    {
                        xtype: 'displayfield',
                        fieldLabel: "Name",
                        allowBlank: false,
                        labelStyle: "font-weight: bold",
                        itemId:"name",
                        anchor:'90%'
                    },
                    {
                        xtype: 'displayfield',
                        fieldLabel: "Status",
                        allowBlank: false,
                        labelStyle: "font-weight: bold",
                        itemId:"status",
                        anchor:'90%',
                        renderer: function(value,field){
                            if (value == "Passed"){
                                return "<p style='color:green'>"+value+"</p>"
                            }
                            else if (value == "Failed"){
                                return "<p style='color:red'>"+value+"</p>"
                            }
                            else{
                                return value;
                            }
                        }
                    }
                ]
            }
        ]


    }

});