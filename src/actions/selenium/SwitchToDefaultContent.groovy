package actions
import actions.selenium.Browser

class SwitchToDefaultContent{
  
  public void run(def params){

	  Browser.Driver.switchTo().defaultContent()
    
  }
}