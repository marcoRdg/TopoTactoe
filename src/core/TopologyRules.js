export class TopologyRules {
    static takeStep(col, row, dx, dy, N, topology = 'torus') {
        let nextCol = col + dx;
        let nextRow = row + dy;
        let nextDx = dx;
        let nextDy = dy;

        if (topology === 'cylinder') {
            nextCol = (((nextCol % N) + N) % N);
            if (nextRow < 0 || nextRow >= N) return null; // Linha quebra
        }
        else if (topology === 'torus') {
            nextCol = (((nextCol % N) + N) % N);
            nextRow = (((nextRow % N) + N) % N);
        }
        else if (topology === 'klein') {
            nextCol = (((nextCol % N) + N) % N);
            
            // Se cruzou o topo ou a base, a orientação X inverte!
            if (nextRow < 0) {
                nextRow = N - 1;
                nextCol = (N - 1) - nextCol;
                nextDx = -dx; // A linha reflete horizontalmente
            } else if (nextRow >= N) {
                nextRow = 0;
                nextCol = (N - 1) - nextCol;
                nextDx = -dx; // A linha reflete horizontalmente
            }
        }
        return { col: nextCol, row: nextRow, dx: nextDx, dy: nextDy };
    }
}