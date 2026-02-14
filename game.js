// Game State
let game = null;
let gameMode = null;
let aiDifficulty = null;
let playerColor = null;
let selectedSquare = null;
let moveHistory = [];
let gameHistory = [];

// Chess piece Unicode symbols
const pieces = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showHome() {
    showScreen('homeScreen');
}

function showModeScreen() {
    showScreen('modeScreen');
}

function showAIDifficulty() {
    showScreen('difficultyScreen');
}

function showColorSelection(difficulty) {
    aiDifficulty = difficulty;
    showScreen('colorScreen');
}

function showHistory() {
    displayHistory();
    showScreen('historyScreen');
}

// Start Game
function startGame(mode, color = null) {
    gameMode = mode;
    playerColor = color;
    game = new Chess();
    moveHistory = [];
    selectedSquare = null;
    
    initBoard();
    showScreen('gameScreen');
    updateTurnIndicator();
    
    // If AI plays black and player is white, player goes first
    // If AI plays white and player is black, AI goes first
    if (mode === 'ai' && color === 'black') {
        setTimeout(makeAIMove, 500);
    }
}

// Initialize Board
function initBoard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const squareId = String.fromCharCode(97 + col) + (8 - row);
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.square = squareId;
            square.onclick = () => handleSquareClick(squareId);
            board.appendChild(square);
        }
    }
    
    updateBoard();
}

// Update Board Display
function updateBoard() {
    const board = game.board();
    document.querySelectorAll('.square').forEach(square => {
        const squareId = square.dataset.square;
        const col = squareId.charCodeAt(0) - 97;
        const row = 8 - parseInt(squareId[1]);
        const piece = board[row][col];
        
        square.textContent = piece ? pieces[piece.type === piece.type.toUpperCase() ? piece.type : piece.type.toLowerCase()] : '';
        square.style.color = piece && piece.color === 'w' ? '#fff' : '#000';
        square.style.textShadow = piece ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none';
    });
}

// Handle Square Click
function handleSquareClick(squareId) {
    if (game.game_over()) return;
    
    // If AI mode and not player's turn, ignore
    if (gameMode === 'ai' && game.turn() !== playerColor[0]) return;
    
    const piece = game.get(squareId);
    
    // Clear previous highlights
    document.querySelectorAll('.square').forEach(s => {
        s.classList.remove('selected', 'highlight', 'possible-move');
    });
    
    if (selectedSquare) {
        // Try to make move
        const move = game.move({
            from: selectedSquare,
            to: squareId,
            promotion: 'q' // Always promote to queen
        });
        
        if (move) {
            moveHistory.push(move);
            updateBoard();
            updateTurnIndicator();
            selectedSquare = null;
            
            if (checkGameOver()) return;
            
            // AI's turn
            if (gameMode === 'ai') {
                setTimeout(makeAIMove, 500);
            }
        } else if (piece && piece.color === game.turn()) {
            // Select new piece
            selectSquare(squareId);
        } else {
            selectedSquare = null;
        }
    } else if (piece && piece.color === game.turn()) {
        selectSquare(squareId);
    }
}

// Select Square and Show Possible Moves
function selectSquare(squareId) {
    selectedSquare = squareId;
    const square = document.querySelector(`[data-square="${squareId}"]`);
    square.classList.add('selected');
    
    // Show possible moves
    const moves = game.moves({ square: squareId, verbose: true });
    moves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        targetSquare.classList.add('possible-move');
    });
}

// Update Turn Indicator
function updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    indicator.textContent = `${turn}'s Turn`;
    indicator.style.color = game.turn() === 'w' ? '#333' : '#666';
}

// Undo Move
function undoMove() {
    if (moveHistory.length === 0) return;
    
    game.undo();
    moveHistory.pop();
    
    // If playing against AI, undo AI's move too
    if (gameMode === 'ai' && moveHistory.length > 0) {
        game.undo();
        moveHistory.pop();
    }
    
    selectedSquare = null;
    updateBoard();
    updateTurnIndicator();
    
    // Clear highlights
    document.querySelectorAll('.square').forEach(s => {
        s.classList.remove('selected', 'highlight', 'possible-move');
    });
}

// AI Move Logic
function makeAIMove() {
    if (game.game_over()) return;
    
    const moves = game.moves();
    let move;
    
    if (aiDifficulty === 'easy') {
        // Random move
        move = moves[Math.floor(Math.random() * moves.length)];
    } else if (aiDifficulty === 'medium') {
        // Slightly better: prefer captures
        const captureMoves = game.moves({ verbose: true }).filter(m => m.captured);
        if (captureMoves.length > 0 && Math.random() > 0.5) {
            move = captureMoves[Math.floor(Math.random() * captureMoves.length)].san;
        } else {
            move = moves[Math.floor(Math.random() * moves.length)];
        }
    } else {
        // Hard: minimax algorithm (simplified)
        move = getBestMove();
    }
    
    const result = game.move(move);
    if (result) {
        moveHistory.push(result);
        updateBoard();
        updateTurnIndicator();
        checkGameOver();
    }
}

// Simple Minimax for Hard AI
function getBestMove() {
    const moves = game.moves();
    let bestMove = moves[0];
    let bestValue = -9999;
    
    for (let move of moves) {
        game.move(move);
        const value = -evaluateBoard();
        game.undo();
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    }
    
    return bestMove;
}

function evaluateBoard() {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let value = 0;
    
    const board = game.board();
    for (let row of board) {
        for (let square of row) {
            if (square) {
                const pieceValue = pieceValues[square.type];
                value += square.color === 'w' ? pieceValue : -pieceValue;
            }
        }
    }
    
    return game.turn() === 'w' ? value : -value;
}

// Check Game Over
function checkGameOver() {
    if (game.game_over()) {
        let result;
        
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            result = {
                type: 'checkmate',
                winner: winner,
                message: `🎉 Checkmate! ${winner} Wins!`,
                class: winner === (playerColor === 'white' ? 'White' : 'Black') ? 'result-win' : 'result-loss'
            };
        } else if (game.in_draw()) {
            result = {
                type: 'draw',
                message: '🤝 Game Draw!',
                class: 'result-draw'
            };
        } else if (game.in_stalemate()) {
            result = {
                type: 'stalemate',
                message: '🤝 Stalemate!',
                class: 'result-draw'
            };
        }
        
        saveGameToHistory(result);
        showResult(result);
        return true;
    }
    return false;
}

// Show Result
function showResult(result) {
    const content = document.getElementById('resultContent');
    content.innerHTML = `<div class="${result.class}">${result.message}</div>`;
    showScreen('resultScreen');
}

// Game History Management
function saveGameToHistory(result) {
    const historyItem = {
        date: new Date().toLocaleString(),
        mode: gameMode === 'ai' ? `AI (${aiDifficulty})` : '1 vs 1',
        result: result.message,
        moves: moveHistory.length
    };
    
    gameHistory.unshift(historyItem);
    if (gameHistory.length > 10) gameHistory.pop();
    
    localStorage.setItem('preetChessHistory', JSON.stringify(gameHistory));
}

function loadHistory() {
    const saved = localStorage.getItem('preetChessHistory');
    if (saved) {
        gameHistory = JSON.parse(saved);
    }
}

function displayHistory() {
    const list = document.getElementById('historyList');
    
    if (gameHistory.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">No games played yet</p>';
        return;
    }
    
    list.innerHTML = gameHistory.map(item => `
        <div class="history-item">
            <div><strong>${item.date}</strong></div>
            <div>Mode: ${item.mode}</div>
            <div>${item.result}</div>
            <div>Moves: ${item.moves}</div>
        </div>
    `).join('');
}
