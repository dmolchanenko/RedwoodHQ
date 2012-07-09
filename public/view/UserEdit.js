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
    }

    //passwordTestMask: /[a-z_0-9]/
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
                formBind: true, //only enabled once the form is valid
                disabled: true,
                handler: function() {
                    var form = this.up('form').getForm();
                    if (form.isValid()) {
                        var window = this.up('window');
                        if (window.newUser == false){
                            if (form.getFieldValues().firstpassword != "**********************"){
                                var record = form.getRecord();
                                record.set("password",form.getFieldValues().firstpassword);
                            }
                            form.updateRecord();
                        }else{
                            var newUser = {};
                            newUser.name = form.getFieldValues().name;
                            newUser.tag = form.getFieldValues().tag;
                            newUser.password = form.getFieldValues().firstpassword;
                            newUser.username = form.getFieldValues().username;
                            newUser.role = form.getFieldValues().role;
                            Ext.data.StoreManager.lookup('Users').add(newUser);
                        }
                        Ext.data.StoreManager.lookup('UserTags').sync();
                        Ext.data.StoreManager.lookup('Users').sync();
                        //this.up('form').up('window').close();
                        window.close();
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
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').getForm().submit();
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
                                this.up('form').getForm().submit();
                            }
                        }
                    }
                },
                {
                    xtype:'combo',
                    afterLabelTextTpl: this.requiredText,
                    fieldLabel: 'Role',
                    store: ["Admin","User"],
                    name: 'role',
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').getForm().submit();
                            }
                        }
                    }
                },
                Ext.create('Ext.ux.ComboFieldBox', {
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
                    //store:[],
                    store:Ext.data.StoreManager.lookup('UserTags'),
                    valueField:"value",
                    queryMode: 'local',
                    removeOnDblClick:true,
                    typeAhead:true,
                    allowBlank: true,
                    name:"tag",
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').getForm().submit();
                            }
                        }
                    }
                })
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
                                this.up('form').getForm().submit();
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
                                this.up('form').getForm().submit();
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