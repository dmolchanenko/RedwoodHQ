Dim WshShell,pid,objFile, strLine,dbPort,dbPath
Set WshShell = CreateObject("WScript.Shell")

Dim objFSO: Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile= objFSO.OpenTextFile(WshShell.CurrentDirectory&"\properties.conf", 1)
Do While Not objFile.AtEndOfStream
	strLine = objFile.readline
	If InStr(1, strLine, "DBPort") = 1 Then
		dbPort = Split(strLine,"=")(1)
	End If
	
Loop
objFile.Close

'WScript.Echo Chr(34) &WshShell.CurrentDirectory&"\vendor\MongoDB\bin\mongod.exe"&Chr(34) & " --dbpath " & Chr(34) & WshShell.CurrentDirectory & "\data\db" & Chr(34) & " --journal"
WshShell.Run Chr(34) &WshShell.CurrentDirectory&"\vendor\MongoDB\bin\mongod.exe"&Chr(34) & " --dbpath " & Chr(34) & WshShell.CurrentDirectory & "\data\db" & Chr(34) & " --journal",0

WshShell.Run Chr(34) &WshShell.CurrentDirectory&"\vendor\nodejs\node.exe"&Chr(34) &" app.js",0


Set objwmi=getobject("winmgmts:\\.\root\cimv2")
Set colProcess = objwmi.ExecQuery("Select * from Win32_Process")
For each ind_process in colProcess
	If ind_process.name="mongod.exe"  Then
		'Wscript.Echo(ind_process.ProcessId)
		pid=ind_process.ProcessId
	End If
	
Next
Set objFileToWrite = CreateObject("Scripting.FileSystemObject").OpenTextFile("db.pid",2,true)
objFileToWrite.WriteLine(pid)
objFileToWrite.Close
Set objFileToWrite = Nothing

