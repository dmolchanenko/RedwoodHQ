package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class VerifyCheckBox{
  
  public void run(def params){
    WebElement element = Elements.find(params,Browser.Driver)
    
    assert element.selected == params."Is Checked", "Error check box checked state is expected to be: ${params."Is Checked"}"
  }
}