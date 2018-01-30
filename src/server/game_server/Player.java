package server.game_server;

import org.java_websocket.WebSocket;

/**
 *
 * @author Texhnolyze
 */
public class Player {
    
    public static final int NONE            = 0;
    public static final int WAITING_FOR_OPP = 1;
    public static final int IN_BATTLE       = 2;
    
    public static final int CELL_NONE       = 0;
    public static final int CELL_SHIP       = 1;
    public static final int CELL_SHOOTED    = 2;
    
    public final WebSocket socket;
    public int state = NONE;
    
    public Player opp;
    
    public int[][] ships;
    public int numAliveCells;
    
    public boolean ready;
    public boolean turns;
    
    public Player(WebSocket socket) {
        this.socket = socket;
    }
    
}
