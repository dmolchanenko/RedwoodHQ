package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class SetCheckBox{
  
  public static void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)
    if(params.Check == true){
      if(element.selected == false){
        element.sendKeys(org.openqa.selenium.Keys.SPACE)
      }
    }
    else{
      if(element.selected == true){
        element.sendKeys(org.openqa.selenium.Keys.SPACE)
      }
    }
    
  }
}