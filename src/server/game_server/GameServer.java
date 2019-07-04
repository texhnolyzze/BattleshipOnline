package server.game_server;

import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

/**
 *
 * @author Texhnolyze
 */
public class GameServer extends WebSocketServer {
    
    private Player waitingPlayer;
    private final ReentrantLock waitingPlayerLock = new ReentrantLock();
    
//  All connected players 
    private final Map<WebSocket, Player> players;
    
//                               ???????????
    private static final boolean THREAD_SAFE = true; 

    public GameServer(InetSocketAddress address) {
        super(address, THREAD_SAFE ? Runtime.getRuntime().availableProcessors() : 1);
        players = THREAD_SAFE ? new ConcurrentHashMap<>() : new HashMap<>();
    }
    
    @Override
    public void onOpen(WebSocket ws, ClientHandshake ch) {
        Player p = new Player(ws);
        players.put(ws, p);
    }

    @Override
    public void onMessage(WebSocket ws, String msg) {
        Player p = players.get(ws);
        if (p == null)
            return;
        p.personalLock.lock(); 
        try {
            if (p.state == Player.S_NONE) {
                if (msg.equals("request_to_play")) {
                    waitingPlayerLock.lock();
                    try {
                        if (waitingPlayer == null) {
                            waitingPlayer = p;
                            waitingPlayer.state = Player.S_WAITING_FOR_OPP;
                        } else {
                            waitingPlayer.personalLock.lock();
                            try {
                                if (waitingPlayer.state != Player.S_INVALID) {
                                    Player opp = waitingPlayer;
                                    p.state = Player.S_IN_BATTLE;
                                    opp.state = Player.S_IN_BATTLE;
                                    p.opp = opp;
                                    opp.opp = p;
                                    p.socket.send("opp_found");
                                    opp.socket.send("opp_found");
                                    p.sharedLock = new ReentrantLock();
                                    p.opp.sharedLock = p.sharedLock;
                                    waitingPlayer = null;
                                } else {
                                    waitingPlayer.personalLock.unlock();
                                    waitingPlayer = p;
                                }
                            } finally {
                                if (waitingPlayer != p)
                                    waitingPlayer.personalLock.unlock();
                            }
                        }
                    } finally {
                        waitingPlayerLock.unlock();
                    }
                }
            } else if (p.state == Player.S_IN_BATTLE) {
                p.sharedLock.lock();
                try {
                    if (msg.startsWith("ships_arrangement")) {
                        p.ready = true;
                        p.numAliveCells = 20;
                        p.ships = new int[10][10];
                        int[][] ships = p.ships;
                        Scanner sc = new Scanner(msg);
                        sc.nextLine();
                        for (int y = 0; y < 10; y++) {
                            String line = sc.nextLine();
                            for (int x = 0; x < 10; x++)
                                ships[y][x] = line.charAt(x) == '1' ? Player.CELL_SHIP : Player.CELL_NONE;
                        }
                        if (p.opp.ready) {
                            p.turns = Math.random() < 0.5;
                            p.opp.turns = !p.turns;
                            p.socket.send("start" + (p.turns ? '+' : '-'));
                            p.opp.socket.send("start" + (p.opp.turns ? '+' : '-'));
                        }
                    } else if (msg.startsWith("shot")) {
                        if (!p.turns) return;
                        else {
                            int[][] ships = p.opp.ships;
                            String[] split = msg.split(" ");
                            int x = Integer.parseInt(split[1]), y = Integer.parseInt(split[2]);
                            if ((ships[y][x] & Player.CELL_SHOOTED) != 0) return;
                            else {
                                ships[y][x] |= Player.CELL_SHOOTED;
                                if ((ships[y][x] & Player.CELL_SHIP) != 0) {
                                    p.opp.numAliveCells--;
                                    if (sunk(x, y, ships)) {
                                        p.socket.send("sunk");
                                        p.opp.socket.send("sunk_at " + x + " " + y);
                                    } else {
                                        p.socket.send("hit");
                                        p.opp.socket.send("hit_at " + x + " " + y);
                                    }
                                    if (p.opp.numAliveCells == 0) {
                                        p.socket.send("win");
                                        p.opp.socket.send("loss");
                                        p.ready = p.opp.ready = false;
                                        p.turns = p.opp.turns = false;
                                        p.ships = p.opp.ships = null;
                                        p.numAliveCells = 0;
                                        p.state = p.opp.state = Player.S_NONE;
                                        p.opp = p.opp.opp = null;
                                    }
                                } else {
                                    p.turns = false;
                                    p.opp.turns = true;
                                    p.socket.send("miss");
                                    p.opp.socket.send("miss_at " + x + " " + y);
                                }

                            }
                        }
                    }
                } finally {
                    p.sharedLock.unlock();
                }
            }
        } finally {
            p.personalLock.unlock();
        }
    }
    
    @Override
    public void onClose(WebSocket ws, int i, String string, boolean bln) {
        unexpected(ws);
    }

    @Override
    public void onError(WebSocket ws, Exception e) {
        unexpected(ws);
    }
    
//  Unexpected situations include errors and close connections
    private void unexpected(WebSocket ws) {
        Player p = players.get(ws);
        if (p != null) {
            p.personalLock.lock();
            try {
                players.remove(ws);
                p.state = Player.S_INVALID;
                if (p.opp != null) {
                    p.sharedLock.lock();
                    try {
                        Player opp = p.opp;
                        opp.opp = null;
                        opp.numAliveCells = 0;
                        opp.turns = false;
                        opp.ready = false;
                        opp.ships = null;
                        opp.state = Player.S_NONE;
                        opp.socket.send("opp_leaved");
                    } finally {
                        p.sharedLock.unlock();
                    }
                }
            } finally {
                p.personalLock.unlock();
            }
        }
    }

    @Override
    public void onStart() { 
        System.out.println("Game server starts....");
    } 
    
    private static boolean sunk(int x, int y, int[][] ships) {
        
        for (int i = x - 1; i >= 0; i--) {
            if ((ships[y][i] & Player.CELL_NONE) != 0) break;
            if ((ships[y][i] & Player.CELL_SHOOTED) == 0) return false;
        }
        
        for (int i = x + 1; i <= 9; i++) {
            if ((ships[y][i] & Player.CELL_NONE) != 0) break;
            if ((ships[y][i] & Player.CELL_SHOOTED) == 0) return false;
        }
        
        for (int i = y - 1; i >= 0; i--) {
            if ((ships[i][x] & Player.CELL_NONE) != 0) break;
            if ((ships[i][x] & Player.CELL_SHOOTED) == 0) return false;
        }
        
        for (int i = y + 1; i <= 9; i++) {
            if ((ships[i][x] & Player.CELL_NONE) != 0) break;
            if ((ships[i][x] & Player.CELL_SHOOTED) == 0) return false;
        }
        
        return true;
        
    }
    
}
