package com.primatest.ui

import com.jidesoft.swing.JideTabbedPane
import groovy.json.JsonBuilder
import net.miginfocom.swing.MigLayout
import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea
import org.fife.ui.rsyntaxtextarea.SyntaxConstants
import org.fife.ui.rtextarea.RTextScrollPane

import javax.swing.JPanel
import javax.swing.JSplitPane
import javax.swing.JTabbedPane
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

    def fileView
    JTabbedPane tabbedPane
    def mainWindow
    def currentProjectSettings = [:]
    IDEView(mainWin,projectPath,projectName){
        mainWindow = mainWin
        this.setLayout(new MigLayout())
        tabbedPane = new JideTabbedPane()
        tabbedPane.setUseDefaultShowCloseButtonOnTab(false);
        tabbedPane.setShowCloseButtonOnTab(true);


        fileView = new FileExplorer(projectPath,projectName,this)

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

    def newProject(def name,def path){
        new File(path+"/.lg").mkdir()
        new File(path+"/bin").mkdir()
        new File(path+"/External Libraries").mkdir()

        new File(System.getProperty("user.dir")+"/lib").eachFileMatch(~"*.selenium.*"){
            Path source = Paths.get(it.absolutePath)
            Path target = Paths.get(path+"/External Libraries/"+it.name)
            Files.copy(source, target)
        }

        Path source = Paths.get(System.getProperty("user.dir")+"/lib")
        Path target = Paths.get(path+"/External Libraries/"+it.name)
        Files.copy(source, target)

        new File(path+"/src").mkdir()
        currentProjectSettings = [:]
        currentProjectSettings.Name = name

        new File(path+"/.lg/projectSettings.json") << new JsonBuilder( currentProjectSettings ).toPrettyString()

    }
}
