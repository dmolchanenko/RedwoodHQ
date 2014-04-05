package actions.selenium

import actions.selenium.utils.Elements
import actions.selenium.Browser
import org.openqa.selenium.WebElement

class WaitForElement{
  public void run (def params){
    
    int count = params."Timeout In Seconds".toInteger()
    while(count >= 0){
      def elements = Elements.findAll(params,Browser.Driver)
      if(elements.size() > 0) break
      sleep(1000)
      count--
    }
    if(count <= 0){
      assert false,"Element was not found in ${params."Timeout In Seconds"} seconds."
    }

  }
}