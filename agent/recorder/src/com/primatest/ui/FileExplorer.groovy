package com.primatest.ui

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
import java.awt.GridLayout
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
    DefaultMutableTreeNode rootNode
    IDEView mainView
    JidePopupMenu popup
    JPanel treePanel

    public FileExplorer(def ProjectName,def projectPath,mainView){
        treePanel = this
        this.mainView = mainView
        this.setLayout(new MigLayout())
        rootNode = new FileNode(new File(projectPath))
        //rootNode = new FileNode("$ProjectName [$projectPath]")
        DefaultTreeModel treeModel = new DefaultTreeModel(rootNode)
        fileTree = new JTree(treeModel)
        popup = new JidePopupMenu()
        popup.add(new JMenuItem("File"))


        rootNode.setUserObject("$ProjectName [$projectPath]")
        MouseListener ml = new MouseAdapter() {
            public void mousePressed(MouseEvent e) {
                int selRow = fileTree.getRowForLocation(e.getX(), e.getY());
                TreePath selPath = fileTree.getPathForLocation(e.getX(), e.getY());

                if(selRow != -1) {
                    if(SwingUtilities.isRightMouseButton(e)){
                        fileTree.clearSelection()
                        fileTree.addSelectionRow(selRow)
                        popup.show(treePanel,e.getX(),e.getY())
                        return
                    }
                    if(e.getClickCount() == 1) {
                        //mySingleClick(selRow, selPath);
                    }
                    else if(e.getClickCount() == 2) {
                        def selectedNode =  selPath.getLastPathComponent()
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

        addFilesToDirNode(rootNode,rootNode.file)
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
            FileNode childNode = new FileNode(it)
            parentNode.add(childNode)
            if(it.isDirectory()){
                addFilesToDirNode(childNode,it)
            }
        }
    }
}

class FileNode extends DefaultMutableTreeNode implements Comparable {
    def file
    public FileNode(File file) {
        super(file.name)
        this.file = file
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
