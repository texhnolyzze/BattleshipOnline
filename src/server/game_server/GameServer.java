package server.game_server;

import java.net.InetSocketAddress;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Scanner;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

/**
 *
 * @author Texhnolyze
 */
public class GameServer extends WebSocketServer {
    
//  players from whom the request is awaited
    private Collection<Player> noneStatePlayers = new HashSet<>();
    
    private Collection<Player> waitingPlayers = new HashSet<>();
    
//  All connected players 
    private Map<WebSocket, Player> players = new HashMap<>();

    public GameServer(InetSocketAddress address) {
        super(address);
    }
    
    @Override
    public void onOpen(WebSocket ws, ClientHandshake ch) {
        Player p = new Player(ws);
        noneStatePlayers.add(p);
        players.put(ws, p);
    }

    @Override
    public void onMessage(WebSocket ws, String msg) {
        Player p = players.get(ws);
        if (p == null) return;
        if (p.state == Player.S_NONE) {
            if (msg.equals("request_to_play")) {
                noneStatePlayers.remove(p);
                if (waitingPlayers.isEmpty()) {                
                    waitingPlayers.add(p);
                    p.state = Player.S_WAITING_FOR_OPP;
                } else {
                    Iterator<Player> it = waitingPlayers.iterator();
                    Player opp = it.next();
                    it.remove();
                    p.state = Player.S_IN_BATTLE;
                    opp.state = Player.S_IN_BATTLE;
                    p.opp = opp;
                    opp.opp = p;
                    p.socket.send("opp_found");
                    opp.socket.send("opp_found");
                }
            }
        } else if (p.state == Player.S_IN_BATTLE) {
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
                                noneStatePlayers.add(p);
                                noneStatePlayers.add(p.opp);                                
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
        }
    }
    
    @Override
    public void onClose(WebSocket ws, int i, String string, boolean bln) {
        unexpected(ws);
    }

    @Override
    public void onError(WebSocket ws, Exception e) {
        unexpected(ws);
        e.printStackTrace();
    }
    
//  Unexpected situations include errors and close connections
    private void unexpected(WebSocket ws) {
        Player p = players.get(ws);
        if (p != null) {
            players.remove(ws);
            noneStatePlayers.remove(p);
            waitingPlayers.remove(p);
            if (p.state == Player.S_IN_BATTLE) {
                Player opp = p.opp;
                if (opp != null) {
                    opp.opp = null;
                    opp.numAliveCells = 0;
                    opp.turns = false;
                    opp.ready = false;
                    opp.ships = null;
                    opp.state = Player.S_NONE;
                    noneStatePlayers.add(opp);
                    opp.socket.send("opp_leaved");
                }
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
