import { THEME } from '../utils/Theme.js';

export class Renderer2D {
    constructor(board, containerId, topology = 'torus') {
        this.hoveredCell = null;

        this.board = board;
        this.topology = topology;

        // Ajusta o tamanho do canvas para caber 100% na tela sem cortar
        const availableSize = Math.min(600, window.innerWidth - 24, window.innerHeight - 120);
        const canvasSize = Math.max(300, Math.floor(availableSize / 3) * 3);

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'canvas-2d';
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;

        this.ctx = this.canvas.getContext('2d');
        document.getElementById(containerId).appendChild(this.canvas);

        this.boardPixelSize = this.canvas.width / 3;

        this.draw();
    }
    setHover(cell) {
        const prev = this.hoveredCell;
        if (!prev && !cell) return;
        if (prev && cell && prev.col === cell.col && prev.row === cell.row) return;

        this.hoveredCell = cell;
        this.draw();
    }

    draw() {
        this.canvas.style.backgroundColor = THEME.boardBg;  

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let startY = this.topology === 'cylinder' ? 0 : -1;
            let endY = this.topology === 'cylinder' ? 0 : 1;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = startY; dy <= endY; dy++) {
                    const isCenter = (dx === 0 && dy === 0);
                    this.ctx.globalAlpha = isCenter ? 1.0 : THEME.ghostOpacity;

                    const offsetX = (dx + 1) * this.boardPixelSize;
                    const offsetY = (dy + 1) * this.boardPixelSize;
                    const invertX = (this.topology === 'klein' && dy !== 0);

                    this.drawSingleBoard(offsetX, offsetY, invertX, isCenter);
                }
            }
            this.ctx.globalAlpha = 1.0;
    }

    drawSingleBoard(offsetX, offsetY, invertX, isCenter) {
        const cellSize = this.boardPixelSize / this.board.size;

        // Destaque de hover (apenas se a célula estiver vazia)
        if (this.hoveredCell && this.board.grid[this.hoveredCell.row][this.hoveredCell.col] === 0) {
            const visualCol = invertX
                ? (this.board.size - 1 - this.hoveredCell.col)
                : this.hoveredCell.col;

            this.ctx.fillStyle = THEME.hoverColor;
            this.ctx.fillRect(
                offsetX + visualCol * cellSize,
                offsetY + this.hoveredCell.row * cellSize,
                cellSize,
                cellSize
            );
        }
        // Linhas internas da grade
        this.ctx.strokeStyle = THEME.gridColor;
        this.ctx.lineWidth = THEME.gridWidth2D;
        this.ctx.beginPath();
        for (let i = 1; i < this.board.size; i++) {
            this.ctx.moveTo(offsetX + i * cellSize, offsetY);
            this.ctx.lineTo(offsetX + i * cellSize, offsetY + this.boardPixelSize);
            this.ctx.moveTo(offsetX, offsetY + i * cellSize);
            this.ctx.lineTo(offsetX + this.boardPixelSize, offsetY + i * cellSize);
        }
        this.ctx.stroke();

        // Contorno externo
        this.ctx.strokeStyle = isCenter ? THEME.centerBorderColor : THEME.ghostBorderColor;
        this.ctx.lineWidth = isCenter ? THEME.centerBorderWidth2D : 1;
        this.ctx.strokeRect(offsetX, offsetY, this.boardPixelSize, this.boardPixelSize);

        // Peças
        this.ctx.font = `${cellSize * 0.6}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const cellValue = this.board.grid[row][col];
                if (cellValue !== 0) {
                    const pConfig = cellValue === 1 ? THEME.player1 : THEME.player2;
                    this.ctx.fillStyle = pConfig.color;

                    const visualCol = invertX ? (this.board.size - 1 - col) : col;
                    const centerX = offsetX + (visualCol * cellSize) + (cellSize / 2);
                    const centerY = offsetY + (row * cellSize) + (cellSize / 2);

                    this.ctx.fillText(pConfig.symbol, centerX, centerY);
                }
            }
        }

        // Linha de Vitória
        if (this.board.winningPath) {
            this.ctx.strokeStyle = THEME.winLineColor;
            this.ctx.lineWidth = THEME.winLineWidth2D;
            this.ctx.lineCap = 'round';

            this.board.winningPath.forEach((step) => {
                const visualCol = invertX ? (this.board.size - 1 - step.col) : step.col;
                const cx = offsetX + visualCol * cellSize + cellSize / 2;
                const cy = offsetY + step.row * cellSize + cellSize / 2;

                const mInDx = invertX ? -step.inDx : step.inDx;
                const mOutDx = invertX ? -step.outDx : step.outDx;

                const startX = cx - mInDx * (cellSize / 2);
                const startY = cy - step.inDy * (cellSize / 2);
                const endX = cx + mOutDx * (cellSize / 2);
                const endY = cy + step.outDy * (cellSize / 2);

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            });
        }
    }

    destroy() {
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}