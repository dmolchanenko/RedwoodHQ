//loadRecord
Ext.apply(Ext.form.field.VTypes, {
    passwordTest: function(val,field){
        if (field.up('form').getValues().secondpassword != field.up('form').getValues().firstpassword){
            return false;
        }
        if (field.getName() == 'firstpassword'){
            field.up('form').getForm().findField("secondpassword").clearInvalid();

        }
        else{
            field.up('form').getForm().findField("firstpassword").clearInvalid();
        }
        return true;
    },
    passswordTestText: 'Password fields should match',
    userIDTestText: 'User with the same ID already exists',
    userIDTest: function(val,field){
        var store = Ext.data.StoreManager.lookup('Users');
        var index = store.findExact(field.name,val);
        if (index != -1){
            return false;
        }
        return true;
    },

    userIDTestMask: /[a-z_0-9]/
});

Ext.define('Redwood.view.UserEdit', {
    extend: 'Ext.window.Window',
    alias: 'widget.userEdit',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    newUser: true,
    defaultFocus: "username",
    title: 'User Properties',
    id: "EditUser",
    draggable: true,
    resizable: false,
    width: 400,
    height: 300,
    layout: 'fit',
    modal: true,
    //onAfterrender: function(me,eOpts){
    //    this.down('form').getForm().findField("username").focus();
    //},
    initComponent: function () {
        this.items= {
            xtype:"form",
            layout:"anchor",
            bodyPadding: 5,
            defaults: {
                anchor: '100%'
            },
            buttons: [
            {
                text: 'Submit',
                itemId: "submit",
                formBind: true, //only enabled once the form is valid
                disabled: true,
                handler: function() {
                    this.setDisabled(true);
                    var form = this.up('form').getForm();
                    if (form.isValid()) {
                        var window = this.up('window');
                        if (window.newUser == false){
                            var record = form.getRecord();
                            record.dirty = true;
                            if (form.getFieldValues().firstpassword != "**********************"){
                                record.set("password",form.getFieldValues().firstpassword);
                            }
                            form.updateRecord();
                            Ext.data.StoreManager.lookup('UserTags').sync();
                            Ext.data.StoreManager.lookup('Users').sync({success:function(){
                                record.set("password","");
                            }});
                            window.close();
                        }else{
                            //Ext.Ajax.request({
                            //    url:"/canadduser",
                            //    method:"POST",
                            //    success: function(response) {
                                    //var obj = Ext.decode(response.responseText);
                                    //if(obj.ableToAdd === true){
                                        var newUser = {};
                                        newUser.name = form.getFieldValues().name;
                                        newUser.tag = form.getFieldValues().tag;
                                        newUser.password = form.getFieldValues().firstpassword;
                                        newUser.username = form.getFieldValues().username;
                                        newUser.email = form.getFieldValues().email;
                                        newUser.role = form.getFieldValues().role;
                                        Ext.data.StoreManager.lookup('Users').add(newUser);
                                        Ext.data.StoreManager.lookup('UserTags').sync();
                                        Ext.data.StoreManager.lookup('Users').sync();
                                        window.close();
                                    //}
                            //        else{
                            //            Ext.Msg.show({title: "License Error",msg:"Unable to add new user, license limit is reached.",iconCls:'error',buttons : Ext.MessageBox.OK});
                            //            window.close();
                            //        }
                            //    }
                            //});
                        }

                        //this.up('form').up('window').close();

                    }
                }
            },
            {
                text: 'Cancel',
                handler: function() {
                    this.up('form').up('window').close();
                }
            }],

            items: [{
                    xtype:'textfield',
                    itemId:"username",
                    id: "username",
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'User ID',
                    name: 'username',
                    vtype:'userIDTest',
                    allowBlank: false,
                    maskRe: /[a-z_0-9_A-Z]/,
                    //maskRe: /^[a-z](\w*)[a-z0-9]$/i,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                },
                {
                    xtype:'textfield',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'First/Last Name',
                    name: 'name',
                    allowBlank: false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                },
                {
                    xtype:'textfield',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'E-mail',
                    name: 'email',
                    allowBlank: false,
                    regex:/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
                    regexText: "Invalid e-mail address",
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                },
                {
                    xtype:'combo',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'Role',
                    hidden:false,
                    store: ["Developer","Test Designer","Test Executor"],
                    name: 'role',
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    value:"Developer",
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                            }
                        }
                    }
                },
                {
                    xtype:"combofieldbox",
                    fieldLabel: 'Tags',
                    displayField:"value",
                    descField:"value",
                    height:24,
                    labelWidth: 100,
                    forceSelection:false,
                    createNewOnEnter:true,
                    encodeSubmitValue:true,
                    autoSelect: false,
                    triggerAction: 'all',
                    store:Ext.data.StoreManager.lookup('UserTags'),
                    valueField:"value",
                    queryMode: 'local',
                    removeOnDblClick:true,
                    typeAhead:true,
                    allowBlank: true,
                    maskRe: /[a-z_0-9_A-Z_-]/,
                    name:"tag",
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                }
                ,{
                    xtype:'textfield',
                    vtype: 'passwordTest',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'Password',
                    name: 'firstpassword',
                    inputType: 'password',
                    allowBlank:false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                    //value:"**********************"
                }
                ,{
                    xtype:'textfield',
                    fieldLabel: 'Repeat Password',
                    vtype: 'passwordTest',
                    name: 'secondpassword',
                    inputType: 'password',
                    afterLabelTextTpl: this.requiredText,
                    allowBlank:false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                    //value:"**********************"
                }
                ]
         };
        this.callParent(arguments);
        if (this.newUser == false){
            this.down('form').getForm().findField("username").disable();
            this.down('form').getForm().findField("firstpassword").setValue('**********************');
            this.down('form').getForm().findField("secondpassword").setValue('**********************');
            this.down('form').getForm().findField("name").focus();
        }
        else{
            this.down('form').getForm().findField("username").focus();
        }


    }

});