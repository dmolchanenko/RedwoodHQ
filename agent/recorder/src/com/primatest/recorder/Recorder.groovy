package com.primatest.recorder

import org.openqa.selenium.By
import org.openqa.selenium.JavascriptExecutor
import org.openqa.selenium.WebDriver
import org.openqa.selenium.chrome.ChromeDriver
import org.openqa.selenium.chrome.ChromeDriverService
import org.openqa.selenium.firefox.FirefoxDriver
import org.openqa.selenium.ie.InternetExplorerDriver
import org.openqa.selenium.ie.InternetExplorerDriverService
import org.openqa.selenium.remote.DesiredCapabilities
import org.openqa.selenium.remote.RemoteWebDriver

import java.util.concurrent.TimeUnit

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 11/4/13
 * Time: 11:25 AM
 * To change this template use File | Settings | File Templates.
 */
class Recorder {

    WebDriver RecDriver = null
    def static initScript =
        '''

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
        //document.redwoodRecording.push('Browser.Driver.findElement(By.xpath("'+ path +'")).sendKeys("'+ ev.target.value +'");Browser.Driver.findElement(By.xpath("'+ path +'")).sendKeys(org.openqa.selenium.Keys.ENTER)');
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
            document.redwoodRecording.push(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
        }
        else if(ev.target.value === ""){
            document.redwoodRecording.push(jsonParser({operation:"clear",idType:"xpath",id:getPathTo(ev.target)}));
        }
        else{
            document.redwoodRecording.push(jsonParser({operation:"sendKeys",idType:"xpath",id:getPathTo(ev.target),data:ev.target.value}));
        }
    }
    else if(ev.target.tagName == "SELECT"){
        var selectedText = ev.target.options[ev.target.selectedIndex].text;
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
    if(ev.target.tagName === "OPTION"){
        return;
    }
    if(ev.target.tagName === "INPUT"){
        return;
    }
    if((ev.target.tagName != "INPUT") && (ev.target.tagName != "SELECT")){
        var path = getPathTo(ev.target);
        document.redwoodRecording.push(jsonParser({operation:"click",idType:"xpath",id:getPathTo(ev.target)}));
        //document.redwoodRecording.push('Browser.Driver.findElement(By.xpath("'+ path +'")).click()');
    }
};

if(!document.lookingGlassLoaded){
    document.addEventListener('mouseup', document.lookingGlassRecordMouseUp);
    document.addEventListener('change', document.lookingGlassRecordChange);
    document.addEventListener('keydown', document.lookingGlassRecordKeyDown);
}
document.lookingGlassLoaded = true;
'''

    def static collectScript =
        '''
   var callback = arguments[arguments.length - 1];
   window.onbeforeunload   = function(){
        var delay = function (ms) {
            var start = +new Date;
            while ((+new Date - start) < ms);
            //document.redwoodRecording.push("unloaded");
            callback(document.redwoodRecording);
        }
        delay(500);
    };
   var waitForActions = function(){

       if((document.redwoodRecording) && (document.redwoodRecording.length > 0)){
        callback(document.redwoodRecording);
        document.redwoodRecording = [];
       }
       else{
        setTimeout(waitForActions, 100);
       }
   }
   waitForActions();
'''

    def stopScript =
'''
    document.removeEventListener('mouseup', document.lookingGlassRecordMouseUp);
    document.removeEventListener('change', document.lookingGlassRecordChange);
    document.removeEventListener('keydown', document.document.lookingGlassRecordKeyDown);
'''

    public def stop(){

        JavascriptExecutor js = (JavascriptExecutor) RecDriver

        try{
            js.executeAsyncScript(stopScript)
        }
        catch (Exception ex){

        }
    }

    public def record()
    {
        if(RecDriver == null) return

        JavascriptExecutor js = (JavascriptExecutor) RecDriver
        js.executeScript(initScript)

        def recording = []
        try{
            return js.executeAsyncScript(collectScript)
        }
        catch (Exception ex){
            //Unexpected modal dialog
            if(ex.message.contains("unload") || ex.message.contains("reload")){
                println "unloading"
                js.executeScript(initScript)
                return js.executeAsyncScript(collectScript)
            }
            else{
                if((recording.size() == 0)&&(!ex.message.contains("disconnected"))){
                    println "ERROR:"+ex.message
                }
            }
        }

    }
}
