package com.primatest.image

import com.sun.awt.AWTUtilities
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.highgui.Highgui
import org.opencv.imgproc.Imgproc

import javax.imageio.ImageIO
import javax.swing.JFrame
import javax.swing.JOptionPane
import java.awt.Graphics2D
import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit
import java.awt.color.ColorSpace
import java.awt.event.InputEvent
import java.awt.image.BufferedImage
import java.awt.image.ComponentColorModel
import java.awt.image.DataBuffer
import java.awt.image.DataBufferByte
import java.awt.image.DirectColorModel
import java.awt.image.SampleModel
import java.awt.image.WritableRaster

/**
 * Created with IntelliJ IDEA.
 * User: Dmitri
 * Date: 10/26/13
 * Time: 10:30 AM
 * To change this template use File | Settings | File Templates.
 */
class Main {
    static {
        Runtime.getRuntime().loadLibrary0(groovy.lang.GroovyClassLoader.class, Core.NATIVE_LIBRARY_NAME)
    }

    public static void main(String[] args){
        clickImage()
        return;
        JOptionPane.showMessageDialog(null, "Select section of the screen you want recorded.");
        ImageCapture application = new ImageCapture();
        application.listener = {BufferedImage image->
            try{
                ImageIO.write(image, "png", new File(args[0]))
            }
            catch (Exception ex){}
        }
        application.setDefaultCloseOperation( JFrame.EXIT_ON_CLOSE );
        //ImageCapture.getOwnerlessWindows()
        //Window main = ImageCapture.getOwnerlessWindows()[0]
        //AWTUtilities.setWindowOpacity(main, 0)

        //return
        //sleep(4000)

    }

    public static clickImage(){
        def match_method = Imgproc.TM_SQDIFF_NORMED
        //def match_method = Imgproc.TM_CCOEFF
        //String outFile = "c:\\temp\\result.jpg"
        Robot robot = new Robot()
        BufferedImage image = robot.createScreenCapture(new Rectangle(Toolkit.getDefaultToolkit().getScreenSize()))

        int[] nBits = [8, 8, 8];
        ComponentColorModel cm = new ComponentColorModel(
                ColorSpace.getInstance(ColorSpace.CS_sRGB),nBits,
                //ColorSpace.getInstance(ColorSpace.CS_GRAY),
                false,  //no alpha channel
                false,  //not premultiplied
                //ColorModel.OPAQUE,
                DirectColorModel.TRANSLUCENT,
                DataBuffer.TYPE_BYTE); //important - data in the buffer is saved by the byte

        SampleModel sm = cm.createCompatibleSampleModel(image.getWidth(), image.getHeight());
        //DataBufferByte db = new DataBufferByte(image.getWidth()*image.getHeight()*1); //3 channels buffer
        DataBufferByte db = new DataBufferByte(image.getWidth()*image.getHeight()*3); //3 channels buffer
        WritableRaster r = WritableRaster.createWritableRaster(sm, db, new java.awt.Point(0,0));
        BufferedImage cvImg = new BufferedImage(cm,r,false,null);

        //BufferedImage cvImg = new BufferedImage(image.getWidth(), image.getHeight(),BufferedImage.TYPE_INT_ARGB);

        Graphics2D g = cvImg.createGraphics();
        //g.setColor(Color.white);
        //g.fillRect(0, 0, image.getWidth(), image.getHeight());
        //AffineTransform transform = AffineTransform.getShearInstance(0.2, 0.1);
        //transform.scale(0.5, 0.5);
        g.drawImage(image, 0, 0,null);
        //g.drawImage(image,transform,null)
        g.dispose();
        byte[] pixels = ((DataBufferByte)cvImg.getRaster().getDataBuffer()).getData()

        //ImageIO.write(cvImg, "png", new File("c:\\temp\\image2.png"))

        //Mat img = new Mat(0, 0, CvType.CV_8UC1)
        //Mat img = new Mat(image.getWidth(), image.getHeight(), CvType.CV_8UC1)
        //Mat image2 = new Mat(image.getHeight(),image.getWidth(), CvType.CV_8UC4)
        Mat image2 = new Mat(image.getHeight(),image.getWidth(), CvType.CV_8UC3)
        //CvType.CV_8
        //img.put(1,  pixels.size(), pixels)
        image2.put(0, 0, pixels)

        //Highgui.imwrite("c:\\temp\\image3.png", image2);
        Mat img = new Mat();
        Imgproc.cvtColor(image2,img,Imgproc.COLOR_RGB2BGR,3)

        //Imgproc.cvtColor(image2,img,3,3)

        //Mat img = Highgui.imdecode(pixels,Highgui.CV_LOAD_IMAGE_ANYDEPTH)
        //Mat  img = Highgui.imread("C:\\Projects\\QuarkAutomation\\ImageAutomation\\Release\\original.jpg")
        //Mat  templ = Highgui.imread("C:\\Projects\\QuarkAutomation\\ImageAutomation\\Release\\match.jpg",Highgui.CV_LOAD_IMAGE_GRAYSCALE)
        Mat  templ = Highgui.imread("c:\\temp\\match.png",3)

        // / Create the result matrix
        int result_cols = img.cols() - templ.cols() + 1;
        int result_rows = img.rows() - templ.rows() + 1;
        Mat result = new Mat(result_rows, result_cols, CvType.CV_8UC3);
        //Mat result = new Mat(result_rows, result_cols, CvType.CV_32FC1);

        // / Do the Matching and Normalize
        Imgproc.matchTemplate(img, templ, result, match_method);
        //Core.normalize(result, result, 0, 1, Core.NORM_MINMAX, -1, new Mat());

        // / Localizing the best match with minMaxLoc
        Core.MinMaxLocResult mmr = Core.minMaxLoc(result);

        //Core.maxLocs()

        Point matchLoc;
        if (match_method == Imgproc.TM_SQDIFF || match_method == Imgproc.TM_SQDIFF_NORMED) {
            matchLoc = mmr.minLoc;
        } else {
            matchLoc = mmr.maxLoc;
        }

        println mmr.minVal
        println mmr.maxVal

        if(mmr.minVal < 0.1){
            println "found it"
            int xPos =  matchLoc.x.toInteger()+(templ.cols().toInteger()/2)
            int yPos =  matchLoc.y.toInteger()+(templ.rows().toInteger()/2)

            robot.mouseMove(xPos, yPos);
            robot.mousePress(InputEvent.BUTTON1_MASK);
            robot.delay(50);
            robot.mouseRelease(InputEvent.BUTTON1_MASK);
            robot.mousePress(InputEvent.BUTTON1_MASK);
            robot.delay(50);
            robot.mouseRelease(InputEvent.BUTTON1_MASK)
        }
        //if(mmr.minVal > 0){
        //robot.mousePress(InputEvent.BUTTON1_MASK);
        //robot.mouseRelease(InputEvent.BUTTON1_MASK);
        //}
        // / Show me what you got
        //Core.rectangle(image2, matchLoc, new Point(matchLoc.x + templ.cols(),
        //        matchLoc.y + templ.rows()), new Scalar(0, 255, 0));

        // Save the visualized detection.
        //System.out.println("Writing "+ outFile);
        //Highgui.imwrite(outFile, image2);
        /*
        System.out.println("Welcome to OpenCV " + Core.VERSION);
        Mat m = new Mat(5, 10, CvType.CV_8UC1, new Scalar(0));
        System.out.println("OpenCV Mat: " + m);
        Mat mr1 = m.row(1);
        mr1.setTo(new Scalar(1));
        Mat mc5 = m.col(5);
        mc5.setTo(new Scalar(5));
        System.out.println("OpenCV Mat data:\n" + m.dump());
        */
    }
}
