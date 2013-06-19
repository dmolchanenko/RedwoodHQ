//loadRecord
Ext.apply(Ext.form.field.VTypes, {
    projectNameText: 'Project with the same name already exists',
    projectName: function(val,field){
        var store = Ext.data.StoreManager.lookup('Projects');
        var index = store.findExact(field.name,val);
        if (index != -1){
            return false;
        }
        return true;
    },
    projectNameMask: /^(?!^(PRN|AUX|CLOCK\$|NUL|CON|COM\d|LPT\d|\..*)(\..+)?$)[^\x00-\x1f\\?*:\";|/]+$/
    //passwordTestMask: /[a-z_0-9]/
});

Ext.define('Redwood.view.ProjectEdit', {
    extend: 'Ext.window.Window',
    alias: 'widget.projectEdit',
    requiredText: '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>',
    newProject: true,
    defaultFocus: "name",
    title: 'Project Properties',
    id: "projectEdit",
    draggable: true,
    resizable: false,
    width: 300,
    height: 250,
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
                        var form = this.up('form').getForm();
                        if (form.isValid()) {
                            var window = this.up('window');
                            var newProject = {};
                            newProject.name = form.getFieldValues().name;
                            newProject.language = form.getFieldValues().language;
                            newProject.template = form.getFieldValues().template;
                            Ext.data.StoreManager.lookup('Projects').add(newProject);
                            Ext.data.StoreManager.lookup('Projects').sync();
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
                itemId:"name",
                afterLabelTextTpl: this.requiredText,
                fieldLabel: 'Project Name',
                name: 'name',
                vtype:'projectName',
                allowBlank: false,
                maxLength: 20,
                enforceMaxLength:true,
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
                    fieldLabel: 'Language',
                    store: ["Java/Groovy"],
                    value:"Java/Groovy",
                    name: 'language',
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                }
                ,
                {
                    xtype:'combo',
                    fieldLabel: 'Project Template',
                    store: ["Default","Selenium"],
                    name: 'template',
                    value:"Default",
                    forceSelection: true,
                    editable: false,
                    allowBlank: false,
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                this.up('form').down("#submit").handler();
                            }
                        }
                    }
                }
            ]
        };
        this.callParent(arguments);
        this.down('form').getForm().findField("name").focus();
    }

});