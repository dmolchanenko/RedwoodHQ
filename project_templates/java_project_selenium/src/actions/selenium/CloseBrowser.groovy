package actions.selenium
import actions.selenium.Browser

class CloseBrowser{
  public void run(def params){
    Browser.Driver.quit()
  }
}