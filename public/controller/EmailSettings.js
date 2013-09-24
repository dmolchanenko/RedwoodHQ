Ext.define("Redwood.controller.EmailSettings", {
    extend: 'Ext.app.Controller',

    views:  ['EmailSettings'],

    init: function () {
        this.control({
            'emailSettings': {
                render: this.onEditorRender,
                setEmailSettings: this.setEmailSettings
            }
        });
    },
    setEmailSettings: function(settings){
        Ext.Ajax.request({
            url:"/emailsettings",
            method:"POST",
            jsonData : settings,
            success: function(response) {
            }
        });
    },

    onEditorRender: function(){
        var me = this;
        this.emailSettings = Ext.ComponentQuery.query('emailSettings')[0];

        Ext.Ajax.request({
            url:"/emailsettings",
            method:"GET",
            success: function(response) {
                var obj = Ext.decode(response.responseText);
                if(obj.host) me.emailSettings.loadData(obj);
            }
        });
    }
});