import { TopologyRules } from './TopologyRules.js';

export class GameFlow {
    static checkWin(board, player, topology = 'torus') {
        const N = board.size;
        const grid = board.grid;

        const checkLine = (startX, startY, initialDx, initialDy) => {
            let currCol = startX;
            let currRow = startY;
            let currDx = initialDx;
            let currDy = initialDy;
            
            let path = [];
            
            for (let i = 0; i < N; i++) {
                if (grid[currRow][currCol] !== player) return null;
                
                path.push({ col: currCol, row: currRow, dx: currDx, dy: currDy });
                
                if (i < N - 1) {
                    const next = TopologyRules.takeStep(currCol, currRow, currDx, currDy, N, topology);
                    if (!next) return null;
                    currCol = next.col;
                    currRow = next.row;
                    currDx = next.dx;
                    currDy = next.dy;
                }
            }
            
            // Verifica se a linha formou um Loop Fechado (cruza a borda e volta perfeitamente pro início)
            const lastStep = path[N - 1];
            const wrapsToFirst = TopologyRules.takeStep(lastStep.col, lastStep.row, lastStep.dx, lastStep.dy, N, topology);
            const formsLoop = (wrapsToFirst && wrapsToFirst.col === path[0].col && wrapsToFirst.row === path[0].row);

            // Adiciona os vetores de entrada (in) e saída (out) para cada célula desenhar seu próprio pedaço de linha
            path.forEach((step, index) => {
                // Para onde a linha vai (Sai da célula)
                if (index === N - 1) {
                    // step.outDx = formsLoop ? step.dx : 0; // Se não for loop, para no centro (0)
                    // step.outDy = formsLoop ? step.dy : 0;
                    step.outDx = step.dx; // Se não for loop, para no centro (0)
                    step.outDy = step.dy;
                } else {
                    step.outDx = step.dx;
                    step.outDy = step.dy;
                }

                // De onde a linha vem (Entra na célula)
                if (index === 0) {
                    // step.inDx = formsLoop ? wrapsToFirst.dx : 0; // Se não for loop, nasce no centro (0)
                    // step.inDy = formsLoop ? wrapsToFirst.dy : 0;
                    step.inDx = step.dx; // Se não for loop, para no centro (0)
                    step.inDy = step.dy;
                } else {
                    const prev = path[index - 1];
                    const nextFromPrev = TopologyRules.takeStep(prev.col, prev.row, prev.dx, prev.dy, N, topology);
                    step.inDx = nextFromPrev.dx;
                    step.inDy = nextFromPrev.dy;
                }
            });

            return path;
        };

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                let win;
                win = checkLine(c, r, 1, 0);  if (win) return win;
                win = checkLine(c, r, 0, 1);  if (win) return win;
                win = checkLine(c, r, 1, 1);  if (win) return win;
                win = checkLine(c, r, 1, -1); if (win) return win;
            }
        }
        return null;
    }
}