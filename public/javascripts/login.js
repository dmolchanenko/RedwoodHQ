Ext.require([
    '*'
]);

Ext.onReady(function() {
    //var bd = Ext.getBody();
    var bd = Ext.getDom("loginForm");

    var simple = Ext.widget({

        xtype: 'form',
        layout: 'form',
        style: "margin: 0px auto 0px auto;",
        collapsible: false,
        id: 'loginForm',
        url: '/login',
        frame: true,
        title: 'Login',
        bodyPadding: '5 5 0',
        width: 350,
        fieldDefaults: {
            msgTarget: 'side',
            labelWidth: 75
        },
        defaultType: 'textfield',
        items: [{
            fieldLabel: 'User ID',
            name: 'username',
            allowBlank:false,
            listeners: {
                specialkey: function(field, e){
                    if (e.getKey() == e.ENTER) {
                        submitFunction();
                    }
                }
            }

        },{
            fieldLabel: 'Password',
            name: 'password',
            inputType: 'password',
            allowBlank:false,
            listeners: {
                specialkey: function(field, e){
                    if (e.getKey() == e.ENTER) {
                        submitFunction();
                    }
                }
            }
        }],
        buttonAlign: 'center',
        buttons: [{
            text: 'Login',
            handler: submitFunction }]
    });

    function submitFunction() {
        var form = Ext.getCmp("loginForm").getForm();
        //var form = this.up('form').getForm();
        if (form.isValid()) {
            // Submit the Ajax request and handle the response
            Ext.Ajax.request({
                //form:form,
                url:form.url,
                //headers:{"content-type":"application/json"},
                method:"POST",
                jsonData : form.getFieldValues(),
                success: function(response, action) {
                    var obj = Ext.decode(response.responseText);
                    console.log(obj);
                    if(obj.error == null){
                        window.location.href=obj.redirect;
                    }
                    else{
                        Ext.get("error").update(obj.error);
                    }
                },
                failure: function(response, action) {
                    //Ext.Msg.alert('Failed', action.result.msg);
                }
            });
        }
    }


    simple.render(bd);
    var allFields = simple.form.getFields();
    var username = Ext.util.Cookies.get("username");
    if (username == null){
        allFields.getAt(0).focus();
    }
    else{
        allFields.getAt(0).setValue(username);
        allFields.getAt(1).focus();
    }
    //simple.render(document.body);

});
