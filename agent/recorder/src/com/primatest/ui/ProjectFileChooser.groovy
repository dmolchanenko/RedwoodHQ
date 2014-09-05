package com.primatest.ui

import com.jidesoft.swing.FolderChooser

import javax.swing.filechooser.FileView
import javax.swing.*;
import javax.swing.filechooser.*;
/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/24/14
 * Time: 3:19 PM
 * To change this template use File | Settings | File Templates.
 */
class ProjectFileChooser extends JFileChooser{

    public void approveSelection(){
        if (getSelectedFile().isDirectory() && new File(getSelectedFile().absolutePath+"/.lg").exists())
        {
            super.approveSelection();
        }
    }

}

class ProjectFileView extends FileView{
    public def jarPath = new File(this.class.getProtectionDomain().getCodeSource().getLocation().getPath()).parentFile.absolutePath

    public ProjectFileView(){
        super()
        if(!new File(jarPath+"/images").exists()){
            jarPath = System.getProperty("user.dir")
        }
    }

    public Icon getIcon(File file)
    {
        if (file.isDirectory()) {
            if(new File(file.absolutePath+"/.lg").exists()){
                return new ImageIcon(jarPath+"/images/find.png");
            }
        }

        FileSystemView view=FileSystemView.getFileSystemView();
        return view.getSystemIcon(file);
    }
}

