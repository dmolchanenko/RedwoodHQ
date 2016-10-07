package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class Submit{
  public void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)

    element.submit()
  }
}