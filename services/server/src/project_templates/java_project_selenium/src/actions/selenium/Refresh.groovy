package actions.selenium

import actions.selenium.Browser

class Refresh{
  
  public void run(def params){
    
    Browser.Driver.navigate().refresh()
    
  }
}