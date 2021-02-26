package actions.selenium

import actions.selenium.Browser

class VerifyPageTitle{
  
  public void run(def params){
    assert params.Title == Browser.Driver.getTitle(),"Error: page title ${Browser.Driver.getTitle()} does not match expected title of: ${params.Title}"
  }
}