package com.primatest.ui

import com.jidesoft.dialog.ButtonPanel
import com.jidesoft.dialog.StandardDialog
import com.jidesoft.plaf.UIDefaultsLookup
import net.miginfocom.swing.MigLayout

import javax.swing.AbstractAction
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JFileChooser
import javax.swing.JLabel
import javax.swing.JOptionPane
import javax.swing.JPanel
import javax.swing.JTextField
import javax.swing.SwingConstants
import javax.swing.event.DocumentEvent
import javax.swing.event.DocumentListener
import java.awt.Frame
import java.awt.event.ActionEvent
import java.awt.event.ActionListener

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 4/21/14
 * Time: 3:54 PM
 * To change this template use File | Settings | File Templates.
 */
class NewProject extends StandardDialog{
    def parentWindow
    JTextField nameField
    JTextField locationField
    def separator = "/"

    public NewProject(parent){
        super((Frame) parent, "New Project")
        this.parentWindow = parent

        if(System.getProperty("os.name").toLowerCase().indexOf("windows") >= 0){
            separator = "\\"
        }
        else{
            separator = "/"
        }
    }

    JComponent createBannerPanel() {
        return null
    }

    JComponent createContentPanel() {
        JPanel panel = new JPanel()
        panel.setLayout(new MigLayout())

        JButton fileChooserButton = new JButton("...")
        JFileChooser fc = new JFileChooser()
        fc.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY)

        JLabel nameLabel = new JLabel("Project name:")
        nameField = new JTextField(40)
        JLabel locationLabel = new JLabel("Project location:")
        locationField = new JTextField(40)

        nameField.getDocument().addDocumentListener(new DocumentListener() {
            void insertUpdate(DocumentEvent documentEvent) {
                if(locationField.getText().contains(separator)){
                    def list = locationField.getText().substring(0,locationField.getText().lastIndexOf(separator)+1)
                    locationField.setText(list+nameField.getText())

                }
            }

            void removeUpdate(DocumentEvent documentEvent) {
                //To change body of implemented methods use File | Settings | File Templates.
            }

            void changedUpdate(DocumentEvent documentEvent) {
                //To change body of implemented methods use File | Settings | File Templates.
            }
        })
        locationField.setText(System.getProperty("user.dir")+"${separator}projects${separator}")

        fileChooserButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent event) {
                int returnVal = fc.showOpenDialog(parentWindow)
                if (returnVal == JFileChooser.APPROVE_OPTION) {
                    locationField.setText(fc.getSelectedFile().absolutePath)
                    nameField.setText(fc.getSelectedFile().name)
                }
            }
        });



        panel.add(nameLabel)
        panel.add(nameField,"grow,push,height 20:20:20,wrap")
        panel.add(locationLabel)
        panel.add(locationField,"grow,push,height 20:20:20")
        panel.add(fileChooserButton)
        setInitFocusedComponent(nameField)
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
                def closeDlg = false
                if(nameField.text == ""){
                    JOptionPane.showMessageDialog(parentWindow,
                            "Please provide project name.",
                            "Error",
                            JOptionPane.ERROR_MESSAGE)
                    return
                }
                if(!new File(locationField.text).exists()){
                    def dirs = locationField.text.tokenize(separator)
                    if(!new File(dirs[0]).exists()){
                        JOptionPane.showMessageDialog(parentWindow,
                                "Unable to create project under: ${locationField.text.tokenize(separator)[0]}",
                                "Error",
                                JOptionPane.ERROR_MESSAGE);
                    }
                    else{
                        def currentPath = dirs[0]
                        for (int i=1;i<dirs.size();i++){
                            currentPath = currentPath + separator +dirs[i]
                            if(!new File(currentPath).exists()){
                                try{
                                    new File(currentPath).mkdir()
                                    if(i==dirs.size()-1){
                                        closeDlg = true
                                    }
                                }
                                catch (Exception ex){
                                    JOptionPane.showMessageDialog(parentWindow,
                                            "Unable to create directory: ${ex.message}",
                                            "Error",
                                            JOptionPane.ERROR_MESSAGE);
                                    break
                                }
                            }
                        }
                    }
                }
                else{
                    closeDlg = true
                }
                if(closeDlg){
                    setDialogResult(RESULT_AFFIRMED)
                    setVisible(false)
                    dispose()
                }
            }
        });

        buttonPanel.addButton(okButton, ButtonPanel.AFFIRMATIVE_BUTTON)
        buttonPanel.addButton(cancelButton, ButtonPanel.CANCEL_BUTTON)
        getRootPane().setDefaultButton(okButton)

        return buttonPanel
    }
}
