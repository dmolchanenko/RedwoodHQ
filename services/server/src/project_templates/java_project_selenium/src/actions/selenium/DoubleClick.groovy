package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement
import org.openqa.selenium.interactions.Actions


class DoubleClick{
  
  public void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)
    
    Actions action = new Actions(Browser.Driver)
  	action.doubleClick(element)
  	action.perform()
  }
}