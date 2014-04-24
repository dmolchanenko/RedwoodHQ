package com.primatest.recorder

import org.openqa.selenium.By
import org.openqa.selenium.JavascriptExecutor
import org.openqa.selenium.WebDriver

import java.util.concurrent.TimeUnit

class Recorder {

    WebDriver RecDriver = null
    def static initScript =
        '''

if(document.redwoodRecording) return;
function getPathTo(element) {
    //if(element.tagName == "A"){
    //    return "//a[text()='"+element.textContent+"']";
    //}
    if (element.id!=='')
        return "//*[@id='"+element.id+"']";
    if (element===document.body)
        return element.tagName;

    var ix= 0;
    var siblings= element.parentNode.childNodes;
    for (var i= 0; i<siblings.length; i++) {
        var sibling= siblings[i];
        if (sibling===element)
            return getPathTo(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
        if (sibling.nodeType===1 && sibling.tagName===element.tagName)
            ix++;
    }
}

document.redwoodRecording = [];

//document.lookingGlassXhr = new XMLHttpRequest();
//document.lookingGlassXhr.open('POST', 'http://localhost:9933', true);
//document.lookingGlassXhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
//document.lookingGlassXhr.send("BLANK");

document.lookingGlassSendRecording = function(data){
    document.lookingGlassXhr.open('POST', 'http://localhost:9933', true);
    document.lookingGlassXhr.send(data);
}

document.lookingGlassRecordKeyDown = function(ev){
    var jsonParser
    if(Object.toJSON){
        jsonParser = Object.toJSON;
    }
    else{
        jsonParser = JSON.stringify;
    }
    if(ev.keyCode == 13){
        var path = getPathTo(ev.target);
        document.redwoodRecording.push(jsonParser({operation:"sendEnter",idType:"xpath",id:getPathTo(ev.target)}));
        //document.lookingGlassSendRecording(jsonParser({operation:"sendEnter",idType:"xpath",id:getPathTo(ev.target)}));
    }
}

document.lookingGlassRecordChange = function(ev){
    var jsonParser
    if(Object.toJSON){
        jsonParser = Object.toJSON;
    }
    else{
        jsonParser = JSON.stringify;
    }
    if(ev.target.tagName === "INPUT"){
        if((ev.target.type === "checkbox") ||(ev.target.type === "radio")){
            //document.lookingGlassSendRecording(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
            document.redwoodRecording.push(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
        }
        else if(ev.target.value === ""){
            //document.lookingGlassSendRecording(jsonParser({operation:"clear",idType:"xpath",id:getPathTo(ev.target)}));
            document.redwoodRecording.push(jsonParser({operation:"clear",idType:"xpath",id:getPathTo(ev.target)}));
        }
        else{
            //document.lookingGlassSendRecording(jsonParser({operation:"sendKeys",idType:"xpath",id:getPathTo(ev.target),data:ev.target.value}));
            document.redwoodRecording.push(jsonParser({operation:"sendKeys",idType:"xpath",id:getPathTo(ev.target),data:ev.target.value}));
        }
    }
    else if(ev.target.tagName == "SELECT"){
        var selectedText = ev.target.options[ev.target.selectedIndex].text;
        //document.lookingGlassSendRecording(jsonParser({operation:"select",idType:"xpath",id:getPathTo(ev.target),data:selectedText}));
        document.redwoodRecording.push(jsonParser({operation:"select",idType:"xpath",id:getPathTo(ev.target),data:selectedText}));
    }
};

document.lookingGlassRecordMouseUp = function(ev){
    var jsonParser
    if(Object.toJSON){
        jsonParser = Object.toJSON;
    }
    else{
        jsonParser = JSON.stringify;
    }
    console.log(ev.target.tagName);
    console.log(ev.target.type);
    //var xhr = new XMLHttpRequest();


    if(ev.target.tagName === "SELECT"){
        return;
    }
    else if(ev.target.tagName === "INPUT"){
        if(ev.target.type === "submit"){
            //document.lookingGlassSendRecording(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
            document.redwoodRecording.push(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
        }
        return;
    }
    else if((ev.target.tagName != "INPUT") && (ev.target.tagName != "SELECT")){
        var path = getPathTo(ev.target);
        //document.lookingGlassSendRecording(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
        document.redwoodRecording.push(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
    }
};

   window.onbeforeunload  = function(){
        var delay = function (ms) {
            var start = +new Date;
            var array = document.redwoodRecording;
            while ((+new Date - start) < 500);
            document.lookingGlassLastCallback(document.redwoodRecording);
            while ((+new Date - start) < 500);
            document.lookingGlassLastCallback(document.redwoodRecording);
            while ((+new Date - start) < 500);
            //while ((+new Date - start) < ms);
        }
        delay(500);
    }

if(!document.lookingGlassLoaded){
   if (document.addEventListener){  // W3C DOM
    document.addEventListener('mousedown', document.lookingGlassRecordMouseUp);
    document.addEventListener('change', document.lookingGlassRecordChange);
    document.addEventListener('keydown', document.lookingGlassRecordKeyDown);
   }
   else if (document.attachEvent) { // IE DOM
    document.attachEvent('onmousedown', document.lookingGlassRecordMouseUp);
    document.attachEvent('onchange', document.lookingGlassRecordChange);
    document.attachEvent('onkeydown', document.lookingGlassRecordKeyDown);
   }
}
'''

    def static collectScript =
        '''
   var callback = arguments[arguments.length - 1];
   document.lookingGlassLastCallback = callback;

   var count = 0;
   var waitForActions = function(){
       if((document.redwoodRecording) && (document.redwoodRecording.length > 0)){
        callback(document.redwoodRecording);
        document.redwoodRecording = [];
       }
       else if(count == 10){
        callback([]);
       }
       else{
        setTimeout(waitForActions, 100);
       }
       count++
   }
   waitForActions();
   //setTimeout(waitForActions, 100);
   //callback(document.redwoodRecording);
   //document.redwoodRecording = [];
'''

    def stopScript =
        '''
if (document.removeEventListener) {
    document.removeEventListener('mousedown', document.lookingGlassRecordMouseUp);
    document.removeEventListener('change', document.lookingGlassRecordChange);
    document.removeEventListener('keydown', document.lookingGlassRecordKeyDown);
}
else if(document.detachEvent){
    document.detachEvent('onmousedown', document.lookingGlassRecordMouseUp);
    document.detachEvent('onchange', document.lookingGlassRecordChange);
    document.detachEvent('onkeydown', document.lookingGlassRecordKeyDown);
}
delete document.redwoodRecording;
document.lookingGlassLastCallback([]);
'''

    def returnClosure = {}
    def stopRecording = false

    /*
    public Recorder(){
        server = new ServerSocket(9933)
        serverThread = new Thread(new Runnable() {
            public void run() {
                while(true) {
                    server.accept() { socket ->
                        JavascriptExecutor js = (JavascriptExecutor) RecDriver
                        println "new one"
                        try{
                            println "init0"
                            js.executeScript(initScript)
                        }
                        catch (Exception ex){
                            sleep(500)
                            println "init-0"
                            js.executeScript(initScript)
                        }
                        socket.tcpNoDelay = true
                        socket.withStreams { input, output ->
                            if(!socket.isClosed()) output << "HTTP/1.1 200 OK\nContent-Type: text/html\n\nAccess-Control-Allow-Origin: *\n\nhi\n"
                            input.eachLine() { line ->
                                println line
                                if(line.startsWith("{")) {
                                    returnClosure(line)
                                }
                            }
                            try{
                                println "init"
                                js.executeScript(initScript)
                            }
                            catch (Exception ex){
                                sleep(500)
                                println "init2"
                                js.executeScript(initScript)
                            }
                            //socket.close()
                        }
                    }
                }
            }
        }).start();

    }
    */

    public def stop(){
        returnClosure = {}
        stopRecording = true
        //JavascriptExecutor js = (JavascriptExecutor) RecDriver

        try{
            js.executeScript(stopScript)
        }
        catch (Exception ex){
            println ex.message

        }
    }

    JavascriptExecutor js = null

    public def record(def returnClosure)
    {
        sleep(10)
        this.returnClosure = returnClosure
        if(RecDriver == null) return ""

        js = (JavascriptExecutor) RecDriver
        js.executeScript(initScript)

        def recording = []
        try{
            def data = js.executeAsyncScript(collectScript)
            returnClosure(data)
            return ""
        }
        catch (Exception ex){
            if(ex.message.contains("unload") || ex.message.contains("reload")){
                //sleep(50)
            }
            else{
                println "ERROR:"+ex.message
                if((recording.size() == 0)&&(!ex.message.contains("disconnected"))){
                    println "ERROR:"+ex.message
                }
            }
            return ""
        }

    }
}