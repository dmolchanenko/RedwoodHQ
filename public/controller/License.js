Ext.define("Redwood.controller.License", {
    extend: 'Ext.app.Controller',

    views:  ['LicenseEditor'],

    init: function () {
        this.control({
            'licenseEditor': {
                render: this.onEditorRender,
                setLicense: this.onSetLicense
            }
        });
    },
    onSetLicense: function(licenseText){
        var me = this;
        if (licenseText === ""){
            Ext.Msg.show({title: "Invalid License",msg:"Please Enter Valid License",buttons : Ext.MessageBox.OK});
            return;
        }
        //console.log(licenseText)
        Ext.Ajax.request({
            url:"/license",
            method:"POST",
            jsonData : {licenseText:licenseText},
            success: function(response) {
                //console.log(response);
                var obj = Ext.decode(response.responseText);
                if (obj.response.indexOf("LICENSE_VALID") == -1){
                    Ext.Msg.show({title: "Invalid License",msg:obj.response,iconCls:'error',buttons : Ext.MessageBox.OK});
                }
                else{
                    Ext.Msg.show({title: "Valid License",msg:"Valid License Entered",buttons : Ext.MessageBox.OK});
                    me.licenseEditor.down("#numberOfUsers").setValue(obj.users);
                }
                //executionView.up("executionsEditor").down("#runExecution").setDisabled(false);
            }
        });
    },

    onEditorRender: function(){
        var me = this;
        this.licenseEditor = Ext.ComponentQuery.query('licenseEditor')[0];
        Ext.Ajax.request({
            url:"/license",
            method:"GET",
            success: function(response) {
                //console.log(response);
                var obj = Ext.decode(response.responseText);
                //if (obj.response.indexOf("LICENSE_VALID") == -1){
                    //Ext.Msg.show({title: "Invalid License",msg:obj.response,iconCls:'error',buttons : Ext.MessageBox.OK});
                //}
                //else{
                    //Ext.Msg.show({title: "Valid License",msg:"Valid License Entered",buttons : Ext.MessageBox.OK});
                    me.licenseEditor.down("#numberOfUsers").setValue(obj.users);
                //}
                //executionView.up("executionsEditor").down("#runExecution").setDisabled(false);
            }
        });
    }
});