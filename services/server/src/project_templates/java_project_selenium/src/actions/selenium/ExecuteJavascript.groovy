package actions.selenium

import actions.selenium.Browser
import org.openqa.selenium.JavascriptExecutor

class ExecuteJavascript{
  
  public void run(def params){

	def js = (JavascriptExecutor) Browser.Driver
    js.executeScript(params.Code)
    
  }
}