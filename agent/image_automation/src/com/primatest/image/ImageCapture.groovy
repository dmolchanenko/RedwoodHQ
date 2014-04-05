package com.primatest.image

import javax.imageio.ImageIO
import javax.swing.JPanel
import javax.swing.SwingUtilities
import java.awt.BorderLayout
import java.awt.Color
import java.awt.Cursor
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;

import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingConstants
import java.awt.event.WindowEvent
import java.awt.image.BufferedImage;


class ImageCapture extends JFrame implements MouseListener, MouseMotionListener {

    private static final long serialVersionUID = 1L;
    public listener
    private final JLabel mousePosition;
    int x1, x2, y1, y2;
    int x, y, w, h;
    boolean isNewRect = true;
    JPanel panel;

    public ImageCapture() {
        super( "Rectangle Drawer" );

        setUndecorated(true)
        setBackground(new Color(0,0,0,0));

        panel = new TransparentPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                if (g instanceof Graphics2D) {

                    g.setColor(new Color(0F,0F,0F,0.6F))
                    g.fillRect(0, 0, getWidth(), getHeight());
                    if ( !isNewRect ){
                        ImageCapture parent = (ImageCapture) SwingUtilities.getWindowAncestor(this);
                        g.setColor(Color.black)
                        g.drawRect(parent.x, parent.y, parent.w, parent.h);
                        g.clearRect(parent.x, parent.y, parent.w, parent.h);
                    }
                }
            }
        };
        setContentPane(panel);
        this.mousePosition = new JLabel();
        this.mousePosition.setHorizontalAlignment( SwingConstants.CENTER );
        getContentPane().add( this.mousePosition, BorderLayout.CENTER );

        addMouseListener( this ); // listens for own mouse and
        addMouseMotionListener( this ); // mouse-motion events

        Rectangle screen = new Rectangle(Toolkit.getDefaultToolkit().getScreenSize())
        setSize(screen.width.toInteger(),screen.height.toInteger());
        setVisible( true );
        setCursor(Cursor.getPredefinedCursor(Cursor.CROSSHAIR_CURSOR))

    }

// MouseListener event handlers // handle event when mouse released immediately after press
    public void mouseClicked( final MouseEvent event ) {
        repaint();
    }

// handle event when mouse pressed
    public void mousePressed( final MouseEvent event ) {
        this.x1 = event.getX()
        this.y1 = event.getY()
        this.isNewRect = true;

        repaint();
    }

// handle event when mouse released after dragging
    public void mouseReleased( final MouseEvent event ) {
        this.x2 = event.getX()
        this.y2 = event.getY()
        println ("done here")
        //sleep(5000)
        Robot robot = new Robot()
        BufferedImage image = robot.createScreenCapture(new Rectangle(x,y,w,h))
        listener(image)
        this.dispatchEvent(new WindowEvent(this, WindowEvent.WINDOW_CLOSING))
        repaint();
    }

// handle event when mouse enters area
    public void mouseEntered( final MouseEvent event ) {
        repaint();
    }

// handle event when mouse exits area
    public void mouseExited( final MouseEvent event ) {
        repaint();
    }

// MouseMotionListener event handlers // handle event when user drags mouse with button pressed
    public void mouseDragged( final MouseEvent event ) {
        this.x2 = event.getX()
        this.y2 = event.getY()

        this.isNewRect = false;

        repaint();
    }

// handle event when user moves mouse
    public void mouseMoved( final MouseEvent event ) {
        repaint();
    }

    @Override
    public void paint( final Graphics g ) {
        super.paint( g ); // clear the frame surface

        int width = this.x1 - this.x2;
        int height = this.y1 - this.y2;

        this.w = Math.abs( width );
        this.h = Math.abs( height );
        this.x = width < 0 ? this.x1
        : this.x2;
        this.y = height < 0 ? this.y1
        : this.y2;

    }
}

class TransparentPanel extends JPanel {
    {
        setOpaque(false);
    }
    /*
    public void paintComponent(Graphics g) {
        g.setColor(getBackground());
        Rectangle r = g.getClipBounds();
        g.fillRect(r.x, r.y, r.width, r.height);
        super.paintComponent(g);
    }
    */
}
