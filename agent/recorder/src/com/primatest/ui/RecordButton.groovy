package com.primatest.ui

import groovy.json.JsonSlurper
import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea

import javax.swing.ImageIcon
import javax.swing.JButton
import javax.swing.JOptionPane
import javax.swing.SwingWorker
import java.awt.event.ActionEvent
import java.awt.event.ActionListener

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/27/14
 * Time: 4:36 PM
 * To change this template use File | Settings | File Templates.
 */
class RecordButton extends JButton implements ActionListener {
    boolean recording = false
    def recorder
    def mainWindow
    def glass
    RSyntaxTextArea textArea
    ImageIcon recordIcon
    ImageIcon stopIcon
    boolean firstActionRecorded
    def lastURL
    def driverName

    class ObjectLocator extends SwingWorker<String, Object> {
        ObjectLocator() {
        }

        @Override
        public String doInBackground() {
            def returnClosure = {recording ->
                publish(recording)
            }
            while(recording){
                mainWindow.codeTab.recorder.record(returnClosure)
            }
            return ""
        }

        @Override
        protected void process(List<Object> chunks) {
            for (Object record : chunks) {
                if(!recording) return
                addRecording(record)
            }
        }
    }


    public RecordButton(mainWindow,textArea,driverName) {
        this.textArea = textArea
        this.driverName = driverName
        this.recordIcon = new ImageIcon(mainWindow.jarPath+ "/images/record.png")
        this.stopIcon = new ImageIcon(mainWindow.jarPath+"/images/stop.png")
        this.mainWindow = mainWindow
        super.setIcon(recordIcon)
        addActionListener(this)
    }
    public void actionPerformed(ActionEvent e) {
        if(textArea == null){
            JOptionPane.showMessageDialog(mainWindow,
                    "Please open file you want to record in.",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }
        if(recording){
            recording = false
            mainWindow.codeTab.recorder.stop()
            this.setIcon(recordIcon)
            mainWindow.pointerBtn.setEnabled(true)
            mainWindow.performActionBtn.setEnabled(true)
            return
        }
        if (mainWindow.glass == null) {
            JOptionPane.showMessageDialog(mainWindow,
                    "Start Browser at Inspect tab.",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }
        if (mainWindow.glass.RecDriver.capabilities.browserName == "internet explorer") {
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
        mainWindow.codeTab.recorder.RecDriver = mainWindow.glass.RecDriver
        recording = true
        mainWindow.pointerBtn.setEnabled(false)
        mainWindow.performActionBtn.setEnabled(false)
        (new ObjectLocator()).execute();
        this.setIcon(stopIcon)
    }

    public void addRecording(def recordings){
        if(recordings.size()>0) firstActionRecorded = true
        if(!firstActionRecorded && mainWindow.glass.RecDriver.getCurrentUrl() != null && mainWindow.glass.RecDriver.getCurrentUrl().startsWith("http://")){
            if(lastURL == null || lastURL != mainWindow.glass.RecDriver.getCurrentUrl()){
                lastURL = mainWindow.glass.RecDriver.getCurrentUrl()
                //textArea.setText(textArea.getText()+driverName.getText() + ".get(\"${lastURL}\");\r\n")
                setRecordedText(driverName.getText()+".get(\"${lastURL}\");\r\n")
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
                //textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).clear();\r\n")
                //textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).sendKeys(\"${parsedResponse.data}\");\r\n")
                setRecordedText(driverName.getText()+".findElement(By.xpath(\"${parsedResponse.id}\")).clear();\r\n")
                setRecordedText(driverName.getText()+".findElement(By.xpath(\"${parsedResponse.id}\")).sendKeys(\"${parsedResponse.data}\");\r\n")
            }
            else if(parsedResponse.operation == "clear"){
                //textArea.setText(textArea.getText()+driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).clear();\r\n")
                setRecordedText(driverName.getText()+".findElement(By.xpath(\"${parsedResponse.id}\")).clear();\r\n")
            }
            else if(parsedResponse.operation == "select"){
                //textArea.setText(textArea.getText()+"new Select(${driverName.getText()}.findElement(By.xpath(\"${parsedResponse.id}\"))).selectByVisibleText(\"${parsedResponse.data}\");\r\n")
                setRecordedText(driverName.getText()+"new Select(${driverName.getText()}.findElement(By.xpath(\"${parsedResponse.id}\"))).selectByVisibleText(\"${parsedResponse.data}\");\r\n")
            }
            else if(parsedResponse.operation == "sendEnter"){
                enterResponse = driverName.getText() + ".findElement(By.xpath(\"${parsedResponse.id}\")).sendKeys(org.openqa.selenium.Keys.ENTER);\r\n"
            }
        }
        if(enterResponse != null){
            //textArea.setText(textArea.getText()+enterResponse)
            setRecordedText(enterResponse)
        }
        if(clickResponse != null){
            //textArea.setText(textArea.getText()+clickResponse)
            setRecordedText(clickResponse)
        }
    }

    def setRecordedText(def text){
        int caretPos = textArea.getCaretPosition()
        textArea.insert(text,caretPos)
        //textArea.setCaretPosition(caretPos+text.size())
    }
}
