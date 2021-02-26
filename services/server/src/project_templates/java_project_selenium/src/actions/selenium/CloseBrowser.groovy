package actions.selenium
import actions.selenium.Browser

class CloseBrowser{
  public void run(def params){
    if(Browser.Driver) Browser.Driver.quit()
  }
}