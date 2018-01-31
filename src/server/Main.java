package server;

import java.io.IOException;
import java.net.InetSocketAddress;
import org.java_websocket.server.WebSocketServer;
import server.game_sender.GameSender;
import server.game_server.GameServer;

/**
 *
 * @author Texhnolyze
 */
public class Main {

    /**
     * @param args the command line arguments
     */
    public static void main(String[] args) throws IOException {
        
        GameSender gs = new GameSender(8080);
        Thread t = new Thread(gs);
        t.start();
        
        WebSocketServer server = new GameServer(new InetSocketAddress("localhost", 8081));
        server.run();
        
    }
    
}
