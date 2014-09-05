package com.primatest.ui

import com.jidesoft.swing.JideSplitButton
import com.jidesoft.swing.JideTabbedPane
import com.jidesoft.swing.Searchable
import com.jidesoft.swing.SearchableBar
import com.jidesoft.swing.SearchableUtils
import com.primatest.execution.ExecutionEngine
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.ui.SystemOutputInterceptor
import net.miginfocom.swing.MigLayout
import org.apache.tools.ant.Project
import org.apache.tools.ant.ProjectHelper
import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea
import org.fife.ui.rsyntaxtextarea.SyntaxConstants
import org.fife.ui.rtextarea.RTextScrollPane
import org.gpl.JSplitButton.JSplitButton
import org.gpl.JSplitButton.action.SplitButtonActionListener

import javax.swing.AbstractAction
import javax.swing.Action
import javax.swing.ImageIcon
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JEditorPane
import javax.swing.JLabel
import javax.swing.JMenuItem
import javax.swing.JPanel
import javax.swing.JPopupMenu
import javax.swing.JScrollPane
import javax.swing.JSplitPane
import javax.swing.JTextField
import javax.swing.JToolBar
import javax.swing.KeyStroke
import javax.swing.event.ChangeEvent
import javax.swing.event.ChangeListener
import javax.swing.event.HyperlinkEvent
import javax.swing.event.HyperlinkListener
import javax.swing.event.PopupMenuEvent
import javax.swing.event.PopupMenuListener
import java.awt.BorderLayout
import java.awt.Event
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import java.awt.event.KeyEvent
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/11/14
 * Time: 3:43 PM
 * To change this template use File | Settings | File Templates.
 */
class IDEView extends JPanel {

    def currentTextArea
    FileExplorer fileView
    LGTabbedPane tabbedPane
    def mainWindow
    def currentProjectSettings = [:]
    JSplitPane splitPane
    JEditorPane compileOutput
    def currentProjectDir = null
    RecordButton recordButton
    JTextField driverName
    def nameAppend = 0
    def execThread

    IDEView(mainWin,projectPath,projectName){
        mainWindow = mainWin
        this.setLayout(new MigLayout())
        tabbedPane = new LGTabbedPane()
        tabbedPane.setUseDefaultShowCloseButtonOnTab(false)
        tabbedPane.setShowCloseButtonOnTab(true)
        tabbedPane.addChangeListener(new ChangeListener() {
            void stateChanged(ChangeEvent changeEvent) {
                if(tabbedPane.getSelectedComponent() != null){
                    currentTextArea = tabbedPane.getSelectedComponent().textArea
                    recordButton.textArea = tabbedPane.getSelectedComponent().textArea
                }
                else{
                    currentTextArea = null
                }
            }
        })

        compileOutput = new JEditorPane()
        compileOutput.setEditorKit(JEditorPane.createEditorKitForContentType("text/html"))
        JScrollPane scrollPane = new JScrollPane(compileOutput)
        compileOutput.setEditable(false)
        compileOutput.addHyperlinkListener(new HyperlinkListener() {
            public void hyperlinkUpdate(HyperlinkEvent e) {
                if(e.getEventType() == HyperlinkEvent.EventType.ACTIVATED) {
                    String filePath = e.description.substring(0,e.description.lastIndexOf(":"))
                    int lineNumber = e.description.substring(e.description.lastIndexOf(":")+1,e.description.size()).trim().toInteger()
                    openFile(new File(filePath))
                    int caretPos = 0
                    int lineCount = 1
                    tabbedPane.selectedComponent.textArea.getText().eachLine{
                        if(lineNumber == lineCount){
                            tabbedPane.selectedComponent.textArea.setCaretPosition(caretPos)
                        }
                        caretPos = caretPos + it.size() + 1
                        lineCount++
                    }
                }
            }
        });

        fileView = new FileExplorer(projectPath,projectName,this)

        splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT,fileView, tabbedPane)
        splitPane.setOneTouchExpandable(true)
        splitPane.setDividerLocation(250)

        JSplitPane verticalSplitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT,splitPane, scrollPane)
        verticalSplitPane.setOneTouchExpandable(true)

        JToolBar toolBar = new JToolBar()
        toolBar.setFloatable(false)
        JLabel nameLabel = new JLabel("Driver variable name:")
        JLabel blankLabel = new JLabel("    ")
        driverName = new JTextField(15)
        driverName.setText("driver")
        recordButton = new RecordButton(mainWindow,currentTextArea,driverName)

        ImageIcon saveIcon = new ImageIcon(mainWindow.jarPath+"/images/saveAll.png")
        ImageIcon compileIcon = new ImageIcon(mainWindow.jarPath+"/images/compile.png")
        ImageIcon playIcon = new ImageIcon(mainWindow.jarPath+"/images/play.png")
        JButton playButton = new JButton(playIcon)
        playButton.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {

                if(tabbedPane.getSelectedComponent() != null){
                    saveAll()
                    if(compile() == false){
                        return
                    }
                    if(!new File("temp").exists()){
                        new File("temp").mkdir()
                    }
                    new File("temp/").eachFile {
                        try{
                            it.delete()
                        }
                        catch (Exception ex){
                            println ex.message
                        }
                    }
                    nameAppend++
                    def tempName = ""
                    new File(currentProjectDir+"/build/jar/").eachFileMatch(~".*jar"){
                        def source = Paths.get(it.absolutePath)
                        tempName = "temp/${it.name}${nameAppend}"
                        def target = Paths.get(tempName)
                        Files.copy(source, target)
                    }
                    def driver
                    if(mainWindow.glass == null){
                        driver = null
                    }
                    else{
                        driver = mainWindow.glass.RecDriver
                    }
                    def imports = ""
                    tabbedPane.selectedComponent.textArea.getText().eachLine(){
                        if(it.contains("import ")){
                            imports = imports + it+"\r\n"
                        }
                    }
                    compileOutput.setText("")
                    def systemOutInterceptor = new SystemOutputInterceptor({ String s ->
                        compileOutput.getDocument().insertString(compileOutput.getDocument().length,s,null)
                        return false})
                    systemOutInterceptor.start()
                    execThread = new Thread(new Runnable() {
                        public void run() {
                            def printlnException = {ex->
                                println ex.message
                                ex.getStackTrace().each{
                                    println it
                                }
                            }
                            try{
                                ExecutionEngine.runCodeSnippet(imports+tabbedPane.selectedComponent.textArea.getSelectedText(),driver,"driver",currentProjectDir.replace("\\","/")+"/build/jar/Selenium.jar")
                                //ExecutionEngine.runCodeSnippet(imports+tabbedPane.selectedComponent.textArea.getSelectedText(),driver,"driver",tempName)
                            }
                            catch(Exception ex){
                                printlnException(ex)
                            }
                            catch(Error ex){
                                printlnException(ex)
                            }
                            finally{
                                systemOutInterceptor.stop()
                            }
                        }
                    })
                    execThread.start()
                    //ExecutionEngine.runJavaTestCase(tabbedPane.getSelectedComponent().file)
                }
            }
        })
        JButton compileButton = new JButton(compileIcon)
        compileButton.setToolTipText("Compile")
        compileButton.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                compile()
            }
        })

        JButton saveButton = new JButton(saveIcon)
        saveButton.setToolTipText("Save All (Ctrl+S)")
        saveButton.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                saveAll()
            }
        })

        KeyStroke keySave = KeyStroke.getKeyStroke(KeyEvent.VK_S, Event.CTRL_MASK)
        Action performSave = new AbstractAction("Save") {
            public void actionPerformed(ActionEvent e) {
                saveAll()
            }
        };

        saveButton.getActionMap().put("performSave", performSave)
        saveButton.getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put(keySave, "performSave")
        toolBar.add(saveButton)
        toolBar.add(compileButton)
        toolBar.add(recordButton)
        toolBar.add(playButton)
        toolBar.add(blankLabel)
        toolBar.add(nameLabel)
        toolBar.add(driverName)

        add(toolBar,"wrap")
        add(verticalSplitPane,"push, grow,height 200:3000:")
        //add(splitPane,"push, grow,height 200:3000:")
    }

    def boolean compile(){
        if(!currentProjectDir) return false
        saveAll()
        def antFile = new File(currentProjectDir + "/build.xml")
        def project = new Project()
        project.init()
        ProjectHelper.projectHelper.parse(project, antFile)
        try{
            compileOutput.setText("Compiling...")
            project.executeTarget(project.defaultTarget)
            compileOutput.setText("BUILD SUCCESSFUL")
            return true
        }
        catch (Exception ex){

            compileOutput.setText(ex.message+"<br/>"+causeToHtml(ex.cause))
            return false
        }
    }

    def causeToHtml(def trace){
        String details = ""
        trace.toString().eachLine {line->
            def found = null
            if (line.contains(".groovy")){
                found = ".groovy"
            }
            else if(line.contains(".java")){
                found = ".java"
            }
            if(found != null){
                if(line.contains(currentProjectDir)){
                    def fileName = line.substring(line.indexOf(currentProjectDir),line.indexOf(found)+found.size())
                    fileName = fileName + ":"+line.tokenize(fileName)[0]
                    details = details + "<br/>" + line.replace(fileName,"<a href=\"${fileName}\">${fileName}</a>")
                }
            }
            else{
                details = details + "<br/>" + line
            }
        }
        return  details
    }

    def saveAll(){
        if(tabbedPane == null) return
        for(int i = 0;i<tabbedPane.getTabCount();i++){
            tabbedPane.getComponentAt(i).file.setText(tabbedPane.getComponentAt(i).textArea.getText())
        }
    }

    def openFile(File file){
        def found = findTabComponent(file)
        if(found != null){
            tabbedPane.setSelectedComponent(found)
            found.textArea.requestFocus()
            return
        }
        def type
        if(file.name.endsWith(".groovy")){
            type = SyntaxConstants.SYNTAX_STYLE_GROOVY
        }
        else if(file.name.endsWith(".java")){
            type = SyntaxConstants.SYNTAX_STYLE_JAVA
        }
        else if(file.name.endsWith(".xml")){
            type = SyntaxConstants.SYNTAX_STYLE_XML
        }
        else {
            type = SyntaxConstants.SYNTAX_STYLE_NONE
        }
        JPanel panel = new JPanel(new BorderLayout())

        RSyntaxTextArea textArea = new RSyntaxTextArea(10, 275)
        textArea.setSyntaxEditingStyle(type)
        textArea.setCodeFoldingEnabled(true)
        textArea.setAntiAliasingEnabled(true)
        RTextScrollPane sp = new RTextScrollPane(textArea)
        sp.setFoldIndicatorEnabled(true);
        RTextScrollPane codeView = new RTextScrollPane(textArea)
        panel.add(codeView, BorderLayout.CENTER);
        panel.metaClass.file = file
        panel.metaClass.textArea = textArea
        textArea.setText(file.text)
        textArea.setCaretPosition(0)
        Searchable searchable = SearchableUtils.installSearchable(textArea)
        SearchableBar.install(searchable,KeyStroke.getKeyStroke(KeyEvent.VK_F,KeyEvent.CTRL_DOWN_MASK),
                new SearchableBar.Installer() {
                    public void openSearchBar(SearchableBar searchableBar) {
                        String selectedText = textArea.getSelectedText();
                        if (selectedText != null && selectedText.length() > 0) {
                            searchableBar.setSearchingText(selectedText);
                        }
                        panel.add(searchableBar, BorderLayout.BEFORE_FIRST_LINE);
                        panel.invalidate();
                        panel.revalidate();
                    }

                    void closeSearchBar(SearchableBar searchableBar) {
                        panel.remove(searchableBar);
                        panel.invalidate();
                        panel.revalidate();
                    }
                });

        tabbedPane.add(file.name,panel)
        tabbedPane.setSelectedComponent(panel)
        codeView.textArea.requestFocus()
    }

    def findTabComponent(File file){
        for(int i = 0;i<tabbedPane.getTabCount();i++){
            if(tabbedPane.getComponentAt(i).file.absolutePath == file.absolutePath){
                return tabbedPane.getComponentAt(i)
            }
        }
        return null
    }

    def removeFileFromView(File file){
        def component = findTabComponent(file)
        if(component != null){
            tabbedPane.remove(component)
        }
    }

    def renameFile(File oldFile,File newFile){
        def component = findTabComponent(oldFile)
        if(component != null){
            tabbedPane.setTitleAt(tabbedPane.indexOfComponent(component),newFile.name)
        }
    }

    def newProject(def name,def path){
        currentProjectDir = path
        new File(path+"/.lg").mkdir()
        new File(path+"/bin").mkdir()
        new File(path+"/External Libraries").mkdir()

        new File(System.getProperty("user.dir")+"/lib").eachFileMatch(~".*selenium.*"){
            Path source = Paths.get(it.absolutePath)
            Path target = Paths.get(path+"/External Libraries/"+it.name)
            Files.copy(source, target)
        }

        Path source = Paths.get(System.getProperty("user.dir")+"/lib/chromedriver")
        Path target = Paths.get(path+"/bin/chromedriver")
        Files.copy(source, target)

        source = Paths.get(System.getProperty("user.dir")+"/lib/chromedriver.exe")
        target = Paths.get(path+"/bin/chromedriver.exe")
        Files.copy(source, target)

        source = Paths.get(System.getProperty("user.dir")+"/lib/chromedriver_linux")
        target = Paths.get(path+"/bin/chromedriver_linux")
        Files.copy(source, target)

        source = Paths.get(System.getProperty("user.dir")+"/lib/IEDriverServer.exe")
        target = Paths.get(path+"/bin/IEDriverServer.exe")
        Files.copy(source, target)

        new File(path+"/src").mkdir()
        currentProjectSettings = [:]
        currentProjectSettings.Name = name

        new File(path+"/.lg/projectSettings.json").setText(new JsonBuilder( currentProjectSettings ).toPrettyString())

        fileView = new FileExplorer(name,path,this)
        splitPane.setLeftComponent(fileView)
        splitPane.setDividerLocation(250)
    }

    void openProject(File file) {
        currentProjectDir = file.absolutePath
        currentProjectSettings = new JsonSlurper().parseText(new File(file.absolutePath+"/.lg/projectSettings.json").text)
        fileView = new FileExplorer(currentProjectSettings.Name,file.absolutePath,this)
        splitPane.setLeftComponent(fileView)
        splitPane.setDividerLocation(250)
    }

    File createNewFile(String path,String text){
        File newFile = new File(path)
        newFile.setText(text)
        newFile.createNewFile()
        openFile(newFile)
        return newFile
    }
}

class LGTabbedPane extends JideTabbedPane{
    public void removeTabAt(int index){
        this.getComponentAt(index).file.setText(this.getComponentAt(index).textArea.getText())
        super.removeTabAt(index)
    }
}
