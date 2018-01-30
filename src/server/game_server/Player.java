package server.game_server;

import org.java_websocket.WebSocket;

/**
 *
 * @author Texhnolyze
 */
public class Player {
    
    public static final int S_NONE            = 0;
    public static final int S_WAITING_FOR_OPP = 1;
    public static final int S_IN_BATTLE       = 2;
    
    public static final int CELL_NONE       = 1;
    public static final int CELL_SHIP       = 2;
    public static final int CELL_SHOOTED    = 4;
    
    public final WebSocket socket;
    public int state = S_NONE;
    
    public Player opp;
    
    public int[][] ships;
    public int numAliveCells;
    
    public boolean ready;
    public boolean turns;
    
    public Player(WebSocket socket) {
        this.socket = socket;
    }
    
}
