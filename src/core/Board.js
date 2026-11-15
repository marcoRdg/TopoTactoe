export class Board {
    constructor(size = 3) {
        this.size = size;
        // Cria uma matriz NxN preenchida com 0
        this.grid = Array.from({ length: size }, () => Array(size).fill(0));
        this.winningPath = null; // Armazena a linha de vitória
    }

    makeMove(col, row, player) {
        // Valida se está dentro do tabuleiro e vazio
        if (col >= 0 && col < this.size && row >= 0 && row < this.size) {
            if (this.grid[row][col] === 0) {
                this.grid[row][col] = player;
                return true;
            }
        }
        return false;
    }

    isFull() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) return false;
            }
        }
        return true;
    }
}

