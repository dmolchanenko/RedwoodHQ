import socket
import json
import sys
import importlib
import traceback
import time
import pythonLauncher

returnValues = {}
globalValues = {}
variables = {}
currentAction = {}

def runAction(action):
    action["result"] = "Passed"
    try:
        if "testcaseName" in action:
            pythonLauncher.globalValues["testcaseName"] = action["testcaseName"]
        if "variables" in action:
            for key, value in action["variables"].iteritems():
                pythonLauncher.variables[key] = value
        if "script" in action:
            if action["script"] == "" or action["script"] is None:
                raise Exception("Script was not assigned to the action.")
        methodName = action["script"].split(".")[-1]
        className = action["script"].split(".")[-2]
        packageName = ".".join(action["script"].split(".")[:-2])
        mod = importlib.import_module(packageName)
        classDef = getattr(mod,className)
        classValue = classDef()
        methodValue = getattr(classValue, methodName)

        params = {}
        for param in action["parameters"]:
            paramValue = param["value"]
            paramKey = param["name"]
            if paramValue != "<NULL>":
                if (paramValue.__class__.__name__ == "str" or paramValue.__class__.__name__ == "unicode") and paramValue.startswith("${") and paramValue.endswith("}"):
                    var = paramValue[2:-1]
                    if var in pythonLauncher.returnValues:
                        params[paramKey] = pythonLauncher.returnValues[var]
                    else:
                        params[paramKey] = paramValue
                else:
                    params[paramKey] = paramValue
            else:
                params[paramKey] = paramValue
        returnValue = methodValue(params)
        sys.stdout.flush()
        if returnValue is not None:
            if "returnValueName" in action:
                pythonLauncher.returnValues[action["returnValueName"]] = returnValue
            if isinstance(returnValue, list):
                allStrings = True
                for value in returnValue:
                    if value.__class__.__name__ != "str" and value.__class__.__name__ != "unicode":
                        allStrings = False
                if allStrings == True:
                    action["returnValue"] = returnValue
            elif returnValue.__class__.__name__ == "str" or returnValue.__class__.__name__ == "unicode":
                action["returnValue"] = returnValue
    except Exception as e:
        sys.stdout.flush()
        action["result"] = "Failed"
        if e.message is None:
            action["error"] = "Unknown Error"
        else:
            action["error"] = e.message
        action["trace"] = traceback.format_exc()
    action["command"] = "action finished"

if __name__ == '__main__':
    host = ''
    port = int(sys.argv[1])
    backlog = 5
    size = 1024
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((host,port))
    s.listen(backlog)
    stopExecution = False
    print "launcher running."
    sys.stdout.flush()
    client, address = s.accept()
    while not stopExecution:
        data = client.recv(size)
        if data:
            lines = data.split("\r\n")
            for line in lines:
                command = None
                try:
                    command = json.loads(line)
                except:
                    continue
                if command["command"] == "run action":
                    runAction(command)
                    client.send(json.dumps(command)+"--EOM--")
                if command["command"] == "exit":
                    client.close()
                    sys.exit()
            #client.send(data)
        #client.close()


