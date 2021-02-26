package actions.amazon;

import actions.selenium.*


class SelectItem{
    public void run(def params){
        new Click().run("ID":"//*[@id=\"result_${params."Item Index"}\"]//a","ID Type":"XPath")
        ArrayList<String> tabs = new ArrayList<String> (Browser.Driver.getWindowHandles())
        Browser.Driver.switchTo().window(tabs.get(tabs.size()-1))
    }
}