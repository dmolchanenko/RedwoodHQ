package com.primatest.ui

import com.primatest.objectfinder.LookingGlass
import com.primatest.recorder.Recorder
import groovy.json.JsonSlurper
import groovy.ui.SystemOutputInterceptor
import net.miginfocom.swing.MigLayout
import org.codehaus.groovy.control.CompilerConfiguration
import org.codehaus.groovy.control.customizers.ImportCustomizer
import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea
import org.fife.ui.rsyntaxtextarea.SyntaxConstants
import org.fife.ui.rtextarea.RTextScrollPane
import org.openqa.selenium.*

import javax.swing.ImageIcon
import javax.swing.JButton
import javax.swing.JFormattedTextField
import javax.swing.JLabel
import javax.swing.JOptionPane
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JSplitPane
import javax.swing.JTextArea
import javax.swing.JTextField
import javax.swing.SwingWorker
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import java.text.NumberFormat

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/3/14
 * Time: 11:19 AM
 * To change this template use File | Settings | File Templates.
 */
class CodeTab extends JPanel{

    RSyntaxTextArea textArea
    JTextArea outputText
    MainWindow mainWindow
    def codeTab = this
    JTextField driverName
    JFormattedTextField timeoutValue
    LookingGlass glass = null
    JScrollPane outputView
    Recorder recorder
    boolean recording = false
    boolean running = false
    ImageIcon recordIcon
    ImageIcon stopIcon
    ImageIcon playIcon
    JButton executeBtn
    RTextScrollPane codeView
    def execThread
    boolean firstActionRecorded = false
    def lastURL
    String selectedImports = ""


    CodeTab(def mainWin){
        mainWindow = mainWin
        setLayout(new MigLayout())
        textArea = new RSyntaxTextArea(10, 275);
        textArea.setSyntaxEditingStyle(SyntaxConstants.SYNTAX_STYLE_JAVA);
        textArea.setCodeFoldingEnabled(true);
        textArea.setAntiAliasingEnabled(true);
        RTextScrollPane sp = new RTextScrollPane(textArea);
        sp.setFoldIndicatorEnabled(true);
        codeView = new RTextScrollPane(textArea)
        ImageIcon currentActionIcon = new ImageIcon(mainWindow.jarPath+ "/images/arrow_right_green.png")
        codeView.gutter.setBookmarkingEnabled(true)
        codeView.gutter.setBookmarkIcon(currentActionIcon)

        JLabel nameLabel = new JLabel("Driver variable name:")
        driverName = new JTextField(15)
        driverName.setText("driver")
        JLabel timeoutLabel = new JLabel("Element Timeout:")
        timeoutValue = new JFormattedTextField(NumberFormat.getNumberInstance())
        timeoutValue.setColumns(4)
        timeoutValue.setText("10")
        outputText = new JTextArea(10, 275)
        outputView = new JScrollPane(outputText)

        recordIcon = new ImageIcon(mainWindow.jarPath+ "/images/record.png")
        ImageIcon listIcon = new ImageIcon(mainWindow.jarPath+ "/images/list.png")
        stopIcon = new ImageIcon(mainWindow.jarPath+"/images/stop.png")
        playIcon = new ImageIcon(mainWindow.jarPath+"/images/play.png")
        JButton importBtn = new JButton(listIcon);
        importBtn.setToolTipText("Set your imports for the script.")
        executeBtn = new JButton(playIcon);
        JButton recordBtn = new recordBtn(recordIcon);
        executeBtn.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                if(running){
                    //executeBtn.setIcon(codeTab.playIcon)
                    execThread.stop()
                    running = false
                    return
                }
                executeScript()
                if(running){
                    executeBtn.setIcon(codeTab.stopIcon)
                }
            }
        })
        importBtn.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                JTextArea textField = new JTextArea(10,30)

                JPanel msgPanel = new JPanel()
                JScrollPane scrollPane = new JScrollPane(textField);
                textField.setText(selectedImports)
                msgPanel.setLayout(new MigLayout())
                msgPanel.add(new JLabel("<html>Default Imports:<br/>import org.openqa.selenium.support.ui.*;<br/>import org.openqa.selenium.*;<br/>import static org.junit.Assert.*;</html>"),"wrap")
                msgPanel.add(scrollPane)

                //scrollPane.setPreferredSize( new Dimension( 500, 500 ) );
                int choice = JOptionPane.showConfirmDialog(mainWindow,msgPanel, "Selected Imports",
                        JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
                if(choice == JOptionPane.OK_OPTION){
                    selectedImports = textField.getText()
                }
            }
        })


        JSplitPane splitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT,
                codeView, outputView);
        splitPane.setOneTouchExpandable(true);
        splitPane.setDividerLocation(250);

        JPanel topPanel = new JPanel()
        topPanel.add(executeBtn)
        topPanel.add(recordBtn)
        topPanel.add(timeoutLabel)
        topPanel.add(timeoutValue)
        topPanel.add(nameLabel)
        topPanel.add(driverName)
        topPanel.add(importBtn)
        add(topPanel,"wrap")
        add(splitPane)
        //add(codeView,"span, grow,height 200:1200:")
        //add(outputView,"span, grow,height 100::")
        recorder = new Recorder()
    }

    public void executeScript(){
        outputText.setText("")
        if (glass == null) {
            JOptionPane.showMessageDialog(mainWindow,
                    "Start Browser at Inspect tab.",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }
        if (recording) {
            JOptionPane.showMessageDialog(mainWindow,
                    "Please stop recording first.",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }

        def systemOutInterceptor = new SystemOutputInterceptor({ String s ->
            outputText.setText(outputText.getText()+s)
            return false})
        systemOutInterceptor.start()
        running = true
        lastURL = null
        textArea.setEditable(false)
        mainWindow.pointerBtn.setEnabled(false)
        mainWindow.performActionBtn.setEnabled(false)
        firstActionRecorded = false
        glass.RecDriver.manage().timeouts().implicitlyWait(timeoutValue.getText().toInteger(), java.util.concurrent.TimeUnit.SECONDS)
        execThread = new Thread(new Runnable() {
            public void run() {
                int lastLine = -1
                def trackActions = {line->
                    if(lastLine != -1) codeView.gutter.toggleBookmark(lastLine)
                    lastLine = line
                    codeView.gutter.toggleBookmark(line)
                    if(line != 0)textArea.setCaretPosition(textArea.getLineEndOffset(line-1)+1)
                    return glass.RecDriver
                }
                Binding binding = new Binding()
                binding.setVariable(driverName.getText(), glass.RecDriver)
                binding.setVariable("trackActions", trackActions)
                //CompilerConfiguration configuration = new CompilerConfiguration()
                //def importCustomizer = new ImportCustomizer()
                //importCustomizer.addStarImport ("import org.openqa.selenium")
                //configuration.addCompilationCustomizers(importCustomizer)
                GroovyShell shell = new GroovyShell(binding)
                def script = ""
                int index = 0
                textArea.getText().eachLine {line->
                    int found = line.indexOf(driverName.getText())
                    if(found != -1){
                        if(found == 0){
                            line = line.replaceFirst(driverName.getText()+".","trackActions($index).")
                        }
                        line.findAll( /[^A-Za-z]${driverName.getText()}[.]/).each {
                            line = line.replaceFirst(it[1..it.size()-1],"trackActions($index).")
                        }
                        script = script +  line + "\r\n"
                        //script = script + (line =~ /[^A-Za-z]${driverName.getText()}[.]/).replaceAll("trackActions($index).") + "\r\n"
                        //script = script + line.replace(driverName.getText()+".","trackActions($index).") + "\r\n"
                    }
                    else{
                        script = script +  line + "\r\n"
                    }
                    //script = script + "trackActions($index)\r\n" + line + "\r\n"
                    index++
                }
                def imports = ""
                selectedImports.eachLine {
                    if(it.startsWith("import")){
                        if(!it.endsWith(";")){
                            imports = imports + ";" + it
                        }
                        else{
                            imports = imports + it
                        }
                    }
                }
                script = "import org.openqa.selenium.support.ui.*;import org.openqa.selenium.*;import static org.junit.Assert.*;"+imports+"\r\n"+ script

                try{
                    shell.evaluate(script)
                }
                catch(Error ex){
                    println ex.message

                }
                catch(Exception ex){
                    println ex.getMessage()
                    ex.getStackTrace().each { def trace->
                        //Script1.run(Script1.groovy:16)
                        if(trace.toString().trim().startsWith("Script1.run")){
                            int lineNumber =  trace.toString().split(":")[1].split("\\)")[0].toInteger()
                            println "ERROR LINE: ${lineNumber-1}"
                        }
                    }
                    //outputText.setText(ex.getMessage())
                }
                finally {
                    outputText.setCaretPosition(0)
                    systemOutInterceptor.stop()
                    running = false
                    executeBtn.setIcon(codeTab.playIcon)
                    mainWindow.pointerBtn.setEnabled(true)
                    mainWindow.performActionBtn.setEnabled(true)
                    if(lastLine != -1)codeView.gutter.toggleBookmark(lastLine)
                    textArea.setEditable(true)
                    textArea.setUseFocusableTips(true)
                }
            }
        })
        execThread.start()


    }

    class recordBtn extends JButton implements ActionListener {
        class ObjectLocator extends SwingWorker<String, Object> {
            private CodeTab tab
            ObjectLocator(CodeTab tab) {
                this.tab = tab
            }

            @Override
            public String doInBackground() {
                def returnClosure = {recording ->
                    publish(recording)
                }
                while(tab.recording){
                    tab.recorder.record(returnClosure)
                }
                return ""
            }

            @Override
            protected void process(List<Object> chunks) {
                for (Object record : chunks) {
                    if(tab.recording == false) return
                    addRecording(record)
                }
            }
        }


        public recordBtn(ImageIcon icon) {
            super.setIcon(icon)
            addActionListener(this)
        }
        public void actionPerformed(ActionEvent e) {
            if(codeTab.recording){
                codeTab.recording = false
                codeTab.recorder.stop()
                this.setIcon(codeTab.recordIcon)
                mainWindow.pointerBtn.setEnabled(true)
                mainWindow.performActionBtn.setEnabled(true)
                return
            }
            if (glass == null) {
                JOptionPane.showMessageDialog(mainWindow,
                        "Start Browser at Inspect tab.",
                        "Error",
                        JOptionPane.ERROR_MESSAGE);
                return
            }
            if (codeTab.glass.RecDriver.capabilities.browserName == "internet explorer") {
                JOptionPane.showMessageDialog(mainWindow,
                        "Recorder does not currently work with IE.",
                        "Error",
                        JOptionPane.ERROR_MESSAGE);
                return
            }

            if (mainWindow.lookingForObject == true) {
                JOptionPane.showMessageDialog(mainWindow,
                        "Please stop inspecting elements by clicking on any of them.",
                        "Error",
                        JOptionPane.ERROR_MESSAGE);
                return
            }
            recorder.RecDriver = glass.RecDriver
            recording = true
            mainWindow.pointerBtn.setEnabled(false)
            mainWindow.performActionBtn.setEnabled(false)
            (new ObjectLocator(codeTab)).execute();
            this.setIcon(codeTab.stopIcon)
        }

        public void addRecording(def recordings){
            if(recordings.size()>0) firstActionRecorded = true
            if(!firstActionRecorded && glass.RecDriver.getCurrentUrl() != null && glass.RecDriver.getCurrentUrl().startsWith("http://")){
                if(lastURL == null || lastURL != glass.RecDriver.getCurrentUrl()){
                    lastURL = glass.RecDriver.getCurrentUrl()
                    textArea.setText(textArea.getText()+driverName.getText() + ".get(\"${lastURL}\");\r\n")
                }
            }
            def enterResponse = null
            def clickResponse = null
            recordings.each{record ->
                def parsedResponse
                try{
                    parsedResponse = new JsonSlurper().parseText(record)
                }
                catch(Exception ex){
                    return
                }
                if(parsedResponse.operation == "click"){
                    clickResponse = driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).click();\r\n"
                    //textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).click();\r\n")
                }
                else if(parsedResponse.operation == "sendKeys"){
                    textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).clear();\r\n")
                    textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).sendKeys(\"${parsedResponse.data}\");\r\n")
                }
                else if(parsedResponse.operation == "clear"){
                    textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).clear();\r\n")
                }
                else if(parsedResponse.operation == "select"){
                    textArea.setText(textArea.getText()+"new Select(${driverName.getText()}.findElement(By.xpath(\"${parsedResponse.id}\"))).selectByVisibleText(\"${parsedResponse.data}\");\r\n")
                }
                else if(parsedResponse.operation == "sendEnter"){
                    enterResponse = driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).sendKeys(org.openqa.selenium.Keys.ENTER);\r\n"
                }
            }
            if(enterResponse != null){
                textArea.setText(textArea.getText()+enterResponse)
            }
            if(clickResponse != null){
                textArea.setText(textArea.getText()+clickResponse)
            }
        }
    }
}