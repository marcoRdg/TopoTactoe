import gsap from 'gsap';
import { Board } from './core/Board.js';
import { GameFlow } from './core/GameFlow.js';
import { Renderer2D } from './graphics/modes/Renderer2D.js';
import { Renderer3D } from './graphics/modes/Renderer3D.js';
import { RendererMorph3D } from './graphics/modes/RendererMorph3D.js';
import { THEME, setTheme } from './graphics/utils/Theme.js';

let currentSize = 3;
let board = new Board(currentSize);
let currentMode = '2D';
let currentTopology = 'torus';
let currentPlayer = 1;
let gameOver = false;

const container = document.getElementById('game-container');
const statusBar = document.getElementById('status-bar');
const modeSelect = document.getElementById('mode-select');
const foldBtn = document.getElementById('fold-btn');
const topologySelect = document.getElementById('topology-select');
const sizeSelect = document.getElementById('size-select');
const restartBtn = document.getElementById('restart-btn');
const themeSelect = document.getElementById('theme-select');

let renderer = new Renderer2D(board, 'game-container', currentTopology);
let overlayRenderer = null; // Armazena a camada 3D sobreposta na vitória

function updateStatus(text, color = '#cccccc') {
    statusBar.innerText = text;
    statusBar.style.color = color;
}

function updateTurnStatus() {
    if (currentPlayer === 1) {
        updateStatus('Vez do Jogador: X (Vermelho)', '#ff7777');
    } else {
        updateStatus('Vez do Jogador: O (Azul)', '#7799ff');
    }
}

function cleanupRenderers() {
    if (overlayRenderer) {
        overlayRenderer.destroy();
        overlayRenderer = null;
    }
    if (renderer) {
        renderer.destroy();
        renderer = null;
    }
}

function createRenderer() {
    foldBtn.style.display = currentMode === 'MORPH' ? 'inline-block' : 'none';

    if (currentMode === '3D') {
        return new Renderer3D(board, 'game-container', currentTopology);
    } else if (currentMode === 'MORPH') {
        return new RendererMorph3D(board, 'game-container', currentTopology);
    } else {
        return new Renderer2D(board, 'game-container', currentTopology);
    }
}

function restartGame() {
    board = new Board(currentSize);
    currentPlayer = 1;
    gameOver = false;

    cleanupRenderers();
    renderer = createRenderer();
    updateTurnStatus();
}

function triggerVictory(winnerPlayer, winPath) {
    board.winningPath = winPath;
    gameOver = true;
    renderer.setHover(null);
    renderer.draw();
    container.style.cursor = 'default';

    const winnerLabel = winnerPlayer === 1 ? 'X (Vermelho)' : 'O (Azul)';
    updateStatus(`Vitória de ${winnerLabel} no espaço ${currentTopology.toUpperCase()}!`, '#00ff00');

    // Se estiver no Modo 2D, cria o overlay 3D alinhado 1:1 ao centro, esmaece o recobrimento e dobra
    if (currentMode === '2D') {
        overlayRenderer = new RendererMorph3D(board, 'game-container', currentTopology, {
            isOverlay: true,
            canvasSize: renderer.canvas.width
        });

        gsap.to(renderer.canvas, {
            opacity: 0,
            duration: 0.7,
            ease: 'power2.out'
        });

        // Permite dobrar/planificar manualmente após a vitória para estudar o corte
        foldBtn.style.display = 'inline-block';
    } else if (currentMode === 'MORPH' && !renderer.isFolded) {
        renderer.fold();
    }
}

function processPlay(col, row) {
    if (gameOver) return;

    if (board.makeMove(col, row, currentPlayer)) {
        const winPath = GameFlow.checkWin(board, currentPlayer, currentTopology);

        if (winPath) {
            triggerVictory(currentPlayer, winPath);
            return;
        }

        if (board.isFull()) {
            gameOver = true;
            renderer.draw();
            updateStatus('Empate! O espaço topológico ficou saturado.', '#f1c40f');
            return;
        }

        currentPlayer = currentPlayer === 1 ? 2 : 1;
        renderer.draw();
        updateTurnStatus();
    }
}
function resolveCellFromEvent(event) {
    if (!renderer) return null;

    if (currentMode === '2D') {
        const rect = renderer.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (mouseX < 0 || mouseY < 0 || mouseX >= rect.width || mouseY >= rect.height) {
            return null;
        }

        const cellSize = renderer.boardPixelSize / board.size;
        const blockY = Math.floor(mouseY / renderer.boardPixelSize);

        // Ignora regiões superior e inferior no Cilindro
        if (currentTopology === 'cylinder' && blockY !== 1) return null;

        let col = Math.floor(mouseX / cellSize) % board.size;
        const row = Math.floor(mouseY / cellSize) % board.size;

        // Aplica reflexão horizontal nas cópias superior/inferior da Garrafa de Klein
        if (currentTopology === 'klein' && blockY !== 1) {
            col = (board.size - 1) - col;
        }

        return { col, row };
    }

    return renderer.getGridIntersection(event);
}

container.addEventListener('mousemove', (event) => {
    if (gameOver || !renderer) return;

    const hit = resolveCellFromEvent(event);
    renderer.setHover(hit);

    const isFreeCell = hit && board.grid[hit.row][hit.col] === 0;
    container.style.cursor = isFreeCell ? 'pointer' : (currentMode === '2D' ? 'default' : 'grab');
});

container.addEventListener('mouseleave', () => {
    if (renderer) renderer.setHover(null);
});

container.addEventListener('click', (event) => {
    if (gameOver) return;

    const hit = resolveCellFromEvent(event);
    if (hit) processPlay(hit.col, hit.row);
});

modeSelect.addEventListener('change', (e) => {
    currentMode = e.target.value;
    cleanupRenderers();
    renderer = createRenderer();
});

foldBtn.addEventListener('click', () => {
    if (overlayRenderer) {
        overlayRenderer.toggleFold();
    } else if (currentMode === 'MORPH') {
        renderer.toggleFold();
    }
});

topologySelect.addEventListener('change', (e) => {
    currentTopology = e.target.value;
    cleanupRenderers();
    renderer = createRenderer();
});

sizeSelect.addEventListener('change', (e) => {
    currentSize = parseInt(e.target.value);
    restartGame();
});

restartBtn.addEventListener('click', restartGame);

updateTurnStatus();

function applyPageTheme() {
    document.body.style.backgroundColor = THEME.pageBg;
    document.body.style.color = THEME.textColor;
}

themeSelect.addEventListener('change', (e) => {
    setTheme(e.target.value);
    applyPageTheme();

    if (renderer) renderer.draw();
    if (overlayRenderer) overlayRenderer.draw();
});

applyPageTheme();