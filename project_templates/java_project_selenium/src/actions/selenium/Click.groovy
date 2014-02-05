package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class Click{
  
  public void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)
    //try catch is a workaround for a webdriver bug where element exists and visible but
    //webdriver is unable to click it
    int iTimeout = 20
    while(iTimeout > 0)
    try{
      element.click()
      return
    }
    catch(org.openqa.selenium.WebDriverException err){
      iTimeout--
      if(err.message.contains("Element is not clickable at point")){
        if(iTimeout == 0){
          throw err
        }
      }
      else{
        throw err
      }
      sleep(1000)
    }
    
  }
}