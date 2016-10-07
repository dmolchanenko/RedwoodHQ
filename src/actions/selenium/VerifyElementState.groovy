package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class VerifyElementState{
  
  public void run(def params){

    WebElement element = Elements.find(params,Browser.Driver)
	
    if(params."Is Enabled" != null){
      assert element.isEnabled() == params."Is Enabled", "Error, expected enabled state as: ${params."Is Enabled"} did not match current element state."
    }
    
    if(params."Is Visible" != null){
      assert element.isDisplayed() == params."Is Visible", "Error, expected visible state as: ${params."Is Visible"} did not match current element state."
    }
    
  }
}