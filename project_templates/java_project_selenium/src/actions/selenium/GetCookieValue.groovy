package actions.selenium

import actions.selenium.Browser

class GetCookieValue{
  
  public def run(def params){
    def cookie = Browser.Driver.manage().getCookies().find{it.getName() == params.Name}
    assert cookie != null, "Error cookie not found."
    return cookie.getValue()
  }
}
