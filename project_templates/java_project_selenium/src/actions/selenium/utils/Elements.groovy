package actions.selenium.utils

import org.openqa.selenium.By
import org.openqa.selenium.WebElement
import org.openqa.selenium.WebDriver


class Elements{
  
  public static WebElement find(def params,WebDriver Driver){
    assert Driver != null, "Error browser is not opened.  Use Open Browser action."

    WebElement foundElement = null
    switch (params."ID Type"){
      case "Class Name":
      	foundElement = Driver.findElement(By.className(params.ID))
      	break
      case "Css Selector":
      	foundElement = Driver.findElement(By.cssSelector(params.ID))
      	break
      case "ID":
      	foundElement = Driver.findElement(By.id(params.ID))
      	break      
      case "Link Text":
      	foundElement = Driver.findElement(By.linkText(params.ID))
      	break      
      case "XPath":
      	foundElement = Driver.findElement(By.xpath(params.ID))
      	break      
      case "Name":
      	foundElement = Driver.findElement(By.name(params.ID))
      	break      
      case "Partial Link Text":
      	foundElement = Driver.findElement(By.partialLinkText(params.ID))
      	break      
      case "Tag Name":
      	foundElement = Driver.findElement(By.tagName(params.ID))
      	break
      default:
        foundElement = Driver.findElement(By.id(params.ID))
    }
    
    return foundElement
  }
  
  public static def findAll(def params,WebDriver Driver){
    assert Driver != null, "Error browser is not opened.  Use Open Browser action."
    
    def foundElements = []
    
    switch (params."ID Type"){
      case "Class Name":
      	foundElements = Driver.findElements(By.className(params.ID))
      	break
      case "Css Selector":
      	foundElements = Driver.findElements(By.cssSelector(params.ID))
      	break
      case "ID":
      	foundElements = Driver.findElements(By.id(params.ID))
      	break      
      case "Link Text":
      	foundElements = Driver.findElements(By.linkText(params.ID))
      	break      
      case "XPath":
      	foundElements = Driver.findElements(By.xpath(params.ID))
      	break      
      case "Name":
      	foundElements = Driver.findElements(By.name(params.ID))
      	break      
      case "Partial Link Text":
      	foundElements = Driver.findElements(By.partialLinkText(params.ID))
      	break      
      case "Tag Name":
      	foundElements = Driver.findElements(By.tagName(params.ID))
      	break
      default:
        foundElements = Driver.findElements(By.id(params.ID))
    }
    
    return foundElements
  }
}