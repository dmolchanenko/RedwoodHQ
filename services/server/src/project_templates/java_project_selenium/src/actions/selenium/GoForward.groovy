package actions.selenium

import actions.selenium.Browser

class GoForward{
  
  public void run(def params){
    
    Browser.Driver.navigate().forward()
    
  }
}