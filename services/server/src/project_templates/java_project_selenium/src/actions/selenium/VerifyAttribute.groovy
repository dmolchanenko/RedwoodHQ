package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class VerifyAttribute{
  
  public void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)
    assert params.Value == element.getAttribute(params."Attribute Name"), "Error: value ${element.getAttribute(params."Attribute Name")} of the attribute: ${params."Attribute Name"} does not match expected value of: ${params.Value}"
    
  }
}
