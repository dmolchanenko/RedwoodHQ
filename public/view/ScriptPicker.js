Ext.define('Redwood.view.ScriptViewer', {
    extend: 'Ext.window.Window',
    alias: 'widget.scriptViewer',
    width: 400,
    height: 300,
    layout: 'fit',
    draggable: true,
    resizable: true,
    modal: true,
    title: 'Select Script',

    initComponent: function () {
        this.items=[
            {
                xtype: "panel",
                layout: "fit",
                items:[
                    {
                        xtype: 'treepanel',
                        multiSelect: false,
                        rootVisible: false,
                        store: Ext.data.StoreManager.lookup('Scripts'),
                        focused: false,
                        viewConfig: {
                            markDirty: false,
                            stripeRows: true
                        }
                    }
                ]
            }

        ];
        this.callParent(arguments);
    }


});


Ext.define('Redwood.view.ScriptPicker', {
    extend: 'Ext.form.field.Trigger',
    alias: 'widget.scriptPicker',

    trigger1Cls: Ext.baseCSSPrefix + 'form-search-trigger',
    fieldLabel: "Select Script",

    onTriggerClick: function() {
        var scripts = new Redwood.view.ScriptViewer();
        scripts.show();
    }

});