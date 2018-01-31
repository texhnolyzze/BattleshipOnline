var socket;

var beep = new Audio('beep.wav');

var FONT_FAMILY = 'Silkscreen';

var CANVAS = document.getElementById('canvas');
var CTX = CANVAS.getContext('2d');

var CELL_SIZE = 32;
var GRID_W = 10 * CELL_SIZE, GRID_H = 10 * CELL_SIZE;
var CENTER_X = CANVAS.width / 2;
var CENTER_Y = CANVAS.height / 2;

var S_PRESS_TO_PLAY         = 0;
var S_CONNECTING            = 1;
var S_SEARCHING_OPPONENT    = 2;
var S_SHIPS_ARRANGEMENT     = 3;
var S_WAITING_OPPONENT      = 4;
var S_BATTLE                = 5;
var S_OPP_LEAVED            = 6;
var S_GAME_OVER             = 7;
var S_PROBLEMS              = 8;

var state = S_PRESS_TO_PLAY;

var CELL_NONE       = 1;
var CELL_SHIP       = 2;
var CELL_SHOOTED    = 4;

var player_ships, opp_ships;

var GRID_COORDS;
var TEMP_SHIP;

var GAME_NAME_X = CENTER_X, GAME_NAME_Y = CENTER_Y / 3;
var game_name_y = 0;

var COLORS = new Array(50);

var color_idx = COLORS.length - 1;
var color_idx_increment = false;
var color_change_timer = Date.now();

var color = 1; //rgb(255, 255, 255)
COLORS[0] = '#ffffff';
for (var i = 1; i < COLORS.length; i++) {
    color = color * 0.95;
    color_hex = Math.round(255 * color).toString(16);
    COLORS[i] = '#' + color_hex + color_hex + color_hex;
}

var DOTS = ['.', '..', '...'];
var dots_idx;
var dots_timer;

var selected_ship;
var ships_remain = new Array(4);
var ships_remain_total;

var player_turn;
var prev_shot;
var aim;
var prev_event;
var win;

function Update() {
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    switch (state) {
        case S_PRESS_TO_PLAY:
            CTX.textAlign = 'center';
            CTX.fillStyle = '#00B2B2';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
            CTX.fillText('BATTLESHIP', GAME_NAME_X, game_name_y);
            game_name_y = Math.min(game_name_y + 1, GAME_NAME_Y);
            if (game_name_y === GAME_NAME_Y) {
                CTX.fillStyle = COLORS[color_idx];
                CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY;
                CTX.fillText('PRESS TO CONNECT THE SERVER AND FIND THE OPPONENT', CENTER_X, CENTER_Y);
                AnimateColors();
            }
            break;
        case S_CONNECTING:
        case S_SEARCHING_OPPONENT:
            var text = state === S_CONNECTING ? 'CONNECTING' : 'SEARCHING FOR OPPONENT';
            CTX.fillStyle = '#ffffff';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
            CTX.textAlign = 'center';
            CTX.fillText(text, CENTER_X, CENTER_Y);
            CTX.fillText(DOTS[dots_idx], CENTER_X, CENTER_Y + CELL_SIZE);
            AnimateDots();
            break;
        case S_SHIPS_ARRANGEMENT:
            ShipsArrangement();
            DrawTempShip(GRID_COORDS[0]);
            CTX.textAlign = 'center';
            CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY;
            CTX.fillText('PRESS 1 2 3 OR 4 TO SELECT', CENTER_X, CENTER_Y + 3.5 * CELL_SIZE);
            CTX.fillText('ONE, TWO, THREE OR FOUR-DECK SHIP RESPECTIVELY', CENTER_X, CENTER_Y + 4.5 * CELL_SIZE);
            CTX.fillText('YOU HAVE:', CENTER_X, CENTER_Y + 5.5 * CELL_SIZE);
            CTX.fillText('*: ' + ships_remain[0] + 'X', CENTER_X, CENTER_Y + 6.5 * CELL_SIZE);
            CTX.fillText('**: ' + ships_remain[1] + 'X', CENTER_X, CENTER_Y + 7.5 * CELL_SIZE);
            CTX.fillText('***: ' + ships_remain[2] + 'X', CENTER_X, CENTER_Y + 8.5 * CELL_SIZE);
            CTX.fillText('****: ' + ships_remain[3] + 'X', CENTER_X, CENTER_Y + 9.5 * CELL_SIZE);
            break;
        case S_WAITING_OPPONENT:
            ShipsArrangement();
            CTX.textAlign = 'center';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
            CTX.fillStyle = '#ffffff';
            CTX.fillText('WAITING FOR THE OPPONENT', CENTER_X, CENTER_Y + 5 * CELL_SIZE);
            CTX.fillText(DOTS[dots_idx], CENTER_X, CENTER_Y + 6 * CELL_SIZE);
            AnimateDots();
            break;
        case S_BATTLE:
            CTX.textAlign = 'center';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
            CTX.fillStyle = '#ffffff';
            CTX.fillText(player_turn ? 'YOUR TURN' : 'OPPONENT TURN', CENTER_X, CENTER_Y / 6);
            CTX.fillText(prev_event, CENTER_X, GRID_COORDS[0].y + GRID_W + 3 * CELL_SIZE);
            CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY;
            CTX.fillText('YOUR FIELD', GRID_COORDS[0].x + GRID_W / 2, GRID_COORDS[0].y - CELL_SIZE);
            CTX.fillText('OPPONENT FIELD', GRID_COORDS[1].x + GRID_W / 2, GRID_COORDS[0].y - CELL_SIZE);
            DrawGrid(GRID_COORDS, 2);
            DrawShips(GRID_COORDS[0], player_ships, null, true);
            DrawShips(GRID_COORDS[1], opp_ships, null, false);
            DrawAim(GRID_COORDS[1], aim);
            break;
        case S_GAME_OVER:
            CTX.textAlign = 'center';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
            CTX.fillStyle = win ? '#ffffff' : '#ff0000';
            CTX.fillText(win ? 'YOU WIN' : 'YOU LOSE', CENTER_X, CENTER_Y / 6);
            CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY;
            CTX.fillText('YOUR FIELD', GRID_COORDS[0].x + GRID_W / 2, GRID_COORDS[0].y - CELL_SIZE);
            CTX.fillText('OPPONENT FIELD', GRID_COORDS[1].x + GRID_W / 2, GRID_COORDS[0].y - CELL_SIZE);
            CTX.fillStyle = COLORS[color_idx];
            CTX.fillText('PRESS ANY KEY TO FIND NEW OPPONENT', CENTER_X, GRID_COORDS[0].y + GRID_W + 3 * CELL_SIZE);
            DrawGrid(GRID_COORDS, 2);
            DrawShips(GRID_COORDS[0], player_ships, null, true);
            DrawShips(GRID_COORDS[1], opp_ships, null, false);
            AnimateColors();
            break;
        case S_OPP_LEAVED:
            CTX.textAlign = 'center';
            CTX.fillStyle = '#ff0000';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY; 
            CTX.fillText('OPPONENT LEAVED', CENTER_X, CENTER_Y);
            CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY; 
            CTX.fillStyle = COLORS[color_idx];
            CTX.fillText('PRESS ANY KEY TO FIND NEW OPPONENT', CENTER_X, CENTER_Y + CELL_SIZE);
            AnimateColors();
            break;
        case S_PROBLEMS:
            CTX.textAlign = 'center';
            CTX.fillStyle = '#ff0000';
            CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY; 
            CTX.fillText('SOMETHING WENT WRONG', CENTER_X, CENTER_Y);
            CTX.fillStyle = '#fffff';
            CTX.fillText('TRY TO RELOAD THE PAGE', CENTER_X, CENTER_Y + CELL_SIZE);                        
            break;
    }
}

function AnimateColors() {
    if (Date.now() - color_change_timer >= 25) {
        color_change_timer = Date.now();
        if (color_idx_increment) {
            color_idx++;
            if (color_idx === COLORS.length - 1) 
                color_idx_increment = false;
        } else {
            color_idx--;
            if (color_idx === 0) 
                color_idx_increment = true;
        }
    }
}

function AnimateDots() {
    if (Date.now() - dots_timer >= 350) {
        dots_timer = Date.now();
        dots_idx = (dots_idx + 1) % DOTS.length;
    }
}

function ShipsArrangement() {
    CTX.fillStyle = '#ffffff';
    CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
    CTX.textAlign = 'center';
    CTX.fillText('SHIPS ARRANGEMENT', CENTER_X, CENTER_Y / 6);
    DrawGrid(GRID_COORDS, 1);
    DrawShips(GRID_COORDS[0], player_ships, TEMP_SHIP, true);
}

function ValidateShip(ships, ship, decks_count) {
    for (var i = 0; i < decks_count; i++)
        if (!ValidateCell(ship[i], ships))
            return false;
    return true;
}

function ValidateCell(cell, ships) {
    if (ships[cell.y][cell.x - 1] === CELL_SHIP) return false;
    if (ships[cell.y - 1][cell.x - 1] === CELL_SHIP) return false;
    if (ships[cell.y - 1][cell.x] === CELL_SHIP) return false;
    if (ships[cell.y - 1][cell.x + 1] === CELL_SHIP) return false;
    if (ships[cell.y][cell.x + 1] === CELL_SHIP) return false;
    if (ships[cell.y + 1][cell.x + 1] === CELL_SHIP) return false;
    if (ships[cell.y + 1][cell.x] === CELL_SHIP) return false;
    if (ships[cell.y + 1][cell.x - 1] === CELL_SHIP) return false;
    return true;
}

function DrawGrid(coords, n) {
    for (var i = 0; i < n; i++) {
        CTX.strokeStyle = '#ffffff';
        var x = coords[i].x, y = coords[i].y;
        for (var j = 1; j < 10; j++) {
            DrawLine(x + j * CELL_SIZE, y, x + j * CELL_SIZE, y + GRID_H);
            DrawLine(x, y + j * CELL_SIZE, x + GRID_W, y + j * CELL_SIZE);
        }
        CTX.strokeStyle = '#00ff00';
        DrawLine(x, y, x + GRID_W, y);
        DrawLine(x + GRID_W, y, x + GRID_W, y + GRID_H);
        DrawLine(x + GRID_W, y + GRID_H, x, y + GRID_H);
        DrawLine(x, y + GRID_H, x, y);    
    }
}

function DrawShips(grid_coords, ships, temp_ship, is_player_ships) {
    CTX.textAlign = 'center';
    CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
    var from = is_player_ships ? 1 : 0;
    var i = is_player_ships ? 0 : 1;
    var to = from + 10;
    for (var y = from; y < to; y++) {
        for (var x = from; x < to; x++) {
            if ((ships[y][x] & CELL_SHIP) !== 0) {
                
                if ((ships[y][x] & CELL_SHOOTED) !== 0) 
                    CTX.fillStyle = '#ff0000';
                else
                    CTX.fillStyle = '#ffffff';
            
                CTX.fillText('*', grid_coords.x + CELL_SIZE * ((x + i) - 1 / 2), grid_coords.y + CELL_SIZE * ((y + i) - 1 / 5));
            } else {
                if ((ships[y][x] & CELL_SHOOTED) !== 0) {
                    CTX.fillStyle = '#ff0000';
                    CTX.fillText('X', grid_coords.x + CELL_SIZE * ((x + i) - 1 / 2), grid_coords.y + CELL_SIZE * ((y + i) - 1 / 5));                
                }
            }
        }
    }
}

function DrawTempShip(grid_coords) {
    CTX.fillStyle = '#ffffff';
    for (var i = 0; i < TEMP_SHIP.length; i++) {
        if (TEMP_SHIP[i].x === -1) break;
        CTX.fillText('*', grid_coords.x + CELL_SIZE * (TEMP_SHIP[i].x - 1 / 2), grid_coords.y + CELL_SIZE * (TEMP_SHIP[i].y - 1 / 5));
    }
}

function DrawAim(grid_coords, aim) {
    CTX.fillStyle = '#00ff00';
    CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
    CTX.textAlign = 'center';
    CTX.fillText('o', grid_coords.x + CELL_SIZE * ((aim.x + 1) - 1 / 2), grid_coords.y + CELL_SIZE * ((aim.y + 1) - 1 / 5));                
}

function DrawLine(x1, y1, x2, y2) {
    CTX.beginPath();
    CTX.moveTo(x1, y1);
    CTX.lineTo(x2, y2);
    CTX.stroke();
}

window.onkeyup = function(event) {
    switch (state) {
        case S_PRESS_TO_PLAY:
            if (game_name_y === GAME_NAME_Y) {
                state = S_CONNECTING;
                dots_idx = 0;
                dots_timer = Date.now();
                socket = new WebSocket('ws:127.0.0.1:8081');
                socket.onopen = function() {
                    state = S_SEARCHING_OPPONENT;
                    socket.send('request_to_play');
                };
                socket.onerror = function(error) {
                    socket = null;
                    state = S_PROBLEMS;
                };
                socket.onclose = function(event) {
                    socket = null;
                    state = S_PROBLEMS;
                };
                socket.onmessage = onmessage;
            }
            break;
        case S_SHIPS_ARRANGEMENT:
            switch (event.keyCode) {
                case 49:
                case 50:
                case 51:
                case 52:
                    var s = event.keyCode - 49;
                    if (s === selected_ship) return;
                    if (ships_remain[s] > 0) {
                        for (var i = s + 1; i < TEMP_SHIP.length; i++) {
                            TEMP_SHIP[i].x = -1;
                            TEMP_SHIP[i].y = -1;
                        }
                        for (var i = 0; i < s + 1; i++) {
                            TEMP_SHIP[i].x = i + 1;
                            TEMP_SHIP[i].y = 1;
                        }
                        selected_ship = s;
                    } else beep.play();
                    break;
                case 37:
                case 38:
                case 39:
                case 40:
                    if (selected_ship !== -1) {
                        var head = TEMP_SHIP[0];
                        var tail = TEMP_SHIP[selected_ship];
                        var t_vec;
                        switch (event.keyCode) {
                            case 37:
                                t_vec = {x: -1, y: 0}; 
                                break;
                            case 38:
                                t_vec = {x: 0, y: -1};
                                break;
                            case 39:
                                t_vec = {x: 1, y: 0};
                                break;
                            case 40:
                                t_vec = {x: 0, y: 1};
                                break;
                        }
                        var head_x = head.x + t_vec.x;
                        var head_y = head.y + t_vec.y;
                        var tail_x = tail.x + t_vec.x;
                        var tail_y = tail.y + t_vec.y;
                        if (head_x >= 1 && head_x <= 10 && head_y >= 1 && head_y <= 10 && tail_x >= 1 && tail_x <= 10 && tail_y >= 1 && tail_y <= 10) {
                            head.x = head_x;
                            head.y = head_y;
                            tail.x = tail_x;
                            tail.y = tail_y;
                            for (var i = 1; i < selected_ship; i++) {
                                TEMP_SHIP[i].x += t_vec.x;
                                TEMP_SHIP[i].y += t_vec.y;
                            }
                        }
                    }
                    break;
                case 32:
                    if (selected_ship !== -1) {
                        var size = selected_ship + 1;
                        var temp = new Array(size);
                        temp[0] = TEMP_SHIP[0];
                        for (var i = 1; i < size; i++) {
                            temp[i] = {x: -1, y: -1};
                            var x = TEMP_SHIP[i].x;
                            var y = TEMP_SHIP[i].y;
                            temp[i].x = y - temp[0].y + temp[0].x;
                            temp[i].y = -x + temp[0].x + temp[0].y;
                            if (temp[i].x < 1 || temp[i].x > 10 || temp[i].y < 1 || temp[i].y > 10) {
                                return;
                            }
                        }
                        for (var i = 1; i < size; i++) TEMP_SHIP[i] = temp[i];
                    }
                    break;
                case 13:
                    if (!ValidateShip(player_ships, TEMP_SHIP, selected_ship + 1)) {
                        beep.play();
                        return;
                    } else {
                        ships_remain[selected_ship]--;
                        ships_remain_total--;
                        for (var i = 0; i < selected_ship + 1; i++) {
                            player_ships[TEMP_SHIP[i].y][TEMP_SHIP[i].x] = CELL_SHIP;
                            TEMP_SHIP[i].x = -1;
                            TEMP_SHIP[i].y = -1;
                        }
                        selected_ship = -1;
                        if (ships_remain_total === 0) {
                            var msg = 'ships_arrangement';
                            for (var y = 1; y < player_ships.length - 1; y++) {
                                msg += '\n';
                                for (var x = 1; x < player_ships.length - 1; x++) {
                                    msg += player_ships[y][x] === CELL_SHIP ? '1' : '0';
                                }
                            }
                            socket.send(msg);
                            state = S_WAITING_OPPONENT;
                        }
                    }
                    break;
            }
            break;
        case S_OPP_LEAVED:
            state = S_SEARCHING_OPPONENT;
            socket.send('request_to_play');
            break;
        case S_BATTLE:
            switch (event.keyCode) {
                case 37:
                    aim.x = Math.max(0, aim.x - 1);
                    break;
                case 38:
                    aim.y = Math.max(0, aim.y - 1);
                    break;
                case 39:
                    aim.x = Math.min(9, aim.x + 1);
                    break;
                case 40:
                    aim.y = Math.min(9, aim.y + 1);
                    break;
                case 13:
                    if (!player_turn) return;
                    socket.send('shot ' + aim.x + ' ' + aim.y);
                    prev_shot.x = aim.x;
                    prev_shot.y = aim.y;
                    break;
            }
            break;
        case S_GAME_OVER:
            state = S_SEARCHING_OPPONENT;
            socket.send('request_to_play');
            break;
    }
};

function onmessage(event) {
    var msg = event.data;
    switch (state) {
        case S_SEARCHING_OPPONENT:
            if (msg === 'opp_found') {
                TEMP_SHIP = new Array(4); 
                for (var i = 0; i < TEMP_SHIP.length; i++) TEMP_SHIP[i] = {x: -1, y: -1};
                GRID_COORDS = new Array(2); //GRID[0] - player ships, GRID[1] - opp ships
                for (var i = 0; i < GRID_COORDS.length; i++) GRID_COORDS[i] = {x: -1, y: -1};
                GRID_COORDS[0].x = CENTER_X - 5 * CELL_SIZE;
                GRID_COORDS[0].y = CENTER_Y - 7.5 * CELL_SIZE;
                player_ships = new Array(12);
                opp_ships = new Array(10);
                for (var i = 0; i < player_ships.length; i++) {
                    player_ships[i] = new Array(12);
                    player_ships[i].fill(CELL_NONE);
                }
                for (var i = 0; i < opp_ships.length; i++) {
                    opp_ships[i] = new Array(10);
                    opp_ships[i].fill(CELL_NONE);
                }
                state = S_SHIPS_ARRANGEMENT;
                selected_ship = -1;
                ships_remain[0] = 4;
                ships_remain[1] = 3;
                ships_remain[2] = 2;
                ships_remain[3] = 1;
                ships_remain_total = 10;
            }
            break;
        case S_WAITING_OPPONENT:
            if (msg.startsWith('start')) {
                GRID_COORDS[0].x = CENTER_X - GRID_W - 3;
                GRID_COORDS[0].y = CENTER_Y - 5.5 * CELL_SIZE;
                GRID_COORDS[1].x = CENTER_X + 3;
                GRID_COORDS[1].y = CENTER_Y - 5.5 * CELL_SIZE;
                state = S_BATTLE;
                player_turn = msg.endsWith('+');
                prev_event = '';
                prev_shot = {x: -1, y: -1};
                aim = {x: 0, y: 0};
            }
        case S_SHIPS_ARRANGEMENT:            
            if (msg === 'opp_leaved') state = S_OPP_LEAVED;
            break;
        case S_BATTLE:
            switch (msg) {
                case 'opp_leaved':
                    state = S_OPP_LEAVED;
                    break;
                case 'sunk':
                case 'hit':
                    prev_event = msg.toUpperCase();
                    opp_ships[prev_shot.y][prev_shot.x] = CELL_SHIP | CELL_SHOOTED;
                    break;
                case 'miss':
                    player_turn = false;
                    prev_event = msg.toUpperCase();
                    opp_ships[prev_shot.y][prev_shot.x] |= CELL_SHOOTED;
                    break;
                case 'win':
                case 'loss':
                    state = S_GAME_OVER;
                    win = msg === 'win';
                    break;
                default:
                    var split = msg.split(' ');
                    var x = parseInt(split[1]) + 1;
                    var y = parseInt(split[2]) + 1;
                    player_ships[y][x] |= CELL_SHOOTED;
                    if (split[0] === ('hit_at')) prev_event = 'OPPONENT HIT AT ' + x + ' ' + y;
                    else if (split[0] === 'miss_at') {
                        player_turn = true;
                        prev_event = 'OPPONENT MISSED AT ' + x + ' ' + y;
                    } else prev_event = 'OPPONENT SUNK YOUR SHIP';
                    break;
        }
            break;
    }
}


setInterval(Update, 1000 / 60);