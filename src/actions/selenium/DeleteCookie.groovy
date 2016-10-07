package actions.selenium

import actions.selenium.Browser

class DeleteCookie{
  public void run(def params){
    if(params."Cookie Name" == "ALL"){
      Browser.Driver.manage().deleteAllCookies()
    }
    else{
      Browser.Driver.manage().deleteCookieNamed(params."Cookie Name")
    }
    
  }
}