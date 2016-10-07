package actions.selenium

import actions.selenium.Browser

class SetTimeout{
  
  public void run(def params){
    Browser.Driver.manage().timeouts().implicitlyWait(params.Seconds.toInteger(), java.util.concurrent.TimeUnit.SECONDS)
  }
}