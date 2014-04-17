package com.primatest.ui

import com.jidesoft.swing.JideTabbedPane
import net.miginfocom.swing.MigLayout
import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea
import org.fife.ui.rsyntaxtextarea.SyntaxConstants
import org.fife.ui.rtextarea.RTextScrollPane

import javax.swing.JPanel
import javax.swing.JSplitPane
import javax.swing.JTabbedPane

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/11/14
 * Time: 3:43 PM
 * To change this template use File | Settings | File Templates.
 */
class IDEView extends JPanel {

    def fileView
    JTabbedPane tabbedPane
    IDEView(){
        this.setLayout(new MigLayout())
        tabbedPane = new JideTabbedPane()
        tabbedPane.setUseDefaultShowCloseButtonOnTab(false);
        tabbedPane.setShowCloseButtonOnTab(true);


        fileView = new FileExplorer("Dima","c:\\SeleniumRecorder",this)

        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT,
                fileView, tabbedPane);
        splitPane.setOneTouchExpandable(true);
        splitPane.setDividerLocation(250);
        add(splitPane,"push, grow,height 200:3000:")
    }

    def openGroovyFile(File file){
        openFile(file,SyntaxConstants.SYNTAX_STYLE_GROOVY)
    }

    def openJavaFile(File file){
        openFile(file,SyntaxConstants.SYNTAX_STYLE_JAVA)
    }

    def openXMLFile(File file){
        openFile(file,SyntaxConstants.SYNTAX_STYLE_XML)
    }

    def openTextFile(File file){
        openFile(file,SyntaxConstants.SYNTAX_STYLE_NONE)
    }

    def openFile(File file,def type){
        RSyntaxTextArea textArea = new RSyntaxTextArea(10, 275);
        textArea.setSyntaxEditingStyle(type);
        textArea.setCodeFoldingEnabled(true);
        textArea.setAntiAliasingEnabled(true);
        RTextScrollPane sp = new RTextScrollPane(textArea);
        sp.setFoldIndicatorEnabled(true);
        RTextScrollPane codeView = new RTextScrollPane(textArea)
        textArea.setText(file.text)
        textArea.setCaretPosition(0)
        tabbedPane.add(file.name,codeView)
        tabbedPane.setSelectedComponent(codeView)
    }
}
