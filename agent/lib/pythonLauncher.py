import socket
import json
import sys
import importlib
import traceback
import time
import pythonLauncher
import os
import uuid
from time import sleep

class PytestPlugin:
    error = None
    trace = None
    def pytest_exception_interact(node, call, report):
        #if node.trace is not None:
        node.error = call.excinfo._excinfo[1].message
        node.trace = "".join(traceback.format_exception(call.excinfo.type, call.excinfo.value, call.excinfo.tb))
    def pytest_report_teststatus(self,report):
        if(report.longrepr):
            self.error = report.longrepr.reprcrash.message
    def pytest_sessionfinish(self,session):
        if(len(session._notfound) > 0):
            self.error = len(session._notfound)


class Unbuffered(object):
   def __init__(self, stream):
       self.stream = stream
   def write(self, data):
       sleep(0.001)
       self.stream.write(data)
       self.stream.flush()
   def __getattr__(self, attr):
       return getattr(self.stream, attr)

sys.stdout = Unbuffered(sys.stdout)


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
                os.environ[key] = value
        if "script" in action:
            if action["script"] == "" or action["script"] is None:
                raise Exception("Script was not assigned to the action.")
        if "type" in action and action["type"] == "pytest":
            try:
                import pytest
                plugin = PytestPlugin()
                exitcode = pytest.main(["../src/"+action["script"]], plugins=[plugin])
                if plugin.error is not None:
                    action["error"] = plugin.error
                    if(plugin.trace is not None):
                        action["trace"] = plugin.trace
                    action["result"] = "Failed"
                elif exitcode == 4:
                    action["result"] = "Failed"
                    action["error"] = "Fatal Error.  Unable to find test case file."
                action["command"] = "action finished"
            except ImportError:
                action["result"] = "Failed"
                action["error"] = "Unable to import pytest."
                action["command"] = "action finished"
            return
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
        if action["allScreenshots"] is True:
            TakeScreenshot(action)
    except Exception, e:
        sys.stdout.flush()
        action["result"] = "Failed"
        action["error"] = str(e)
        action["trace"] = traceback.format_exc()
        TakeScreenshot(action)
    except:
        sys.stdout.flush()
        action["result"] = "Failed"
        if sys.exc_info()[0] is None:
            action["error"] = "Unknown Error"
        else:
            action["error"] = sys.exc_info()[1].message
        action["trace"] = traceback.format_exc()
        TakeScreenshot(action)
    action["command"] = "action finished"

def TakeScreenshot(action):
    try:
        if action["ignoreScreenshots"] is False and action["executionflow"] != "Ignore Error Continue Test Case":
            shid = str(uuid.uuid4())+action["resultID"]
            from actions.selenium import OpenBrowser
            OpenBrowser.driver.save_screenshot(shid)
            action["screenshot"] = shid
    except:
        return

if __name__ == '__main__':
    host = ''
    port = int(sys.argv[1])
    backlog = 5
    size = 10024
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
                if line == "":
                    continue
                command = None
                try:
                    command = json.loads(line)
                except:
                    print sys.exc_info()[1].message
                    sys.stdout.flush()
                    continue
                if command["command"] == "run action":
                    runAction(command)
                    client.send(json.dumps(command)+"--EOM--")
                    #client.send(command)+"--EOM--"
                if command["command"] == "exit":
                    client.close()
                    sys.exit()
                    break
            #client.send(data)
        #client.close()


