package com.primatest.objectfinder

import groovy.json.JsonSlurper
import org.openqa.selenium.By
import org.openqa.selenium.InvalidSelectorException
import org.openqa.selenium.JavascriptExecutor
import org.openqa.selenium.NoSuchWindowException
import org.openqa.selenium.WebDriver
import org.openqa.selenium.WebDriverException
import org.openqa.selenium.WebElement
import org.openqa.selenium.chrome.ChromeDriverService
import org.openqa.selenium.firefox.FirefoxDriver
import org.openqa.selenium.ie.InternetExplorerDriver
import org.openqa.selenium.ie.InternetExplorerDriverService
import org.openqa.selenium.remote.DesiredCapabilities
import org.openqa.selenium.remote.RemoteWebDriver
import org.openqa.selenium.safari.SafariDriver
import org.testng.annotations.Test

import java.util.concurrent.TimeUnit

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 2/2/14
 * Time: 12:55 PM
 * To change this template use File | Settings | File Templates.
 */
class LookingGlass implements Runnable{
    def exceptionClosure
    WebDriver RecDriver
    JavascriptExecutor js
    String BrowserType

    def static getRawHtmlScript =
'''
    var callback = arguments[arguments.length - 1];
    callback(document.documentElement.innerHTML);
'''

    def static initScript =
'''
//if already run just return
if(document.lookingGlassGetXpath) return;

document.lookingGlassGetCSSSelector = function(element){
    if(!element) return "";
    if (element.id!=='')
        return "#"+element.id;
    if (element===document.body)
        return "";
        //return element.tagName;

    var ix= 0;
    var siblings = element.parentNode.childNodes;
    var classes = [];
    var classesToWrite = [];

    if(element.className){
        classes = element.className.trim().split(" ");
        classesToWrite.push(classes[0]);
    }

    for (var i= 0; i<siblings.length; i++) {
        var sibling = siblings[i];
        if(classes.length > 0){
            if(sibling.className){
               var siblingClasses = sibling.className.trim().split(" ");
               for (var classCount= 0; classCount<classes.length; classCount++) {
                    if(classes[classCount] === siblingClasses[classCount] && sibling.tagName === element.tagName){
                        if(classCount+1 > classesToWrite.length){
                            classesToWrite.push(classes[classCount]);
                        }
                    }
                    else{
                        break;
                    }
               }
            }
        }
        else if (sibling===element){
            return document.lookingGlassGetCSSSelector(element.parentNode)+' > '+element.tagName+':nth-child('+(ix+1)+')';
        }
        if (sibling.nodeType===1 && sibling.tagName===element.tagName)
            ix++;
    }
    if(classes.length > 0){

    }
    if((classes.length > 0) && (classesToWrite.length <= classes.length)){
        var classString = "";

        for(var i=0;i<classesToWrite.length;i++){
            classString = classString + "." + classesToWrite[i];
        }
        return document.lookingGlassGetCSSSelector(element.parentNode)+' > '+element.tagName+classString;
    }
    else{
        return document.lookingGlassGetCSSSelector(element.parentNode)+' > '+element.tagName+':nth-child('+(ix)+')';
    }
}

document.lookingGlassGetLinkText = function(element){
    if(element.tagName == "A"){
        return element.textContent;
    }
    else{
        return "";
    }
}

document.lookingGlassGetLinkText = function(element){
    if(element.tagName == "A"){
        return element.textContent;
    }
    else{
        return "";
    }
}

document.lookingGlassGenerateID = function(element){
    //return '{"xpath":"+document.lookingGlassGetXpath(element)+",css:"+document.lookingGlassGetCSSSelector(element)+",id:"+element.id+",name:"+element.getAttribute("name")+",className:"+element.getAttribute("class")+",tagName:"+element.tagName+",linkText:"+document.lookingGlassGetLinkText(element)+"}';
    var jsonParser
    if(Object.toJSON){
        jsonParser = Object.toJSON;
    }
    else{
        jsonParser = JSON.stringify;
    }
    return jsonParser({xpath:document.lookingGlassGetXpath(element),css:document.lookingGlassGetCSSSelector(element),id:element.id,name:element.getAttribute("name"),className:element.getAttribute("class"),tagName:element.tagName,linkText:document.lookingGlassGetLinkText(element)});
}
document.lookingGlassGetXpath = function (element) {
    if(!element) return "";
    //if(element.tagName == "A"){
    //    return "//a[text()='"+element.textContent+"']";
    //}
    if (element.id!=='')
        return "//*[@id='"+element.id+"']";
    if (element===document.body)
        return "/HTML/BODY";
        //return element.tagName;

    var ix= 0;
    var siblings= element.parentNode.childNodes;
    for (var i= 0; i<siblings.length; i++) {
        var sibling= siblings[i];
        if (sibling===element)
            return document.lookingGlassGetXpath(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
        if (sibling.nodeType===1 && sibling.tagName===element.tagName)
            ix++;
    }
}

document.lookingGlassMouseOver = function(e){

    if(e.target == document.documentElement) return
    e.target.addEventListener('click', document.lookingGlassPreventClick,false);
    e.target.addEventListener('mousedown', document.lookingGlassPreventClick,false);
    e.target.addEventListener('mouseup', document.lookingGlassPreventClick,false);
    e.target.addEventListener('submit', document.lookingGlassPreventClick,false);
    document.lookingGlassLastElem = e.target;
    document.lookingGlassLastElemColor = e.target.style.outline;
    document.lookingGlassLastElemHighlight = e.target.style.backgroundColor;
    e.target.style.outline = "medium solid green";
    e.target.style.backgroundColor = "#FDFF47";
    document.lookingGlassRecording =  document.lookingGlassGenerateID(e.target);
};

document.onmouseout = function(ev){
    if(document.lookingGlassLastElem){
        ev.target.style.outline = document.lookingGlassLastElemColor;
        ev.target.style.backgroundColor = document.lookingGlassLastElemHighlight;
    }
    ev.target.removeEventListener('click', document.lookingGlassPreventClick,false);
    ev.target.removeEventListener('mousedown', document.lookingGlassPreventClick,false);
    ev.target.removeEventListener('mouseup', document.lookingGlassPreventClick,false);
    ev.target.removeEventListener('submit', document.lookingGlassPreventClick,false);
};

document.lookingGlassLastCursor = document.body.style.cursor;

document.lookingGlassPreventClick = function(e){
    document.lookingGlassRecording = "END OF RECORDING";
    document.removeEventListener('mouseover', document.lookingGlassMouseOver);
    document.removeEventListener('click', document.lookingGlassPreventClick,false);
    document.removeEventListener('mousedown', document.lookingGlassPreventClick,false);
    document.removeEventListener('mouseup', document.lookingGlassPreventClick,false);
    document.removeEventListener('submit', document.lookingGlassPreventClick,false);

    e.target.removeEventListener('mouseover', document.lookingGlassMouseOver);
    e.target.style.outline = document.lookingGlassLastElemColor;
    e.target.style.backgroundColor = document.lookingGlassLastElemHighlight;
    document.body.style.cursor =  document.lookingGlassLastCursor;
    if(e.stopPropagation) e.stopPropagation();
    if(e.preventDefault) e.preventDefault();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    return false;
};

'''
    def getObjectIDScript =
'''
    var callback = arguments[arguments.length - 1];
    callback(document.lookingGlassGenerateID(arguments[0]));
'''
    def getObjectXpathScript =
'''
    var callback = arguments[arguments.length - 1];
    callback(document.lookingGlassGetXpath(arguments[0]));
'''

    def highLightObjectScript =
'''
var stopHighLight = function(){
    document.lookingGlassLastElem.style.outline = document.lookingGlassLastElemColor;
    document.lookingGlassLastElem.style.backgroundColor = document.lookingGlassLastElemHighlight;
}
if(document.lookingGlassLastElem){
    stopHighLight();
}
document.lookingGlassLastElem = arguments[0]
document.lookingGlassLastElemColor = arguments[0].style.outline
document.lookingGlassLastElemHighlight = arguments[0].style.backgroundColor
setTimeout(function(){stopHighLight()}, 8000);
arguments[0].style.outline="thin solid green";
arguments[0].style.backgroundColor= "#FDFF47";
arguments[1](document.lookingGlassGetXpath(arguments[0]));
'''

    def recordObjectScript =
'''
document.body.style.cursor = "pointer";
document.lookingGlassRecording = null;
document.addEventListener('click', document.lookingGlassPreventClick,false);
document.addEventListener('mousedown', document.lookingGlassPreventClick,false);
document.addEventListener('mouseup', document.lookingGlassPreventClick,false);
document.addEventListener('submit', document.lookingGlassPreventClick,false);
document.addEventListener('mouseover', document.lookingGlassMouseOver, false);
//window.onclick =
'''
    def stopRecordingScript =
'''
//document.body.style.cursor = document.lookingGlassLastCursor
if(document.lookingGlassLastElem){
    document.lookingGlassLastElem.style.outline = document.lookingGlassLastElemColor
    document.lookingGlassLastElem.style.backgroundColor = document.lookingGlassLastElemHighlight
}
//document.removeEventListener('click', document.lookingGlassPreventClick, false);
document.removeEventListener('mouseover', document.lookingGlassMouseOver, false);
'''
    def static isFocusedScript =
'''
var callback = arguments[arguments.length - 1];
callback(document.activeElement);
'''

    def collectScript =
'''
   var callback = arguments[arguments.length - 1];;
   //if there is no document.lookingGlassMouseOver function that means we can't really do anything
   if(!document.lookingGlassMouseOver){
        callback('{error:"init not run"}');
        return;
   }
   var waitForActions = function(){
       if(document.lookingGlassRecording){
        var response = document.lookingGlassRecording
        document.lookingGlassRecording = null;
        callback(response);
       }
       else{
        setTimeout(waitForActions, 50);
       }
   }
   waitForActions();
'''

    def isPageRdyScript =
'''
if(document.lookingGlassMouseOver){
    arguments[0]("true");
}
else{
    arguments[0]("false");
}
'''

    def browserRdyClosure

    public LookingGlass(browserRdy,exception){
        browserRdyClosure = browserRdy
        exceptionClosure = exception
    }

    public void stopRecording(){
        js.executeScript(stopRecordingScript)
    }

    public def performElementAction(String id,def reloadHTML,String idType,String actionType,exceptionClosure){
        //RecDriver.findElement(By.xpath(id))
        def elements
        def response = [:]
        try{
            if(idType == "XPath"){
                elements = RecDriver.findElements(By.xpath(id))
            }
            else if(idType == "ID"){
                elements = RecDriver.findElements(By.id(id))
            }
            else if(idType == "Name"){
                elements = RecDriver.findElements(By.name(id))
            }
            else if(idType == "CSS Selector"){
                elements = RecDriver.findElements(By.cssSelector(id))
            }
            else if(idType == "Class Name"){
                elements = RecDriver.findElements(By.className(id))
            }
            else if(idType == "Tag Name"){
                elements = RecDriver.findElements(By.tagName(id))
            }
            else if(idType == "Link Text"){
                elements = RecDriver.findElements(By.linkText(id))
            }
            else if(idType == "Partial Link Text"){
                elements = RecDriver.findElements(By.partialLinkText(id))
            }

        }
        catch (InvalidSelectorException ex){
            response.text = "<font color=red>Invalid locator.</font>"
            return response
        }
        catch (NoSuchWindowException ex){
            exceptionClosure(ex)
            return
        }
        catch (WebDriverException ex){
            response.text = "<font color=red>Invalid locator.</font>"
            return response
        }
        if(js.executeAsyncScript(isPageRdyScript) == "false"){
            js.executeScript(initScript)
            reloadHTML()
        }
        if(elements.size() > 0){
            try{
                if(actionType == "highlight"){
                    response.xpath = js.executeAsyncScript(highLightObjectScript, elements[0])
                }
                else if(actionType == "click"){
                    response.xpath = js.executeAsyncScript(getObjectXpathScript, elements[0])
                    elements[0].click()
                }
                else if(actionType == "type"){
                    response.xpath = js.executeAsyncScript(getObjectXpathScript, elements[0])
                    elements[0].sendKeys("test text")
                }
            }
            catch (Exception ex){
                exceptionClosure(ex)
                return
            }

            if(elements.size() > 1){
                response.text = "<font color=green>More then one element found, working with first one.</font>"
            }
            else{
                response.text = "<font color=green>Found One Element.</font>"
            }
        }
        else{
            response.text = "<font color=red>No elements found.</font>"
        }
        return response
        //JavascriptExecutor jsExec = (JavascriptExecutor) Browser.Driver
        //String javaScript = "var evObj = document.createEvent('MouseEvents');evObj.initEvent(\"mouseover\",true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);arguments[0].dispatchEvent(evObj);";
    }

    public def getElementID(xpath){
        sleep(200)
        def elements = RecDriver.findElements(By.xpath(xpath))
        if(elements.size() > 0){
            js.executeScript(initScript)
            def response = js.executeAsyncScript(getObjectIDScript, elements[0])
            response = new JsonSlurper().parseText(response)
            return response
        }
        else{
            return [:]
        }
    }

    public String getHTML(exceptionClosure){

        try{
            RecDriver.findElement(By.xpath("//*[1]"))
            def html = js.executeAsyncScript(getRawHtmlScript)
            return html
        }
        catch (Exception ex){
            exceptionClosure(ex)
            return ""
        }

    }

    public def FindObject(def reloadHTML){
        //BrowserType = BrowserType


        //while (true){
        //for (handle in RecDriver.getWindowHandles()){

            //RecDriver.switchTo().window(handle)
            //def response = js.executeAsyncScript(isFocusedScript)
            //println response
            //if (response == "true"){

            //}
        //}
        def recording = {
            js.executeScript(initScript)
            js.executeScript(recordObjectScript)
            def response = js.executeAsyncScript(collectScript)
            if(response == "END OF RECORDING") return response
            def parsedResponse = new JsonSlurper().parseText(response)
            if(parsedResponse.error != null && parsedResponse.error == "init not run"){
                RecDriver.findElement(By.xpath("//*[1]"))
                reloadHTML()
                js.executeScript(initScript)
                js.executeScript(recordObjectScript)
                response = js.executeAsyncScript(collectScript)
                if(response == "END OF RECORDING") return response
                parsedResponse = groovy.json.JsonOutput.toJson(response)
            }
            return parsedResponse
        }
        try{
            def recordingResult = recording()
            return recordingResult
        }
        catch (Exception ex){
            if(ex.message.contains("unload") || ex.message.contains("reload")){
                RecDriver.findElement(By.xpath("//*[1]"))
                println "reloading"
                reloadHTML()
                println "reloading2"
                println "unloaded"
                return recording()
            }
            else{
                println ex.message
            }
        }
    //}

    }

    void run() {
        try{
            System.setProperty("webdriver.chrome.driver", System.getProperty("user.dir"));
            if(BrowserType == "Chrome"){
                def service
                if(System.getProperty("os.name").toLowerCase().indexOf("mac") >= 0){
                    service = new ChromeDriverService.Builder().usingPort(9515).usingDriverExecutable(new File("chromedriver")).build()
                }
                else if (System.getProperty("os.name").toLowerCase().indexOf("linux") >= 0){
                    service = new ChromeDriverService.Builder().usingPort(9515).usingDriverExecutable(new File("chromedriver_linux")).build()
                }
                else{
                    service = new ChromeDriverService.Builder().usingPort(9515).usingDriverExecutable(new File("chromedriver.exe")).build()
                }

                service.start()
                RecDriver = new RemoteWebDriver(service.getUrl(),DesiredCapabilities.chrome())

            }
            else if(BrowserType == "Firefox"){
                RecDriver = new FirefoxDriver()
            }
            else if(BrowserType == "Safari"){
                RecDriver = new SafariDriver()
            }
            else{
                def serviceIE = new InternetExplorerDriverService.Builder().usingPort(9517).usingDriverExecutable(new File("IEDriverServer.exe")).build()
                serviceIE.start()
                DesiredCapabilities d = DesiredCapabilities.internetExplorer()
                d.setCapability("nativeEvents", false)
                d.setCapability(InternetExplorerDriver.INTRODUCE_FLAKINESS_BY_IGNORING_SECURITY_DOMAINS,true);
                //d.setCapability("forceCreateProcessApi", true)
                //d.setCapability("browserCommandLineSwitches", "-private")
                RecDriver = new RemoteWebDriver(serviceIE.getUrl(),d)
            }

            RecDriver.manage().timeouts().setScriptTimeout(999999, TimeUnit.SECONDS);
            RecDriver.manage().timeouts().implicitlyWait(10, java.util.concurrent.TimeUnit.SECONDS)
            js = (JavascriptExecutor) RecDriver
            browserRdyClosure()

        }
        catch (Exception ex){
            exceptionClosure(ex)
        }
    }
}
