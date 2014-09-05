package com.primatest.ui

import com.jidesoft.dialog.ButtonPanel
import com.jidesoft.dialog.StandardDialog
import com.jidesoft.plaf.UIDefaultsLookup
import com.jidesoft.popup.JidePopup
import com.jidesoft.swing.JidePopupMenu
import net.miginfocom.swing.MigLayout;

import javax.swing.*
import javax.swing.event.TreeSelectionEvent
import javax.swing.event.TreeSelectionListener
import javax.swing.filechooser.FileSystemView
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeCellRenderer
import javax.swing.tree.DefaultTreeModel
import javax.swing.tree.MutableTreeNode
import javax.swing.tree.TreePath
import java.awt.Component
import java.awt.Frame
import java.awt.GridLayout
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.awt.event.MouseListener;

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/11/14
 * Time: 10:39 AM
 * To change this template use File | Settings | File Templates.
 */
public class FileExplorer extends JPanel {

    JTree fileTree
    DefaultMutableTreeNode rootNode = null
    IDEView mainView
    JidePopupMenu popup
    JPanel treePanel
    JMenuItem newFileMenu
    JMenuItem newTCMenu
    JMenuItem deleteMenu
    JMenuItem renameMenu
    JMenu newMenu

    public FileExplorer(def ProjectName,def projectPath,mainView){
        treePanel = this
        this.mainView = mainView
        this.setLayout(new MigLayout())
        if(projectPath != null && new File(projectPath).exists()){
            rootNode = new FileNode("$ProjectName [$projectPath]",new File(projectPath),"projectRoot")
            DefaultTreeModel treeModel = new DefaultTreeModel(rootNode)
            fileTree = new JTree(treeModel)
            addFilesToDirNode(rootNode,rootNode.file)
        }
        else{
            rootNode = new FileNode("",null,"projectRoot")
            fileTree = new JTree(new DefaultTreeModel(rootNode))
        }
        //rootNode = new FileNode("$ProjectName [$projectPath]")
        newMenu = new JMenu("New")
        newFileMenu = new JMenuItem("File")
        newFileMenu.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                FileDialog dlg = new FileDialog(mainView.mainWindow,"New File")
                dlg.pack()
                dlg.setLocationRelativeTo(mainView.mainWindow)
                dlg.setVisible(true)
                if (dlg.dialogResult == 0){
                    createNewFile("",dlg,false)
                }
            }
        })

        newTCMenu = new JMenuItem("JUnit Test Case")
        newTCMenu.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                FileDialog dlg = new FileDialog(mainView.mainWindow,"New Test Case File Name")
                dlg.pack()
                dlg.setLocationRelativeTo(mainView.mainWindow)
                dlg.textField.setText("TestCase.java")
                dlg.textField.select(0,8)
                dlg.setVisible(true)
                if (dlg.dialogResult == 0){
                    createNewFile(new File("config/testCaseTemplate.java").getText(),dlg,true)
                }
            }
        })

        JMenuItem newDirMenu = new JMenuItem("Directory")
        newDirMenu.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                FileDialog dlg = new FileDialog(mainView.mainWindow,"New Directory")
                dlg.pack()
                dlg.setLocationRelativeTo(mainView.mainWindow)
                dlg.setVisible(true)
                if (dlg.dialogResult == 0){
                    File parentFile = fileTree.getSelectionPath().getLastPathComponent().file
                    FileNode parentNode
                    if(!parentFile.isDirectory()){
                        parentFile = parentFile.getParentFile()
                        parentNode = fileTree.getSelectionPath().getLastPathComponent().parent
                    }
                    else{
                        parentNode = fileTree.getSelectionPath().getLastPathComponent()
                    }
                    String newFilePath = parentFile.absolutePath+"/"+dlg.textField.getText()
                    File newFile = new File(newFilePath)
                    newFile.mkdir()
                    FileNode childNode = new FileNode(dlg.textField.getText(),newFile,"file")
                    parentNode.add(childNode)
                    fileTree.getModel().reload(fileTree.getSelectionPath().getLastPathComponent())
                }
            }
        })

        renameMenu = new JMenuItem("Rename")
        renameMenu.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                FileDialog dlg = new FileDialog(mainView.mainWindow,"Rename")
                dlg.pack()
                dlg.setLocationRelativeTo(mainView.mainWindow)
                dlg.textField.setText(fileTree.getSelectionPath().getLastPathComponent().file.name)
                dlg.setVisible(true)
                if (dlg.dialogResult == 0){
                    File file = fileTree.getSelectionPath().getLastPathComponent().file
                    file.renameTo(file.parentFile.absolutePath +"/" + dlg.textField.getText())
                    fileTree.getSelectionPath().getLastPathComponent().file = new File(file.parentFile.absolutePath +"/" + dlg.textField.getText())
                    fileTree.getSelectionPath().getLastPathComponent().setUserObject(fileTree.getSelectionPath().getLastPathComponent().file.name)
                    mainView.renameFile(file,fileTree.getSelectionPath().getLastPathComponent().file)
                    fileTree.getModel().reload(fileTree.getSelectionPath().getLastPathComponent())
                }
            }
        })
        deleteMenu =new JMenuItem("Delete")

        deleteMenu.addActionListener(new ActionListener() {
            void actionPerformed(ActionEvent actionEvent) {
                File toDelete = fileTree.getSelectionPath().getLastPathComponent().file
                def message
                if(toDelete.isDirectory()){
                    message = "Are you sure you want to delete directory: ${fileTree.getSelectionPath().getLastPathComponent()} and all files under it?\r\n You will be unable to undo this operation."
                }
                else{
                    message = "Are you sure you want to delete file: ${fileTree.getSelectionPath().getLastPathComponent()} ?"
                }
                int n = JOptionPane.showConfirmDialog(
                        mainView.mainWindow,
                        message,
                        "Warning",
                        JOptionPane.YES_NO_OPTION);
                if (n == 0){
                    if(toDelete.isDirectory()){
                        toDelete.eachFileRecurse {
                            mainView.removeFileFromView(it)
                        }
                        toDelete.deleteDir()
                    }
                    else{
                        mainView.removeFileFromView(toDelete)
                        toDelete.delete()
                    }
                    fileTree.getModel().removeNodeFromParent(fileTree.getSelectionPath().getLastPathComponent())
                }
            }
        })
        newMenu.add(newTCMenu)
        newMenu.add(newFileMenu)
        newMenu.add(newDirMenu)

        //popup.set



        MouseListener ml = new MouseAdapter() {
            public void mousePressed(MouseEvent e) {
                int selRow = fileTree.getRowForLocation(e.getX(), e.getY());
                TreePath selPath = fileTree.getPathForLocation(e.getX(), e.getY());

                if(selRow != -1) {

                    if(SwingUtilities.isRightMouseButton(e)){
                        def showDelete = true
                        if (fileTree.getSelectionCount() == 0){
                            fileTree.addSelectionRow(selRow)
                        }
                        popup = new JidePopupMenu()
                        fileTree.getSelectionPaths().each {
                            if(it.getLastPathComponent().type != "file"){
                                showDelete = false
                            }
                        }
                        if(fileTree.getSelectionCount() == 1){
                            popup.add(newMenu)
                            popup.add(renameMenu)
                        }

                        if(showDelete){
                            popup.add(deleteMenu)
                        }

                        popup.show(treePanel,e.getX(),e.getY()+18)
                        return
                    }
                    if(e.getClickCount() == 1) {
                        //mySingleClick(selRow, selPath);
                    }
                    else if(e.getClickCount() == 2) {
                        def selectedNode =  selPath.getLastPathComponent()
                        if(selectedNode.file == null) return
                        if(selectedNode.file.isDirectory()) return
                        mainView.openFile(selectedNode.file)
                        //myDoubleClick(selRow, selPath);
                    }

                }
            }
        }

        fileTree.addMouseListener(ml)
        fileTree.setRootVisible(true);
        fileTree.setShowsRootHandles(true);

        fileTree.expandRow(0)
        JScrollPane treeView = new JScrollPane(fileTree)

        fileTree.setCellRenderer(new DefaultTreeCellRenderer() {
            private ImageIcon groovyIcon = new ImageIcon(System.getProperty("user.dir")+"/images/fileTypeGroovy.png")
            private ImageIcon javaIcon = new ImageIcon(System.getProperty("user.dir")+"/images/fileTypeJava.png")
            @Override
            public Component getTreeCellRendererComponent(JTree tree,
                                                          Object value, boolean selected, boolean expanded,
                                                          boolean isLeaf, int row, boolean focused) {
                Component c = super.getTreeCellRendererComponent(tree, value,
                        selected, expanded, isLeaf, row, focused)
                if(value.file == null) return c
                if (value.file.name.endsWith(".groovy"))
                    setIcon(groovyIcon)
                else if (value.file.name.endsWith(".java"))
                    setIcon(javaIcon)
                else if(value.file.isDirectory()){
                    FileSystemView view=FileSystemView.getFileSystemView()
                    setIcon(view.getSystemIcon(value.file))
                }
                return c
            }
        });
        add(treeView,"span,push, grow,height 200:3000:")
    }

    def createNewFile(text,dlg,boolean code){
        File parentFile = fileTree.getSelectionPath().getLastPathComponent().file
        FileNode parentNode
        if(!parentFile.isDirectory()){
            parentFile = parentFile.getParentFile()
            parentNode = fileTree.getSelectionPath().getLastPathComponent().parent
        }
        else{
            parentNode = fileTree.getSelectionPath().getLastPathComponent()
        }
        String newFilePath = parentFile.absolutePath+"/"+dlg.textField.getText()
        if(new File(newFilePath).exists()){
            JOptionPane.showMessageDialog(mainView.mainWindow,
                    "File with same name already exists.",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }
        File newFile
        if(code){
            def packageName = ""
            File fileCount = parentFile
            while(fileCount.name != "src"){
                fileCount = fileCount.parentFile
                if(packageName == ""){
                    packageName = fileCount.name
                }
                else{
                    packageName = fileCount.name + "." + packageName
                }
            }
            if(packageName != ""){
                text = "package ${packageName};\r\n"+ text
            }

            boolean found = false
            def newText = ""
            text.eachLine {

                if(it.contains("class") && found == false){
                    found = true
                    def foundClass = it.trim().find( /class[^A-Za-z].*[A-Za-z]/)
                    if(foundClass != null){
                        foundClass = foundClass.replace("class","").trim()
                        newText =  newText + it.replaceFirst(foundClass,dlg.textField.getText().tokenize(".")[0])+ "\r\n"
                    }

                }
                else{
                    newText = newText + it + "\r\n"
                }
            }
            text = newText
        }
        try{
           newFile = mainView.createNewFile(newFilePath,text)
        }
        catch(Exception ex){
            JOptionPane.showMessageDialog(mainView.mainWindow,
                    ex.message,
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return
        }
        FileNode childNode = new FileNode(dlg.textField.getText(),newFile,"file")
        parentNode.add(childNode)
        fileTree.getModel().reload(fileTree.getSelectionPath().getLastPathComponent())
    }

    public readDirectory(def path){
        addFilesToDirNode(rootNode,new File(path))
    }

    public addFilesToDirNode(def parentNode,File file){
        file.eachFile{
            FileNode childNode = new FileNode(it.name,it,"file")
            parentNode.add(childNode)
            if(it.isDirectory()){
                addFilesToDirNode(childNode,it)
            }
        }
    }
}

class FileNode extends DefaultMutableTreeNode implements Comparable {
    def file
    def type
    public FileNode(def Text,File file,def type) {
        super(Text)
        this.file = file
        this.type = type
    }
    @Override
    public void insert(final MutableTreeNode newChild, final int childIndex) {
        super.insert(newChild, childIndex)
        Collections.sort(this.children)
    }
    public int compareTo(final Object o) {
        if (this.file.isDirectory() && !o.file.isDirectory()){
            return -1
        }
        else if(!this.file.isDirectory() && o.file.isDirectory()){
            return 1
        }
        return this.toString().compareToIgnoreCase(o.toString())
    }
}


class FileDialog extends StandardDialog{
    JTextField textField

    public FileDialog(def parent,String title){
        super((Frame) parent, title)
    }

    JComponent createBannerPanel() {
        return null
    }

    JComponent createContentPanel() {
        JPanel panel = new JPanel()
        textField = new JTextField(25)
        panel.setLayout(new MigLayout())
        panel.add(textField,"grow,push,height 20:20:20")
        setInitFocusedComponent(textField)
        return panel  //To change body of implemented methods use File | Settings | File Templates.
    }

    ButtonPanel createButtonPanel() {
        ButtonPanel buttonPanel = new ButtonPanel()
        buttonPanel.setAlignment(SwingConstants.CENTER)
        JButton okButton = new JButton("OK")
        JButton cancelButton = new JButton("Cancel")
        okButton.setName("OK")
        cancelButton.setName("Cancel")
        cancelButton.setAction(new AbstractAction(UIDefaultsLookup.getString("OptionPane.cancelButtonText")) {
            public void actionPerformed(ActionEvent e) {
                setDialogResult(RESULT_CANCELLED)
                setVisible(false)
                dispose()
            }
        });

        okButton.setAction(new AbstractAction(UIDefaultsLookup.getString("OptionPane.okButtonText")) {
            public void actionPerformed(ActionEvent e) {
                if(textField.getText() == ""){
                    return
                }
                setDialogResult(RESULT_AFFIRMED)
                setVisible(false)
                dispose()
            }
        });

        buttonPanel.addButton(okButton, ButtonPanel.AFFIRMATIVE_BUTTON)
        buttonPanel.addButton(cancelButton, ButtonPanel.CANCEL_BUTTON)
        getRootPane().setDefaultButton(okButton)

        return buttonPanel
    }
}
