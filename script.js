const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const COLS = 12;
const ROWS = 15;
const BLOCK_SIZE = 30;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let boardImages = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let currentPiece = null;
let currentPieceImages = [];
let dropInterval;
let paused = true; // Start paused
let gameOver = false;
let score = 0;
let blockImages = [];

// Load block images
function loadBlockImages() {
    for (let i = 1; i <= 10; i++) {
        const img = new Image();
        img.src = `images/block_image_${i}.jpeg`;
        blockImages.push(img);
    }
}
loadBlockImages();

const COLORS = ['#000', '#f7931a', '#654232'];
const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]]
];

function getRandomImageIndex() {
    return Math.floor(Math.random() * blockImages.length);
}

function drawBlock(x, y, color, imageIndex = null) {
    if (blockImages.length > 0 && blockImages[0].complete) {
        // Use the provided image index or default to color
        const imgIndex = imageIndex !== null ? imageIndex : 0;
        ctx.drawImage(
            blockImages[imgIndex], 
            x * BLOCK_SIZE, 
            y * BLOCK_SIZE, 
            BLOCK_SIZE, 
            BLOCK_SIZE
        );
        // Add border
        ctx.strokeStyle = '#1a1a1a';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    } else {
        // Fallback to regular colored blocks if images aren't loaded
        ctx.fillStyle = COLORS[color];
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#1a1a1a';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) drawBlock(x, y, 1, boardImages[y][x]);
        }
    }
    if (currentPiece) drawPiece();
}

function drawPiece() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((val, dx) => {
            if (val) {
                const imgIndex = currentPieceImages[dy] ? currentPieceImages[dy][dx] : null;
                drawBlock(currentPiece.x + dx, currentPiece.y + dy, 1, imgIndex);
            }
        });
    });
}

function spawnPiece() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    currentPiece = { shape, x: 3, y: 0 };
    
    // Assign random images to each block in the piece
    currentPieceImages = shape.map(row => 
        row.map(cell => cell ? getRandomImageIndex() : null)
    );

    // Check for game over
    if (checkCollision()) {
        endGame();
    }
}

function move(dx, dy) {
    if (gameOver || paused) return;
    
    currentPiece.x += dx;
    currentPiece.y += dy;

    if (checkCollision()) {
        currentPiece.x -= dx;
        currentPiece.y -= dy;
        if (dy > 0) {
            merge();
            const linesCleared = clearLines();
            updateScore(linesCleared);
            spawnPiece();
        }
    }
    drawBoard();
}

// Hard drop - move piece all the way down
function hardDrop() {
    if (gameOver || paused) return;

    let dropDistance = 0;
    while (!checkCollision()) {
        currentPiece.y++;
        dropDistance++;
    }
    
    // Move back up one step since we're now in a collision state
    currentPiece.y--;
    
    // Place the piece
    merge();
    const linesCleared = clearLines();
    
    // Give bonus points for hard drop (1 point per cell dropped)
    score += dropDistance > 0 ? dropDistance - 1 : 0;
    
    updateScore(linesCleared);
    spawnPiece();
    drawBoard();
}

function checkCollision() {
    return currentPiece.shape.some((row, y) => {
        return row.some((val, x) => {
            if (val) {
                const newX = currentPiece.x + x;
                const newY = currentPiece.y + y;
                return (
                    newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX])
                );
            }
            return false;
        });
    });
}

function merge() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((val, x) => {
            if (val) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                board[boardY][boardX] = 1;
                boardImages[boardY][boardX] = currentPieceImages[y][x];
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    
    // Find completed lines
    const completedLines = [];
    for (let y = 0; y < ROWS; y++) {
        if (board[y].every(cell => cell !== 0)) {
            completedLines.push(y);
            linesCleared++;
        }
    }
    
    // Remove completed lines
    for (const y of completedLines.reverse()) {
        board.splice(y, 1);
        boardImages.splice(y, 1);
    }
    
    // Add new empty lines at the top
    while (board.length < ROWS) {
        board.unshift(Array(COLS).fill(0));
        boardImages.unshift(Array(COLS).fill(null));
    }
    
    return linesCleared;
}

function updateScore(linesCleared) {
    // Points based on lines cleared (more points for multiple lines at once)
    const points = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, or 4 lines
    
    // Add points based on lines cleared
    if (linesCleared > 0) {
        score += points[Math.min(linesCleared, 4)];
    } else {
        // Add points for dropping a piece (10 points per drop)
        score += 10;
    }
    
    // Always update score display
    displayScore();
}

function displayScore() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.textContent = `Score: ${score}`;
    scoreDisplay.style.display = 'block';
}

function showScore() {
    // Just call displayScore - keeping this function for button compatibility
    displayScore();
}

function drop() {
    if (!paused && !gameOver) move(0, 1);
}

function pauseGame() {
    if (gameOver) return; // Prevent pausing when the game is over
    
    paused = !paused;
    
    // Update button text
    const pauseBtn = document.querySelector("button[onclick='pauseGame()']");
    pauseBtn.innerText = paused ? "Start" : "Pause";
    
    // Start the game if it was paused
    if (!paused && !dropInterval) {
        dropInterval = setInterval(drop, 700);
    }
}

function restartGame() {
    // Clear any existing interval
    clearInterval(dropInterval);
    
    // Reset the game state
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    boardImages = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    document.getElementById('gameOver').style.display = 'none';
    gameOver = false;
    paused = true; // Start paused
    score = 0;
    
    // Reset the pause button text
    document.querySelector("button[onclick='pauseGame()']").innerText = "Start";
    
    // Display initial score
    displayScore();
    
    // Spawn a new piece and draw the board
    spawnPiece();
    drawBoard();
    
    // Don't start the interval yet - wait for user to press Start
    dropInterval = null;
}

function endGame() {
    clearInterval(dropInterval);
    dropInterval = null;
    document.getElementById('gameOver').style.display = 'block';
    gameOver = true;
}

// Keyboard Controls
document.addEventListener('keydown', e => {
    if (!currentPiece || gameOver) return;
    if (e.key === 'ArrowLeft') move(-1, 0);
    else if (e.key === 'ArrowRight') move(1, 0);
    else if (e.key === 'ArrowDown') move(0, 1);
    else if (e.key === 'ArrowUp' || e.key === ' ') hardDrop(); // Space or up for hard drop
});

// Mobile Controls
document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    move(-1, 0);
});

document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    move(1, 0);
});

document.getElementById('downBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    hardDrop(); // Use hard drop for down button
});

// Add click event for desktop testing
document.getElementById('leftBtn').addEventListener('click', () => move(-1, 0));
document.getElementById('rightBtn').addEventListener('click', () => move(1, 0));
document.getElementById('downBtn').addEventListener('click', () => hardDrop()); // Use hard drop for down button

// Initialize game
restartGame();
// Note: We don't start the interval yet - wait for user to press Start
// Make sure score is shown from the beginning
displayScore();

