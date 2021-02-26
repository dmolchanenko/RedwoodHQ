package actions.selenium

import actions.selenium.Browser

class SwitchToFrame{
  
  public void run(def params){
    if(params.Name){
      Browser.Driver.switchTo().frame(params.Name)
    }
    else if(params.Index){
      Browser.Driver.switchTo().frame(params.Index.toInteger())
    }
    
  }
}