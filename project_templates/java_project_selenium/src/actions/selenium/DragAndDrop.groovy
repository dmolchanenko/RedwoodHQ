package actions.selenium

import actions.selenium.utils.Elements
import org.openqa.selenium.JavascriptExecutor
import actions.selenium.Browser
import org.openqa.selenium.WebElement
import org.openqa.selenium.interactions.Actions


class DragAndDrop{
  
  public void run(def params){
    WebElement element = Elements.find(["ID":params."From ID","ID Type":params."From ID Type"],Browser.Driver)
    WebElement target = Elements.find(["ID":params."To ID","ID Type":params."To ID Type"],Browser.Driver)
    
    
    Actions action = new Actions(Browser.Driver)
  	action.dragAndDrop(element,target)
    action.build()
  	action.perform()

  }
}