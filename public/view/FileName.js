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
                        afterrender: function(field){
                            if(me.objectType === "groovyAction"){
                                field.setValue("GroovyAction.groovy");
                                field.selectText(0,12);
                            }
                            else if(me.objectType === "javaAction"){
                                field.setValue("JavaAction.java");
                                field.selectText(0,10);
                            }else if(me.objectType === "pythonAction"){
                                field.setValue("PythonAction.py");
                                field.selectText(0,12);
                            }else if(me.objectType === "csharpAction"){
                                field.setValue("CsharpAction.cs");
                                field.selectText(0,12);
                            }
                            else{
                                field.selectText();
                            }
                            field.focus();
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
                                    var packageStr = "";
                                    if ((fileName.indexOf("groovy", fileName.length - 6) !== -1) || (fileName.indexOf("java", fileName.length - 4) !== -1) || (fileName.indexOf("py", fileName.length - 2) !== -1)|| (fileName.indexOf("cs", fileName.length - 2) !== -1)){
                                        if (path.slice(-4) != "/src"){
                                            packageStr = path.substr(path.lastIndexOf("/src/")+5,path.length-1);
                                            packageStr = packageStr.replace(/\//g,".");
                                            text = "package " + packageStr + ";\r\n\r\n";
                                        }
                                        if(window.objectType === "groovyAction"){
                                            text = text+"\r\nclass "+fileName.split(".")[0]+"{\r\n    public void run(def params){\r\n        \r\n    }\r\n}";
                                        }
                                        else if(window.objectType === "javaAction"){
                                            text = text+"import java.util.*;\r\n\r\nclass "+fileName.split(".")[0]+"{\r\n    public void run(HashMap<String, Object> params){\r\n        \r\n    }\r\n}";
                                        }else if(window.objectType === "pythonAction"){
                                            text = "class "+fileName.split(".")[0]+":\r\n    def run(self,params):\r\n        pass\r\n";
                                        }else if(window.objectType === "csharpAction"){
                                            var namespaceStart = "namespace "+packageStr+ "{\r\n";
                                            var namespaceEnd = "}";
                                            if (packageStr == ""){
                                                namespaceStart = "";
                                                namespaceEnd = "";
                                            }
                                            text = "using System;\r\nusing System.Collections.Generic;\r\n\r\n"+
                                            namespaceStart +
                                            "    class "+fileName.split(".")[0]+"{\r\n"+
                                            "        public void run(Dictionary<string, object> Params){\r\n"+
                                            "            \r\n"+
                                            "        }\r\n"+
                                            "    }\r\n"+
                                            namespaceEnd
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