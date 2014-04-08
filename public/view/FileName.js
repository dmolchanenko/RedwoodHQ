Ext.define('Redwood.view.FileName', {
    extend: 'Ext.window.Window',
    alias: 'widget.filename',

    title: 'New File',
    path: "",
    //height: 200,
    width: 300,
    modal: true,
    resizable: true,
    layout: 'anchor',
    defaultFocus: "fileName",
    operationType: "new",
    objectType: "script",
    defaultName:"",
    //callback if file name was submitted to the server
    fn:function(result){},

    initComponent: function () {
        var path = this.path;
        var me = this;
        this.items = {
            xtype:"form",
            buttonAlign: "center",
            bodyStyle: "background:transparent",
            layout:"fit",
            bodyPadding: 5,
            border: false,
            defaults: {
                anchor: '100%'
            },
                items: [{
                    xtype: "textfield",
                    name: "fileName",
                    fieldLabel: "Please Enter File Name",
                    labelAlign: "top",
                    itemId: "fileName",
                    value: me.defaultName,
                    allowBlank:false,
                    listeners:{
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                var btn = this.up("form").down("button");
                                btn.handler.call(btn.scope, btn, Ext.EventObject);
                            }
                        },
                        afterrender: function(me){
                            me.selectText();
                        }
                    }
                }],

                buttons: [
                    {
                        xtype: "button",
                        text: "OK",
                        itemId: "SubmitForm",
                        handler: function(me){
                            me.setDisabled(true);
                            var form = me.up('form').getForm();
                            var window = me.up('window');
                            //var store = window.store;
                            if (form.isValid()) {

                                var jsonData;
                                var url;
                                var method;
                                if (window.operationType == "new"){
                                    method = "POST";
                                    var fileName = form.getFieldValues().fileName;
                                    var text = "";
                                    if ((fileName.indexOf("groovy", fileName.length - 6) !== -1) || (fileName.indexOf("java", fileName.length - 4) !== -1)){
                                        if (path.slice(-4) != "/src"){
                                            var packageStr = path.substr(path.lastIndexOf("/src/")+5,path.length-1);
                                            packageStr = packageStr.replace(/\//g,".");
                                            text = "package " + packageStr + ";\r\n";
                                        }

                                    }
                                    jsonData = {path:path+"/"+fileName,text:text};
                                }
                                else{
                                    method = "PUT";
                                    jsonData = {path:path,newName:form.getFieldValues().fileName};
                                }
                                if (window.objectType == "folder"){
                                    url = "/folder";
                                }
                                else{
                                    url = "/script";
                                }

                                Ext.Ajax.request({
                                    url:url,
                                    method:method,
                                    jsonData : jsonData,
                                    success: function(response, action) {
                                        //store.load();
                                        var obj = Ext.decode(response.responseText);
                                        if(obj.error == null){
                                            window.fn(form.getFieldValues().fileName);
                                            window.close();
                                        }
                                        else{
                                            Ext.Msg.alert('Error', obj.error);
                                            me.setDisabled(false);
                                        }
                                    }
                                });
                            }
                            else{
                                this.disabled = false;
                            }
                        }
                    },{
                        xtype: "button",
                        text: "Cancel",
                        handler: function(){
                            this.up("window").close();
                        }
                    }
                ]
        };
        this.callParent(arguments);
        if (this.objectType == "folder"){
            this.down("#fileName").fieldLabel = "Please Enter Folder Name"
        }
    }
});