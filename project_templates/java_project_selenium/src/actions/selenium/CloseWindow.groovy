package actions.selenium
import actions.selenium.Browser

class CloseWindow{
  public void run(def params){
    Browser.Driver.close()
  }
}