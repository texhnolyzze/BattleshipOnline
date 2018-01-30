var socket;

var FONT_FAMILY = 'Silkscreen';

var CANVAS = document.getElementById('canvas');
var CTX = CANVAS.getContext('2d');

var CELL_SIZE = 32;
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

var win;

var CELL_NONE       = 1;
var CELL_SHIP       = 2;
var CELL_SHOOTED    = 4;

var player_ships, opp_ships;

var GAME_NAME_X = CENTER_X, GAME_NAME_Y = CENTER_Y / 3;
var game_name_y = 0;

var INVITATION_LABEL_COLORS = new Array(50);

var invitation_label_color_idx = INVITATION_LABEL_COLORS.length - 1;
var invitation_label_color_idx_increment = false;
var invitation_label_color_change_timer = Date.now();

var color = 1; //rgb(255, 255, 255)
INVITATION_LABEL_COLORS[0] = '#ffffff';
for (var i = 1; i < INVITATION_LABEL_COLORS.length; i++) {
    color = color * 0.95;
    color_hex = Math.round(255 * color).toString(16);
    INVITATION_LABEL_COLORS[i] = '#' + color_hex + color_hex + color_hex;
}

var DOTS = ['.', '..', '...'];
var dots_idx;
var dots_timer;

var TEMP_SHIP = new Array(4); 
for (var i = 0; i < TEMP_SHIP.length; i++) TEMP_SHIP[i] = {x: -1, y: -1};

var GRID_COORDS = new Array(2);
for (var i = 0; i < GRID_COORDS.length; i++) GRID_COORDS[i] = {x: -1, y: -1};

var selected_ship;
var ships_remain = new Array(4);
var ships_remain_total;

var beep = new Audio('beep.wav');

player_ships = new Array(12), opp_ships = new Array(10);
for (var i = 0; i < player_ships.length; i++) {
    player_ships[i] = new Array(12);
    player_ships[i].fill(CELL_NONE);
}
for (var i = 0; i < opp_ships.length; i++) {
    opp_ships[i] = new Array(10);
    opp_ships[i].fill(CELL_NONE);
}

var player_turns;
var prev_shot = {x: -1, y: -1};

function Update() {
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    if (state === S_PRESS_TO_PLAY) {
        CTX.textAlign = 'center';
        CTX.fillStyle = '#00B2B2';
        CTX.font = '250% ' + FONT_FAMILY;
        CTX.fillText('BATTLESHIP', GAME_NAME_X, game_name_y);
        game_name_y = Math.min(game_name_y + 1, GAME_NAME_Y);
        if (game_name_y === GAME_NAME_Y) {
            CTX.fillStyle = INVITATION_LABEL_COLORS[invitation_label_color_idx];
            CTX.font = '100% ' + FONT_FAMILY;
            CTX.fillText('PRESS TO CONNECT THE SERVER AND FIND THE OPPONENT', CENTER_X, CENTER_Y);
            if (Date.now() - invitation_label_color_change_timer >= 25) {
                invitation_label_color_change_timer = Date.now();
                if (invitation_label_color_idx_increment) {
                    invitation_label_color_idx++;
                    if (invitation_label_color_idx === INVITATION_LABEL_COLORS.length - 1) 
                        invitation_label_color_idx_increment = false;
                } else {
                    invitation_label_color_idx--;
                    if (invitation_label_color_idx === 0) 
                        invitation_label_color_idx_increment = true;
                }
            }
        }
    } else if (state === S_CONNECTING || state === S_SEARCHING_OPPONENT) {
        var text = state === S_CONNECTING ? 'CONNECTING' : 'SEARCHING FOR OPPONENT';
        CTX.fillStyle = '#ffffff';
        CTX.font = '150% ' + FONT_FAMILY;
        CTX.textAlign = 'center';
        CTX.fillText(text, CENTER_X, CENTER_Y);
        CTX.fillText(DOTS[dots_idx], CENTER_X, CENTER_Y + CELL_SIZE);
        AnimateDots();
    } else if (state === S_SHIPS_ARRANGEMENT) {
        ShipsArrangement();
        CTX.textAlign = 'center';
        CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY;
        CTX.fillText('PRESS 1 2 3 OR 4 TO SELECT', CENTER_X, CENTER_Y + 3.5 * CELL_SIZE);
        CTX.fillText('ONE, TWO, THREE OR FOUR-DECK SHIP RESPECTIVELY', CENTER_X, CENTER_Y + 4.5 * CELL_SIZE);
        CTX.fillText('YOU HAVE:', CENTER_X, CENTER_Y + 5.5 * CELL_SIZE);
        CTX.fillText('*: ' + ships_remain[0] + 'X', CENTER_X, CENTER_Y + 6.5 * CELL_SIZE);
        CTX.fillText('**: ' + ships_remain[1] + 'X', CENTER_X, CENTER_Y + 7.5 * CELL_SIZE);
        CTX.fillText('***: ' + ships_remain[2] + 'X', CENTER_X, CENTER_Y + 8.5 * CELL_SIZE);
        CTX.fillText('****: ' + ships_remain[3] + 'X', CENTER_X, CENTER_Y + 9.5 * CELL_SIZE);
    } else if (state === S_WAITING_OPPONENT) {
        ShipsArrangement();
        CTX.textAlign = 'center';
        CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
        CTX.fillStyle = '#ffffff';
        CTX.fillText('WAITING FOR THE OPPONENT', CENTER_X, CENTER_Y + 5 * CELL_SIZE);
        CTX.fillText(DOTS[dots_idx], CENTER_X, CENTER_Y + 6 * CELL_SIZE);
        AnimateDots();
    } else if (state === S_OPP_LEAVED) {
        CTX.textAlign = 'center';
        CTX.fillStyle = '#ff0000';
        CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY; 
        CTX.fillText('OPPONENT LEAVED', CENTER_X, CENTER_Y);
        CTX.font = CELL_SIZE / 2 + 'px ' + FONT_FAMILY; 
        CTX.fillStyle = '#ffffff';
        CTX.fillText('PRESS ANY KEY TO FIND NEW OPPONENT', CENTER_X, CENTER_Y + CELL_SIZE);        
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
    DrawShips(GRID_COORDS[0].x, GRID_COORDS[0].y, player_ships, TEMP_SHIP, true);
}

function ValidateShip(ships, ship, decks_count) {
    for (var i = 0; i < decks_count; i++)
        if (!ValidateCell(ship[i], ships, (i > 0 && i < decks_count - 1)))
            return false;
    return true;
}

function ValidateCell(cell, ships, inner_deck) {
    var n = 0;
    n += ships[cell.y][cell.x - 1];
    n += ships[cell.y - 1][cell.x - 1];
    n += ships[cell.y - 1][cell.x];
    n += ships[cell.y - 1][cell.x + 1];
    n += ships[cell.y][cell.x + 1];
    n += ships[cell.y + 1][cell.x + 1];
    n += ships[cell.y + 1][cell.x];
    n += ships[cell.y + 1][cell.x - 1];
    n -= CELL_NONE * 8;
    return inner_deck ? n + 2 <= 2 : n + 1 <= 1;
}

var GRID_W = 10 * CELL_SIZE, GRID_H = 10 * CELL_SIZE;

function DrawGrid(coords, n) {
    CTX.strokeStyle = '#ffffff';
    for (var i = 0; i < n; i++) {
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

function DrawShips(field_x, field_y, ships, temp_ship, is_player_ships) {
    CTX.textAlign = 'center';
    CTX.font = CELL_SIZE + 'px ' + FONT_FAMILY;
    var from = is_player_ships ? 1 : 0;
    var to = from + 10;
    for (var y = from; y < to; y++) {
        for (var x = from; x < to; x++) {
            if (ships[y][x] === CELL_SHIP) {
                CTX.fillStyle = '#ffffff';
                CTX.fillText('*', field_x + CELL_SIZE * (x - 1 / 2), field_y + CELL_SIZE * (y - 1 / 5));
            }
        }
    }
    if (temp_ship !== null) {
        CTX.fillStyle = '#ffffff';
        for (var i = 0; i < temp_ship.length; i++) {
            if (temp_ship[i].x === -1) break;
            CTX.fillText('*', field_x + CELL_SIZE * (temp_ship[i].x - 1 / 2), field_y + CELL_SIZE * (temp_ship[i].y - 1 / 5));
        }
    }
}

function DrawLine(x1, y1, x2, y2) {
    CTX.beginPath();
    CTX.moveTo(x1, y1);
    CTX.lineTo(x2, y2);
    CTX.stroke();
}

window.onkeyup = function(event) {
    if (state === S_PRESS_TO_PLAY) {
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
    } else if (state === S_SHIPS_ARRANGEMENT) {
        if (event.keyCode >= 49 && event.keyCode <= 52) {
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
        } else if (event.keyCode >= 37 && event.keyCode <= 40) {
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
        } else if (event.keyCode === 32) {
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
        } else if (event.keyCode === 13) {
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
        }
    } else if (state === S_OPP_LEAVED) {
        state = S_SEARCHING_OPPONENT;
        socket.send('request_to_play');
    }
};

function onmessage(event) {
    var msg = event.data;
    if (state === S_SEARCHING_OPPONENT) {
        if (msg === 'opp_found') {
            GRID_COORDS[0].x = CENTER_X - 5 * CELL_SIZE;
            GRID_COORDS[0].y = CENTER_Y - 7.5 * CELL_SIZE;
            state = S_SHIPS_ARRANGEMENT;
            selected_ship = -1;
            ships_remain[0] = 4;
            ships_remain[1] = 3;
            ships_remain[2] = 2;
            ships_remain[3] = 1;
            ships_remain_total = 10;
        }
    } else if (state === S_SHIPS_ARRANGEMENT) {
        if (msg === 'opp_leaved') state = S_OPP_LEAVED;
    } else if (state === S_WAITING_OPPONENT) {
        if (msg === 'opp_leaved') state = S_OPP_LEAVED;
        else if (msg.startsWith('start')) {
            state = S_BATTLE;
            player_turns = msg.endsWith('+');
        }
    } else if (state === S_BATTLE) {
        if (msg === 'opp_leaved') state = S_OPP_LEAVED;
        else if (msg === 'hit') opp_ships[prev_shot.y][prev_shot.x] = CELL_SHIP | CELL_SHOOTED;
        else if (msg === 'miss') opp_ships[prev_shot.y][prev_shot.x] = CELL_NONE | CELL_SHOOTED;
        else if (msg === 'win' || msg === 'loss') {
            state = S_GAME_OVER;
            win = msg === 'win';
        } else { //hit_on or miss_on event
            var split = msg.split(' ');
            var x = parseInt(split[1]);
            var y = parseInt(split[2]);
            player_ships[y][x] = player_ships[y][x] | CELL_SHOOTED;
        }
    }
}

setInterval(Update, 1000 / 60);