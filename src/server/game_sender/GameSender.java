package server.game_sender;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.Charset;
import java.nio.file.Files;

/**
 *
 * @author Texhnolyze
 */
public class GameSender implements Runnable {

    
    private static final Charset UTF8 = Charset.forName("UTF-8");
    
    private static final byte[] CONTENT_TYPE_HTML = "Content-Type: text/html\r\n\r\n".getBytes(UTF8);
    private static final byte[] CONTENT_TYPE_JS = "Content-Type: application/javascript\r\n\r\n".getBytes(UTF8);
    private static final byte[] CONTENT_TYPE_TTF = "Content-Type: font/ttf\r\n\r\n".getBytes(UTF8);
    private static final byte[] CONTENT_TYPE_WAV = "Content-Type: audio/wav\r\n\r\n".getBytes(UTF8);
    
    private final ServerSocket serverSocket;

    private final byte[] indexraw, gameraw;
    private final byte[] fontraw;
    private final byte[] notfoundraw;
    private final byte[] beepraw;
    
    public GameSender(int port) throws IOException {
        System.out.println("Initializing game sender...");
        serverSocket = new ServerSocket(port);
        indexraw = Files.readAllBytes(new File("src/client/index.html").toPath());
        gameraw = Files.readAllBytes(new File("src/client/game_client.js").toPath());
        fontraw = Files.readAllBytes(new File("src/client/resources/font/slkscrb.ttf").toPath());
        beepraw = Files.readAllBytes(new File("src/client/resources/sounds/beep.wav").toPath());
        notfoundraw = Files.readAllBytes(new File("src/client/404.html").toPath());
    }
    
    @Override
    public void run() {
        
        System.out.println("Game sender starts...\n\n");
        
        for (;;) {
            try {
                
                System.out.println("Waiting for request...");
                Socket socket = serverSocket.accept();
                System.out.println("...Request received.");
                
                BufferedReader br = new BufferedReader(new InputStreamReader(socket.getInputStream()));

//              we need only first line from http request.
                String request = br.readLine(); 
                if (request != null) {
                    
                    String[] split = request.split("\\s");
                    if (split.length > 2 && split[0].equalsIgnoreCase("get")) {
                        
                        byte[][] raw = getRawBy(split[1]);
                        byte[] header = (split[2] + (raw[1] == notfoundraw ? " 404 Not Found\r\n" : " 200 OK\r\n")).getBytes(UTF8);
                        
                        OutputStream os = new BufferedOutputStream(socket.getOutputStream());
                        os.write(header);
                        os.write(raw[0]);
                        os.write(raw[1]);
                        os.flush();
                    
                    }
                }
                
                socket.close();
                System.out.println("Success.\n\n\n\n");
            
            } catch (Exception ex) {
                System.err.println(ex + "\n\n\n");
            }
        }
    }
    
    private byte[][] getRawBy(String uri) {
        switch (uri) {
            case "/":
                return new byte[][] {CONTENT_TYPE_HTML, indexraw};
            case "/game_client.js":
                return new byte[][] {CONTENT_TYPE_JS, gameraw};
            case "/slkscrb.ttf":
                return new byte[][] {CONTENT_TYPE_TTF, fontraw};
            case "/beep.wav":
                return new byte[][] {CONTENT_TYPE_WAV, beepraw};
            default:
                return new byte[][] {
                    CONTENT_TYPE_HTML, notfoundraw
                };
        }
    }
    
}
