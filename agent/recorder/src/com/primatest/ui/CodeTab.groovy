package com.primatest.ui

import com.primatest.objectfinder.LookingGlass
import com.primatest.recorder.Recorder
import groovy.json.JsonSlurper
import groovy.ui.SystemOutputInterceptor
import net.miginfocom.swing.MigLayout
import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea
import org.fife.ui.rsyntaxtextarea.SyntaxConstants
import org.fife.ui.rsyntaxtextarea.Token
import org.fife.ui.rtextarea.RTextScrollPane

import javax.swing.ImageIcon
import javax.swing.JButton
import javax.swing.JLabel
import javax.swing.JOptionPane
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JTextArea
import javax.swing.JTextField
import javax.swing.SwingWorker
import java.awt.event.ActionEvent
import java.awt.event.ActionListener

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
    def mainWindow
    def codeTab = this
    JTextField driverName
    LookingGlass glass = null
    JScrollPane outputView
    Recorder recorder
    boolean recording = false
    ImageIcon recordIcon
    ImageIcon stopIcon


    CodeTab(){
        setLayout(new MigLayout())
        textArea = new RSyntaxTextArea(10, 275);
        textArea.setSyntaxEditingStyle(SyntaxConstants.SYNTAX_STYLE_JAVA);
        textArea.setCodeFoldingEnabled(true);
        textArea.setAntiAliasingEnabled(true);
        RTextScrollPane sp = new RTextScrollPane(textArea);
        sp.setFoldIndicatorEnabled(true);
        JScrollPane codeView = new JScrollPane(textArea)
        JLabel nameLabel = new JLabel("Driver variable name:")
        driverName = new JTextField(15)
        driverName.setText("driver")
        outputText = new JTextArea(10, 275)
        outputView = new JScrollPane(outputText)

        JButton executeBtn = new JButton(new ImageIcon(System.getProperty("user.dir")+"/images/play.png"));
        recordIcon = new ImageIcon(System.getProperty("user.dir")+"/images/record.png")
        stopIcon = new ImageIcon(System.getProperty("user.dir")+"/images/stop.png")
        JButton recordBtn = new recordBtn(recordIcon);
        executeBtn.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                executeScript()
            }
        })

        JPanel topPanel = new JPanel()
        topPanel.add(executeBtn)
        topPanel.add(recordBtn)
        topPanel.add(nameLabel)
        topPanel.add(driverName)
        add(topPanel,"wrap")
        add(codeView,"span, grow,height 200:1200:")
        add(outputView,"span, grow,height 100::")
        recorder = new Recorder()
    }

    public void executeScript(){
        def systemOutInterceptor = new SystemOutputInterceptor({ String s ->
            outputText.setText(outputText.getText()+s)
            return false})
        systemOutInterceptor.start()
        outputText.setText("")
        if (glass == null) {
            JOptionPane.showMessageDialog(mainWindow,
                    "Start Browser at Inspect tab.",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }
        Binding binding = new Binding()
        binding.setVariable(driverName.getText(), glass.RecDriver)
        GroovyShell shell = new GroovyShell(binding)

        try{
            shell.evaluate("import org.openqa.selenium.*;\r\n"+textArea.getText())
        }
        catch(Exception ex){
            outputText.setText(ex.getMessage())
        }
        finally {
            outputText.setCaretPosition(0)
            systemOutInterceptor.stop()
        }

    }

    class recordBtn extends JButton implements ActionListener {
        class ObjectLocator extends SwingWorker<String, Object> {
            private CodeTab tab
            ObjectLocator(CodeTab tab) {
                this.tab = tab
            }

            @Override
            public String doInBackground() {
                while(tab.recording){
                    def chunk = tab.recorder.record()
                    publish(chunk)
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
                return
            }
            if (glass == null) {
                JOptionPane.showMessageDialog(mainWindow,
                        "Start Browser at Inspect tab.",
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
            (new ObjectLocator(codeTab)).execute();
            this.setIcon(codeTab.stopIcon)
        }

        public void addRecording(def recordings){
            def enterResponse = null
            recordings.each{record ->
                def parsedResponse = new JsonSlurper().parseText(record)
                if(parsedResponse.operation == "click"){
                    textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).click();\r\n")
                }
                else if(parsedResponse.operation == "sendKeys"){
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
        }
    }
}
