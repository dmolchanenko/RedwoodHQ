package redwood.launcher

import groovy.json.JsonSlurper
import redwood.launcher.*

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

    public static log(String message){
        def toServer = [:]
        toServer.command = "Log Message"
        toServer.message = message
        toServer.actionName = currentAction.name
        toServer.resultID = currentAction.resultID
        this.output<<groovy.json.JsonOutput.toJson(toServer)+"--EOM--"
    }

    public static void main(String[] args){
        def server = new ServerSocket(3002)
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
                                println "exiting"
                                stopExecution = true;
                                socket.close()
                                server.close()
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
            def methodName = action.script.tokenize(".")[-1]
            def className = action.script[0..(action.script.lastIndexOf(".")-1)]
            def params = [:]
            action.parameters.each{param->
                if (param.value != "<NULL>"){
                    params[param.name] = param.value
                }
            }

            def returnValue = Class.forName(className).newInstance()."$methodName"(params)
            if (returnValue){
                action["returnValue"] = returnValue
            }

        }
        catch (Error err){
            action["result"] = "Failed"
            action["error"] = err.message
            action["trace"] = err.stackTrace.toArrayString()
        }
        catch (Exception err){
            action["result"] = "Failed"
            action["error"] = err.message
            action["trace"] = err.stackTrace.toArrayString()
        }
        action["command"] = "action finished"
    }
}
