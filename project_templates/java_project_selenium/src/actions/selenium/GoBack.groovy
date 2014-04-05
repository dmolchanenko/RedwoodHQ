package actions.selenium

import actions.selenium.Browser

class GoBack{
  
  public void run(def params){
    
    Browser.Driver.navigate().back()
    
  }
}