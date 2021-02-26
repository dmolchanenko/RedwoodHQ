package actions.selenium
import actions.selenium.Browser

class NavigateToURL{
  
  public void run(def params){
    Browser.Driver.navigate().to(params.URL)
  }
}