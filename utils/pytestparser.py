import pytest
import os
import sys
import re

tests = []

class PytestPlugin:
    tests = []
    def pytest_pycollect_makeitem(collector, name, obj):
        print name
    def pytest_collection_modifyitems(session, config, items):
        for item in items:
            markers = ""
            for marker in item.keywords._markers:
                if type(item.keywords._markers[marker]) != bool:
                    markers += "|"+item.keywords._markers[marker].name
            session.tests.append(item.nodeid+markers)


class Unbuffered(object):
   stopCollection = False
   def __init__(self, stream):
       self.stream = stream
   def write(self, data):
       if(re.search('in .* seconds', data) or data == "==================================== ERRORS ===================================="):
           self.stopCollection = True
       if(data != "\n" and self.stopCollection==False):
           tests.append(data)
       #self.stream.write(data)
       self.stream.flush()
   def __getattr__(self, attr):
       return getattr(self.stream, attr)
orig = sys.stdout
sys.stdout = Unbuffered(sys.stdout)
plugin = PytestPlugin()
pytest.main(["-q","--collect-only"], plugins=[plugin])


sys.stdout = orig
#print os.environ["PYTHONPATH"]
for test in plugin.tests:
    print test