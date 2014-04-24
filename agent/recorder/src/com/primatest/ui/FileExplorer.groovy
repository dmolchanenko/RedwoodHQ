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
    JMenuItem deleteMenu
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
                    //fileTree.get
                }
            }
        })
        deleteMenu =new JMenuItem("Delete")
        newMenu.add(newFileMenu)

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
                        if(selectedNode.file.name.endsWith(".groovy")){
                            mainView.openGroovyFile(selectedNode.file)
                        }
                        else if(selectedNode.file.name.endsWith(".java")){
                            mainView.openJavaFile(selectedNode.file)
                        }
                        else if(selectedNode.file.name.endsWith(".xml")){
                            mainView.openXMLFile(selectedNode.file)
                        }
                        else {
                            mainView.openTextFile(selectedNode.file)
                        }
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
                return c
            }
        });
        add(treeView,"span,push, grow,height 200:3000:")
    }

    public openFile(def file){
        mainView.openGroovyFile(file)
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
            String compStr = "!"+file.name
            return compStr.compareToIgnoreCase(o.toString())
        }
        return this.toString().compareToIgnoreCase(o.toString())
    }
}


class FileDialog extends StandardDialog{

    public FileDialog(def parent,String title){
        super((Frame) parent, title)
    }

    JComponent createBannerPanel() {
        return null
    }

    JComponent createContentPanel() {
        JPanel panel = new JPanel()
        JTextField textField = new JTextField(25)
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
                setDialogResult(RESULT_CANCELLED);
                setVisible(false);
                dispose();
            }
        });

        okButton.setAction(new AbstractAction(UIDefaultsLookup.getString("OptionPane.okButtonText")) {
            public void actionPerformed(ActionEvent e) {
                setDialogResult(RESULT_AFFIRMED);
                setVisible(false);
                dispose();
            }
        });

        buttonPanel.addButton(okButton, ButtonPanel.AFFIRMATIVE_BUTTON)
        buttonPanel.addButton(cancelButton, ButtonPanel.CANCEL_BUTTON)
        getRootPane().setDefaultButton(okButton)

        return buttonPanel
    }
}
