package actions.selenium

import org.openqa.selenium.JavascriptExecutor
import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class MouseOver{

  public void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)

    JavascriptExecutor jsExec = (JavascriptExecutor) Browser.Driver
    String javaScript = "var evObj = document.createEvent('MouseEvents');evObj.initEvent(\"mouseover\",true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);arguments[0].dispatchEvent(evObj);"
    jsExec.executeScript(javaScript, element)

  }
}