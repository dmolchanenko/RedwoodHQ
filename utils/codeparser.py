import inspect
import sys
import imp
import os
mainPath = os.environ['PYTHONPATH']
operation = sys.argv[1]
if(operation == "MethodList"):
    classType = sys.argv[3]
    if(classType == "class"):
        filePath = sys.argv[2]
        name  = inspect.getmoduleinfo(filePath).name
        loadedModule = imp.load_source(name, filePath)
        fullModulePath  = os.path.dirname(loadedModule.__file__)
        fullModulePath = fullModulePath.replace(mainPath,"")[:]
        fullModulePath = fullModulePath.replace("\\",".")
        fullModulePath = fullModulePath.replace("/",".")
        for className, data in inspect.getmembers(loadedModule, inspect.isclass):
            #if(className != "__init__" and hasattr(data, 'module')):
            if(className != "__init__"):
                if(fullModulePath != ""):
                    print fullModulePath + "." + name + "." + className
                else:
                    print name + "." + className
    else:
        filePath = sys.argv[2]
        className = sys.argv[3]
        name  = inspect.getmoduleinfo(filePath).name
        loadedModule = imp.load_source(name, filePath)
        for name, data in inspect.getmembers(loadedModule, inspect.isclass):
            if(name == className.split(".")[-1]):
                for name, data in inspect.getmembers(data, inspect.ismethod):
                    print name