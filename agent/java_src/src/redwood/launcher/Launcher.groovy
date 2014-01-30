package redwood.launcher

import groovy.json.JsonSlurper
import org.codehaus.groovy.runtime.StackTraceUtils
import redwood.launcher.*

import javax.imageio.ImageIO
import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit
import java.awt.image.BufferedImage

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 1/25/13
 * Time: 12:00 AM
 * To change this template use File | Settings | File Templates.
 */
class Launcher {

    public static output

    private static currentAction

    public static returnValues = [:]

    public static def globals = [:]

    public static log(String message){
        def toServer = [:]
        toServer.command = "Log Message"
        toServer.message = message
        toServer.actionName = currentAction.name
        toServer.resultID = currentAction.resultID
        this.output<<groovy.json.JsonOutput.toJson(toServer)+"--EOM--"
    }

    public static logFile(String path){
        def toServer = [:]
        toServer.command = "Log File"
        toServer.message = path
        toServer.actionName = currentAction.name
        toServer.resultID = currentAction.resultID
        toServer.
        this.output<<groovy.json.JsonOutput.toJson(toServer)+"--EOM--"
    }

    public static void main(String[] args){
        def server
        if(args.size() == 1){
            server = new ServerSocket(args[0].toInteger())
        }
        else{
            server = new ServerSocket(3002)
        }
        println "launcher running."
        boolean stopExecution = false;

        while(!stopExecution) {
            server.accept() { socket ->
                    socket.tcpNoDelay = true
                    socket.withStreams { input, output ->
                        this.output = output
                        input.eachLine() { line ->
                            //println line
                            def command = new JsonSlurper().parseText(line)
                            //output << '{"error":null,"status":"started"}--EOM--'
                            if (command.command == "run action"){
                                this.currentAction = command
                                runAction(command)
                                output<<groovy.json.JsonOutput.toJson(command)+"--EOM--"
                            }
                            else if (command.command == "exit"){
                                //println "exiting"
                                System.exit(0)
                                return;
                            }
                        }
                    }
            }
        }
    }

    public static def runAction(action){
        action["result"] = "Passed"
        try{
            if (action.testcaseName){
                globals.testcaseName = action.testcaseName
            }

            if (action.script == ""){
                assert false, "Script was not assigned to the action."
            }

            if (action.script == null){
                assert false, "Script was not assigned to the action."
            }

            def methodName = action.script.tokenize(".")[-1]
            def className = action.script[0..(action.script.lastIndexOf(".")-1)]
            def params = [:]
            action.parameters.each{param->
                if (param.value != "<NULL>"){
                    if ((param.value.getClass() == String ) && (param.value.startsWith("\${")) && (param.value.endsWith("}"))){
                        def var = param.value.subSequence(2,param.value.size()-1)
                        if(returnValues."$var"){
                            params[param.name] = returnValues."$var"
                            return
                        }
                    }
                    params[param.name] = param.value
                }
            }

            def returnValue = Class.forName(className).newInstance()."$methodName"(params)
            if (returnValue){
                if(action.returnValueName){
                    returnValues."$action.returnValueName" = returnValue
                }
                if ([Collection, Object[]].any { it.isAssignableFrom(returnValue.getClass()) }){
                    boolean allStrings = true
                    returnValue.each{
                        if (it.getClass() != String){
                            allStrings = false
                        }
                    }
                    if (allStrings == true){
                        action["returnValue"] = returnValue
                    }
                }
                else{
                    if (returnValue.getClass() == String){
                        action["returnValue"] = returnValue
                    }
                }

            }
            if(action["allScreenshots"] == true){
                takeScreenshot(action)
            }
        }
        catch (Error error){
            //def error = StackTraceUtils.sanitizeRootCause(err)
            action["result"] = "Failed"
            if(error.message == null){
                action["error"] = "Unknown Error"
            }
            else{
                action["error"] = error.message
            }
            action["trace"] = error.stackTrace.toArrayString()
            takeScreenshot(action)
        }
        catch (Exception error){
            //def error = StackTraceUtils.sanitizeRootCause(err)
            action["result"] = "Failed"
            if(error.message == null){
                action["error"] = "Unknown Error"
            }
            else{
                action["error"] = error.message
            }
            action["trace"] = error.stackTrace.toArrayString()

            takeScreenshot(action)
        }
        action["command"] = "action finished"
    }

    private static takeScreenshot(def action){
        if(action["ignoreScreenshots"] == false){
            String id = UUID.randomUUID().toString() + action.resultID

            try{
                try {
                    def browser = Class.forName("actions.selenium.Browser")
                    if((browser.Driver != null) &&(browser.class.name.toString() != "SwipeableWebDriver")){
                        File scrFile = ((org.openqa.selenium.TakesScreenshot)browser.Driver).getScreenshotAs(org.openqa.selenium.OutputType.FILE);
                        new File(id) << scrFile.bytes
                    }
                } catch(Exception e) {
                    // it does not exist on the classpath
                }
            }
            finally{
            //catch(Exception ex){
                if(!new File(id).exists()){
                    BufferedImage image = new Robot().createScreenCapture(new Rectangle(Toolkit.getDefaultToolkit().getScreenSize()));
                    ImageIO.write(image, "png", new File(id));
                }
            }
            action["screenshot"] = id
        }
    }
}
