package actions.selenium;

import org.openqa.selenium.WebDriver
import org.openqa.selenium.ie.InternetExplorerDriver
import org.openqa.selenium.firefox.FirefoxDriver
import org.openqa.selenium.ie.InternetExplorerDriver
import org.openqa.selenium.chrome.ChromeDriver
import org.openqa.selenium.chrome.ChromeDriverService
import org.openqa.selenium.ie.InternetExplorerDriverService
import org.openqa.selenium.remote.RemoteWebDriver
import org.openqa.selenium.remote.DesiredCapabilities

class Browser{


  public static WebDriver Driver = null
  public static MainWinHandle = null

  //start browser
  public void run(def params){
    def os = System.getProperty("os.name").toLowerCase();

	sleep(1000)
    if (params."Browser Type" == "Firefox"){
      Driver = new FirefoxDriver()
    }
    else if (params."Browser Type" == "Chrome"){
      def service

      if(os.contains("nix") || os.contains("nux")||os.contains("aix")){
          File chromedriver = new File("chromedriver")
          if(!chromedriver.exists()){
              assert false, "Please upload proper chromedriver file to bin directory under scripts tab."
          }
          chromedriver.setExecutable(true)
          service = new ChromeDriverService.Builder().usingPort(9518).usingDriverExecutable(chromedriver).build()
      }
      else{
        service = new ChromeDriverService.Builder().usingPort(9518).usingDriverExecutable(new File("chromedriver.exe")).build()
      }
      service.start()
      Driver = new RemoteWebDriver(service.getUrl(),DesiredCapabilities.chrome())
    }
    else{
      def serviceIE = new InternetExplorerDriverService.Builder().usingPort(9516).usingDriverExecutable(new File("IEDriverServer.exe")).build()
      serviceIE.start()
      DesiredCapabilities d = DesiredCapabilities.internetExplorer()
      d.setCapability("nativeEvents", false)
      d.setCapability(InternetExplorerDriver.INTRODUCE_FLAKINESS_BY_IGNORING_SECURITY_DOMAINS,true);

      Driver = new RemoteWebDriver(serviceIE.getUrl(),d)

    }
    
    if (params.URL){
      if (params.URL.startsWith("http://") || params.URL.startsWith("https://")){
        Driver.get(params.URL)
      }
      else{
        Driver.get("http://"+params.URL)
      }
      
    }
    Driver.manage().window().maximize()
    Driver.manage().timeouts().implicitlyWait(10, java.util.concurrent.TimeUnit.SECONDS)
    MainWinHandle = Driver.getWindowHandle()   
    
  }
}