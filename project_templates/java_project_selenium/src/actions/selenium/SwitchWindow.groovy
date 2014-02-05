package actions.selenium

import actions.selenium.Browser


class SwitchWindow{

  public run(def params){
    int iTimeout = 20

    if(params."Browser window name" == "Default Window"){
      Browser.Driver.switchTo().window(Browser.MainWinHandle)
      return
    }

    while(iTimeout > 0){
      for (handle in Browser.Driver.getWindowHandles()){

        Browser.Driver.switchTo().window(handle)
        if (Browser.Driver.getTitle() == params."Window Name"){
          return;
        }
      }
      iTimeout--
      sleep(1000)
    }

    assert false,"Window: ${params."Window Name"} does not exist."
  }
}