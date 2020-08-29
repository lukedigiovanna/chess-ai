//import { saveAs } from 'file-saver';

/*
    This script holds the state of the board and allows for moving pieces

    This board is represented as two digit numbers where the first
    represents the player and the second represents the piece type:
        Player: 0 is black, 1 is white
        Pieces:
            0: pawn,
            1: knight,
            2: bishop,
            3: rook,
            4: queen,
            5: king
        -1 means no piece is in the spot
*/

// a chess board is an 8x8 so 64 individual spots
// we will list each spot going left to right from the top of the board
var gameBoard = [
    03, 01, 02, 04, 05, 02, 01, 03,
    00, 00, 00, 00, 00, 00, 00, 00,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    10, 10, 10, 10, 10, 10, 10, 10, 
    13, 11, 12, 14, 15, 12, 11, 13
];

var turn = 1; // 0 is player 0, 1 is player 1

const canvas = document.getElementById("canvas");
const size = 600;
canvas.width = size;
canvas.height = size;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const tilePadding = 2;
const tileSize = size/8;

var mousePos = {x: 0, y: 0};
document.onmousemove = handleMouseMove;
function handleMouseMove(event) {
    mousePos.x = event.clientX;
    mousePos.y = event.clientY;
}

function getMouseOnCanvas() {
    var canvBounds = canvas.getBoundingClientRect();
    var canvX = mousePos.x - canvBounds.left;
    var canvY = mousePos.y - canvBounds.top;
    return {x: canvX, y: canvY};
}

function getMouseOnBoard() {
    var pos = getMouseOnCanvas();
    return {x:Math.floor(pos.x/tileSize),y:Math.floor(pos.y/tileSize)};
}

document.getElementById("save").onclick = function() {
    canvas.toBlob(function(blob) {
        saveAs(blob, "pretty image.png");
    });
}

var heldIndex = -1; // values of -1 indicate no held pos
document.onmousedown = mouseDown;
function mouseDown(event) {
    var pos = getMouseOnBoard();
    if (pos.x >= 0 && pos.x < 8 && pos.y >= 0 && pos.y < 8) {
        let element = pos.x + pos.y * 8;
        if (gameBoard[element] >= 0 && Math.floor(gameBoard[element]/10) == turn) {
            heldIndex = element;
        }
    }
}

document.onmouseup = mouseUp;
function mouseUp(event) {
    var pos = getMouseOnBoard();
    if (movePiece(gameBoard, heldIndex, pos.x + pos.y * 8)) {
        turn = (turn + 1) % 2;
        updateInfo();
    }  
    heldIndex = -1;
}

function updateInfo() {
    document.getElementById("turn").innerHTML = (turn == 0) ? "Black's turn" : "White's turn";
    document.getElementById("score").innerHTML = "White: "+score(gameBoard, 1)+" | Black: "+score(gameBoard, 0);
    document.getElementById("gameScore").innerHTML = "Game Score: "+gameScore(gameBoard);
    var check = (turn + 1) % 2;
    if (isInCheckMate(gameBoard, check)) {
        document.getElementById("notice").innerHTML = "Check Mate!";
    } else if (isInCheck(gameBoard, check)) {
        document.getElementById("notice").innerHTML = "Check!";
    } else if (isInStalemate(gameBoard, check)) {
        document.getElementById("notice").innerHTML = "Stale Mate!";
    } else {
        document.getElementById("notice").innerHTML = "";
    }
}

document.getElementById("findBest").onclick = function() {
    //bestMove(gameBoard, turn);
    var depth = document.getElementById("depth").value;
    var result = minimax(gameBoard, turn == 1, depth);
    var move = result[1];
    var fx = move[0] % 8;
    var fy = Math.floor(move[0]/8);
    var lx = move[1] % 8;
    var ly = Math.floor(move[1] / 8);
    console.log("Best score: "+result[0]+" move "+fx+", "+fy+" to "+lx+", "+ly);
    movePiece(gameBoard,move[0],move[1]);
    turn = (turn + 1) % 2;
    updateInfo();
};

var isPlayingSelf = false;

var id = 0;
var whiteDepth = 0;
var blackDepth = 0;
document.getElementById("playSelf").onclick = function() {
    if (!isPlayingSelf) {
        isPlayingSelf = true;
        whiteDepth = document.getElementById("whitedepth").value;
        blackDepth = document.getElementById("blackdepth").value;
        id = setInterval( function() {
            var result = minimax(gameBoard, turn == 1, (turn == 1) ? whiteDepth : blackDepth);
            var move = result[1];
            var fx = move[0] % 8;
            var fy = Math.floor(move[0]/8);
            var lx = move[1] % 8;
            var ly = Math.floor(move[1] / 8);
            console.log("Best score: "+result[0]+" move "+fx+", "+fy+" to "+lx+", "+ly);
            movePiece(gameBoard,move[0],move[1]);
            turn = (turn + 1) % 2;
            updateInfo();
            // did we just get put into check?
            if (isInCheckMate(gameBoard, turn) || isInStalemate(gameBoard, turn)) {
                clearInterval(id);
                isPlayingSelf = false;
                document.getElementById("playSelf").innerHTML = "Play Self";
            }
        }, 500
        );
        document.getElementById("playSelf").innerHTML = "Stop Playing Self";
    } else {
        clearInterval(id);
        isPlayingSelf = false;
        document.getElementById("playSelf").innerHTML = "Play Self";
    }
}

document.getElementById("reset").onclick = function() {
    gameBoard = [
        03, 01, 02, 04, 05, 02, 01, 03,
        00, 00, 00, 00, 00, 00, 00, 00,
        -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1,
        10, 10, 10, 10, 10, 10, 10, 10, 
        13, 11, 12, 14, 15, 12, 11, 13
    ];
}

function validateDiagonal(board, fx, fy, lx, ly) {
    // first translate the board so that the bishop would be at 0, 0.
    let oriLX = lx - fx, oriLY = ly - fy;
    // from here we know that the target is on the diagonal axis if the absolute values of each coordinate are equal to each other
    if (Math.abs(oriLX) == Math.abs(oriLY)) { // we know they are on the diagonal axes
        // now we need to check if there was any piece obstructing our path
        // first get the directions we need to go
        let dx = Math.sign(oriLX);
        let dy = Math.sign(oriLY);
        let testX = fx + dx, testY = fy + dy;
        while (testX != lx) {
            if (board[testX + testY * 8] != -1)
                return false;
            testX += dx;
            testY += dy;
        }
        return true;
    } else {
        return false;
    }
}

function validateOrthogonal(board, fx, fy, lx, ly) {
    let oriLX = lx - fx, oriLY = ly - fy;
    if (oriLX == 0 || oriLY == 0) {
        let dx = Math.sign(oriLX);
        let dy = Math.sign(oriLY);
        let testX = fx + dx, testY = fy + dy;
        while (testX != lx || testY != ly) {
            if (board[testX + testY * 8] != -1)
                return false;
            testX += dx;
            testY += dy;
        }
        return true;
    } else {
        return false;
    }
}

function isInCheck(board, player) {
    // if any of the other players moves could capture the king, then we are in check
    var possibleMoves = getPossibleMovesNoCheck(board, (player + 1) % 2);
    var kingPosition = board.indexOf(player * 10 + 5);
    for (var i = 0; i < possibleMoves.length; i++) {
        if (possibleMoves[i].move[1] == kingPosition) {
            return true;
        }
    }
    return false;
}

function isInCheckMate(board, player) {
    if (isInCheck(board,player)) {
        var possibleMoves = getPossibleMovesNoCheck(board, player);
        for (var i = 0; i < possibleMoves.length; i++) {
            var newBoard = [...board];
            forceMovePiece(newBoard, possibleMoves[i].move[0], possibleMoves[i].move[1]);
            if (!isInCheck(newBoard, player))
                return false;
        }   
        return true; 
    }
    return false;
}

function isInStalemate(board, player) {
    if (!isInCheck(board, player)) {
        var possibleMoves = getPossibleMovesNoCheck(board, player);
        for (var i = 0; i < possibleMoves.length; i++) {
            var newBoard = [...board];
            forceMovePiece(newBoard, possibleMoves[i].move[0], possibleMoves[i].move[1]);
            if (!isInCheck(newBoard, player))
                return false;
        }
        return true;
    }
    return false;
}

function putsIntoCheck(board, firstIndex, nextIndex) {
    var tempBoard = [...board];
    forceMovePiece(tempBoard, firstIndex, nextIndex);
    return isInCheck(tempBoard, Math.floor(board[firstIndex]/10));
}

//  returns true if the move is valid and may or may not put the player into check
function validMoveNoCheck(board, firstIndex, nextIndex) {
    var movingPiece = board[firstIndex] % 10;
    var movingPlayer = Math.floor(board[firstIndex] / 10);
    var targetPiece = board[nextIndex] % 10;
    var targetPlayer = Math.floor(board[nextIndex] / 10);
    var fx = firstIndex % 8;
    var fy = Math.floor(firstIndex / 8);
    var lx = nextIndex % 8;
    var ly = Math.floor(nextIndex / 8);

    if (fx < 0 || fx > 7 || lx < 0 || lx > 7 || fy < 0 || fy > 7 || ly < 0 || ly > 7) // can only move on the board
        return false;

    if (movingPlayer == targetPlayer && !(board[firstIndex]%10 == 5 && board[nextIndex]%10 == 3))
        return false; // can never move one of our own pieces onto itself

    switch (movingPiece) {
        case 0: // pawn
            if (movingPlayer == 0) {
                let forwardDistance = ly - fy;
                let horizontalDistance = lx - fx;
                if (
                    (horizontalDistance == 0 && (forwardDistance == 1 || (forwardDistance == 2 && fy == 1)) && targetPlayer == -1) // moving forward
                 || (Math.abs(horizontalDistance) == 1 && targetPlayer == 1 && forwardDistance == 1)) // attacking
                    return true;
                else
                    return false;
            } else { // player is 1
                let forwardDistance = fy - ly;
                let horizontalDistance = lx - fx;
                if (
                    (horizontalDistance == 0 && (forwardDistance == 1 || (forwardDistance == 2 && fy == 6)) && targetPlayer == -1) // moving forward
                 || (Math.abs(horizontalDistance) == 1 && targetPlayer == 0 && forwardDistance == 1)) // attacking
                    return true;
                else
                    return false;
            }
        case 1: // knight
            // lets just hard check each possible position (easier than trying to use loops)
            let acceptablePositions = [
                {x: fx - 1, y: fy + 2}, {x: fx - 2, y: fy + 1}, {x: fx - 2, y: fy - 1}, {x: fx - 1, y: fy - 2},
                {x: fx + 1, y: fy - 2}, {x: fx + 2, y: fy - 1}, {x: fx + 2, y: fy + 1}, {x: fx + 1, y: fy + 2},
            ];

            for (var i = 0; i < acceptablePositions.length; i++) {
                if (lx == acceptablePositions[i].x && ly == acceptablePositions[i].y)
                    return true;
            }

            break;
        case 2: // bishop
            return validateDiagonal(board, fx, fy, lx, ly);    
        case 3: // rook
            // check castling
            return validateOrthogonal(board, fx, fy, lx, ly);
        case 4: // queen
            return validateDiagonal(board, fx, fy, lx, ly) || validateOrthogonal(board, fx, fy, lx, ly);
        case 5: // king
            //check for castling
            if (movingPlayer == 0) {
                if (firstIndex == 4 && nextIndex == 0 && board[0] == 3 && board[1] == -1 && board[2] == -1 && board[3] == -1) {
                    return true;
                } else if (firstIndex == 4 && nextIndex == 7 && board[5] == -1 && board[6] == -1 && board[7] == 3) {
                    return true;
                }
            } else {
                if (firstIndex == 60 && nextIndex == 56 && board[56] == 13 && board[57] == -1 && board[58] == -1 && board[59] == -1) {
                    return true;
                } else if (firstIndex == 60 && nextIndex == 63 && board[63] == 13 && board[62] == -1 && board[61] == -1) {
                    return true;
                }
            }
            //check for standard rules
            // we also need to make sure that they are of opposing teams now
            if (movingPlayer == targetPlayer) 
                return false;
            for (var i = 0; i < 9; i++) 
                if (i != 4 && lx == fx - 1 + i % 3 && ly == fy - 1 + Math.floor(i / 3))
                    return true;
    }

    return false;
}

// returns true if the move is valid and will not put the player into check
function validMove(board, firstIndex, nextIndex) {
    if (validMoveNoCheck(board, firstIndex, nextIndex)) {
        // now check if this move puts us in check
        return !putsIntoCheck(board, firstIndex, nextIndex);
    } else {
        return false;
    }
}

function forceMovePiece(board, firstIndex, nextIndex) {
    // check if it was a castle
    if (Math.floor(board[firstIndex]/10) == Math.floor(board[nextIndex]/10) && board[firstIndex] % 10 == 5 && board[nextIndex] % 10 == 3) { // king onto a rook
        if (nextIndex == 0) {
            board[0] = -1;
            board[1] = 5;
            board[2] = 3;
            board[4] = -1;
        } else if (nextIndex == 7) {
            board[7] = -1;
            board[6] = 5;
            board[5] = 3;
            board[4] = -1;
        } else if (nextIndex == 56) {
            board[56] = -1;
            board[57] = 15;
            board[58] = 13;
            board[60] = -1;
        } else if (nextIndex == 63) {
            board[63] = -1;
            board[62] = 15;
            board[61] = 13;
            board[60] = -1;
        }
    } else {
        //swapping -- only occurs if we made it through all the previous tests
        board[nextIndex] = board[firstIndex];
        board[firstIndex] = -1;
    }
    // handle converting pawn to queen
    var player = Math.floor(board[nextIndex] / 10);
    var type = board[nextIndex] % 10
    if (type == 0 && player == 0 && Math.floor(nextIndex / 8) == 7)
        board[nextIndex] = 04; // black queen
    else if (type == 0 && player == 1 && Math.floor(nextIndex / 8) == 0)
        board[nextIndex] = 14; // white queen
}

// returns true if the move was successful
function movePiece(board, firstIndex, nextIndex) {
    if (!validMove(board, firstIndex, nextIndex))
        return false;
    else {
        forceMovePiece(board, firstIndex, nextIndex);
        return true;    
    }
}

function getImage(src) {
    var img = new Image(16, 26);
    img.src = src;
    return img;
}
// all images
sprites = {
    whitePawn: getImage("images/whitepawn.png"),
    blackPawn: getImage("images/blackpawn.png"),
    whiteKnight: getImage("images/whiteknight.png"),
    blackKnight: getImage("images/blackknight.png"),
    whiteBishop: getImage("images/whitebishop.png"),
    blackBishop: getImage("images/blackbishop.png"),
    whiteRook: getImage("images/whiterook.png"),
    blackRook: getImage("images/blackrook.png"),
    whiteQueen: getImage("images/whitequeen.png"),
    blackQueen: getImage("images/blackqueen.png"),
    whiteKing: getImage("images/whiteking.png"),
    blackKing: getImage("images/blackking.png")
}

function drawPiece(value, x, y) {
    var player = Math.floor(value / 10);
    var pieceType = value % 10;
    var pieceImg = null;
    switch (pieceType) {
        case 0:
            pieceImg = (player == 0) ? sprites.blackPawn : sprites.whitePawn;
            break;
        case 1:
            pieceImg = (player == 0) ? sprites.blackKnight : sprites.whiteKnight;
            break;
        case 2:
            pieceImg = (player == 0) ? sprites.blackBishop : sprites.whiteBishop;
            break;
        case 3:
            pieceImg = (player == 0) ? sprites.blackRook : sprites.whiteRook;
            break;
        case 4:
            pieceImg = (player == 0) ? sprites.blackQueen : sprites.whiteQueen;
            break;
        case 5:
            pieceImg = (player == 0) ? sprites.blackKing : sprites.whiteKing;
    }
    if (pieceImg != null) {
        ctx.drawImage(pieceImg, x - 7.5/26.0*tileSize, y - tileSize/2, 16/26.0*tileSize, tileSize-tilePadding);
    }
}

var values = [1, 3, 3, 5, 9, 18];
// for each piece you have taken you gain that number 
// for each piece you have lost you lose that number
function score(board, player) {
    var score = 0;
    for (var i = 0; i < board.length; i++) {
        if (board[i] == -1)
            continue;
        playerPiece = Math.floor(board[i] / 10);
        pieceType = board[i] % 10;
        if (playerPiece == player)
            score += values[pieceType];
    }
    return score;
}

// every white piece is added to the score and black pieces are substracted
// the white player would want to maximize the score and the black would want to minimize the score
function gameScore(board) {
    var score = 0;
    for (var i = 0; i < board.length; i++) {
        if (board[i] == -1)
            continue;
        playerPiece = Math.floor(board[i] / 10);
        pieceType = board[i] % 10;
        if (playerPiece == 1)
            score += values[pieceType];
        else
            score -= values[pieceType];
    }
    return score;
}

// gets all possible moves that does not include the moves which would leave the player in check
function getPossibleMoves(board, player) {
    var possibleMoves = []
    for (var i = 0; i < 64; i++) {
        if (Math.floor(board[i]/10) == player) {
            for (var possible = 0; possible < 64; possible++) {
               // let testBoard = [...board]; // copy our old board
                if (validMove(board,i,possible)) {
                    possibleMoves.push({move:[i,possible]});                   
                } else {
                    continue;
                }
            }
        }
    }
    return possibleMoves;
}

// returns all the possible moves that may or may not put the player into check
function getPossibleMovesNoCheck(board, player) {
    var possibleMoves = []
    for (var i = 0; i < 64; i++) {
        if (Math.floor(board[i]/10) == player) {
            for (var possible = 0; possible < 64; possible++) {
              //  let testBoard = [...board]; // copy our old board
                if (validMoveNoCheck(board,i,possible)) {
                    possibleMoves.push({move:[i,possible]});                   
                } else {
                    continue;
                }
            }
        }
    }
    return possibleMoves;
}

/* 
    returns the best move we could make
    depth - how many moves to look ahead
*/
function minimax(board, isMaximizing, depth, alpha = -99999, beta = 99999, moveToMake = null) {
    if (depth == 0) {
        return [gameScore(board), moveToMake];
    }

    var player = (isMaximizing) ? 1 : 0;
    var possibleMoves = getPossibleMoves(board, player);
    if (possibleMoves.length == 0) {
        return [gameScore(board), moveToMake];
    }
    if (isMaximizing) {
        var max = -9999;
        var maxIndices = [0];
        for (var i = 0; i < possibleMoves.length; i++) {
            var newBoard = [...board];
            movePiece(newBoard, possibleMoves[i].move[0], possibleMoves[i].move[1])
            if (isPlayingSelf && blackDepth < depth)
                eval = minimax(newBoard, true, depth - 2, alpha, beta, possibleMoves[i].move)[0];
            else
                eval = minimax(newBoard, false, depth - 1, alpha, beta, possibleMoves[i].move)[0];
            if (eval > max) {
                max = eval;
                maxIndices = [i];
            } 
            else if (eval == max) {
                maxIndices.push(i);
            }
            alpha = Math.max(alpha, eval);
            if (beta <= alpha)
                break;
        }

        return [max, possibleMoves[maxIndices[Math.floor(Math.random() * maxIndices.length)]].move];
    } else {
        var min = 9999;
        var minIndices = [0];
        for (var i = 0; i < possibleMoves.length; i++) {
            var newBoard = [...board];
            movePiece(newBoard, possibleMoves[i].move[0], possibleMoves[i].move[1])
            if (isPlayingSelf && whiteDepth < depth)
                eval = minimax(newBoard, false, depth - 2, alpha, beta, possibleMoves[i].move)[0];
            else
                eval = minimax(newBoard, true, depth - 1, alpha, beta, possibleMoves[i].move)[0];   
            if (eval < min) {
                min = eval;
                minIndices = [i];
            } 
            else if (eval == min) {
                minIndices.push(i);
            }
            beta = Math.min(beta, eval);
            if (beta <= alpha)
                break;
        }
        return [min, possibleMoves[minIndices[Math.floor(Math.random() * minIndices.length)]].move];
    }
}

function loop() {
    // fill the background 
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, size, size);
    var movableIndices = [];
    if (heldIndex > -1) {
        for (var i = 0; i < gameBoard.length; i++) {
            if (validMove(gameBoard, heldIndex, i)) {
                movableIndices.push(i);
            }
        }
    }
    for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
            // first color in the tiles
            ctx.fillStyle = (x % 2 == y % 2) ? "#ffe38f" : "#a37e17";
            ctx.fillRect(tilePadding + x * tileSize, tilePadding + y * tileSize, tileSize - tilePadding * 2, tileSize - tilePadding * 2);
            if (movableIndices.includes(y * 8 + x)) {
                ctx.fillStyle = "rgba(94, 222, 69, 0.4)";
                ctx.fillRect(tilePadding + x * tileSize, tilePadding + y * tileSize, tileSize - tilePadding * 2, tileSize - tilePadding * 2);
            }
            // draw the current piece
            // (for now just doing the letter of the piece)
            let piece = gameBoard[x + y * 8];
            let player = Math.floor(piece/10);
            if (piece % 10 == 5) {
                if (isInCheckMate(gameBoard, Math.floor(piece/10))) {
                    ctx.fillStyle = "rgba(255, 0, 0, 1.0)";
                    ctx.fillRect(tilePadding + x * tileSize, tilePadding + y * tileSize, tileSize - tilePadding * 2, tileSize - tilePadding * 2);
                } else if (isInCheck(gameBoard, Math.floor(piece/10))) {
                    ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
                    ctx.fillRect(tilePadding + x * tileSize, tilePadding + y * tileSize, tileSize - tilePadding * 2, tileSize - tilePadding * 2);
                } else if (isInStalemate(gameBoard, Math.floor(piece/10))) {
                    ctx.fillStyle = "rgba(0, 200, 255, 0.5)";
                    ctx.fillRect(tilePadding + x * tileSize, tilePadding + y * tileSize, tileSize - tilePadding * 2, tileSize - tilePadding * 2);
                }
            }
            if (piece > -1) {
                if (x + y * 8 == heldIndex) {
                    continue;
                } else {
                    drawPiece(piece, x * tileSize + tileSize/2, y * tileSize + tileSize/2);
                }
            }
        }
    }

    if (heldIndex > -1) {
        let piece = gameBoard[heldIndex];
        let mPos = getMouseOnCanvas();
        drawPiece(piece, mPos.x, mPos.y);
    }

    requestAnimationFrame(loop);
}

loop();