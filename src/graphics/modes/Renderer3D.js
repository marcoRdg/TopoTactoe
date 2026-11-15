import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { THEME } from '../utils/Theme.js';

export class Renderer3D {
    constructor(board, containerId, topology = 'torus') {
        this.board = board;
        this.topology = topology;
        this.container = document.getElementById(containerId);
        this.hoveredCell = null;

        this.createTextureCanvas();

        const fallbackSize = Math.min(600, window.innerWidth - 24, window.innerHeight - 140);
        const canvasSize = Math.max(300, Math.floor(fallbackSize / 3) * 3);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 7, 13);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(canvasSize, canvasSize);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.geometry = this.createTopologyGeometry();

        const material = new THREE.MeshStandardMaterial({
            map: this.canvasTexture,
            side: THREE.DoubleSide,
            roughness: THEME.materialRoughness,
            metalness: THEME.materialMetalness
        });

        this.mesh = new THREE.Mesh(this.geometry, material);
        this.scene.add(this.mesh);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        dirLight.position.set(5, 10, 10);
        this.scene.add(dirLight);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.draw();

        this.animationId = null;
        this.animate();
    }

    createTopologyGeometry() {
        const geometry = new THREE.PlaneGeometry(1, 1, 64, 64);
        const uvs = geometry.attributes.uv.array;
        const pos = geometry.attributes.position;
        const count = pos.count;

        const rMinor = this.topology === 'cylinder' ? 2.5 : 1.2;
        const rMajor = 3.0;
        const height = 6.0;

        for (let i = 0; i < count; i++) {
            const u = uvs[i * 2];
            const v = uvs[i * 2 + 1];

            let x, y, z;

            if (this.topology === 'cylinder') {
                const theta = (u - 0.5) * 2 * Math.PI;
                x = rMinor * Math.sin(theta);
                y = (v - 0.5) * height;
                z = rMinor * Math.cos(theta);
            } else if (this.topology === 'torus') {
                const theta = (u - 0.5) * 2 * Math.PI;
                const phi = (v - 0.5) * 2 * Math.PI;
                x = rMinor * Math.sin(theta);
                y = (rMajor + rMinor * Math.cos(theta)) * Math.sin(phi);
                z = -(rMajor + rMinor * Math.cos(theta)) * Math.cos(phi);
            } else if (this.topology === 'klein') {
                const ku = v * 2 * Math.PI;
                const kv = u * 2 * Math.PI;

                let kx, ky, kz;
                if (ku < Math.PI) {
                    kx = 3 * Math.cos(ku) * (1 + Math.sin(ku)) + (2 * (1 - Math.cos(ku) / 2)) * Math.cos(ku) * Math.cos(kv);
                    kz = -8 * Math.sin(ku) - (2 * (1 - Math.cos(ku) / 2)) * Math.sin(ku) * Math.cos(kv);
                } else {
                    kx = 3 * Math.cos(ku) * (1 + Math.sin(ku)) + (2 * (1 - Math.cos(ku) / 2)) * Math.cos(kv + Math.PI);
                    kz = -8 * Math.sin(ku);
                }
                ky = -2 * (1 - Math.cos(ku) / 2) * Math.sin(kv);

                x = kx * 0.4;
                y = ky * 0.4;
                z = kz * 0.4;
            }

            pos.setXYZ(i, x, y, z);
        }

        pos.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
    }

    setHover(cell) {
        const prev = this.hoveredCell;
        if (!prev && !cell) return;
        if (prev && cell && prev.col === cell.col && prev.row === cell.row) return;

        this.hoveredCell = cell;
        this.draw();
    }

    createTextureCanvas() {
        this.textureCanvas = document.createElement('canvas');
        this.textureCanvas.width = THEME.textureSize;
        this.textureCanvas.height = THEME.textureSize;
        this.textureCtx = this.textureCanvas.getContext('2d');

        this.canvasTexture = new THREE.CanvasTexture(this.textureCanvas);
        this.canvasTexture.colorSpace = THREE.SRGBColorSpace;
    }

    draw() {
        if (this.mesh) {
            this.mesh.material.roughness = THEME.materialRoughness;
            this.mesh.material.metalness = THEME.materialMetalness;
        }

        const size = THEME.textureSize;
        const cellSize = size / this.board.size;

        // Fundo do tabuleiro
        this.textureCtx.fillStyle = THEME.boardBg;
        this.textureCtx.fillRect(0, 0, size, size);

        // Destaque de hover
        if (this.hoveredCell && this.board.grid[this.hoveredCell.row][this.hoveredCell.col] === 0) {
            this.textureCtx.fillStyle = THEME.hoverColor;
            this.textureCtx.fillRect(
                this.hoveredCell.col * cellSize,
                this.hoveredCell.row * cellSize,
                cellSize,
                cellSize
            );
        }

        // Linhas da grade
        this.textureCtx.strokeStyle = THEME.gridColor;
        this.textureCtx.lineWidth = THEME.gridWidth3D;
        this.textureCtx.beginPath();
        for (let i = 1; i < this.board.size; i++) {
            this.textureCtx.moveTo(i * cellSize, 0);
            this.textureCtx.lineTo(i * cellSize, size);
            this.textureCtx.moveTo(0, i * cellSize);
            this.textureCtx.lineTo(size, i * cellSize);
        }
        this.textureCtx.stroke();

        // Borda externa (costura topológica)
        this.textureCtx.strokeStyle = THEME.centerBorderColor;
        this.textureCtx.lineWidth = THEME.centerBorderWidth3D;
        this.textureCtx.strokeRect(0, 0, size, size);

        // Peças
        this.textureCtx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
        this.textureCtx.textAlign = 'center';
        this.textureCtx.textBaseline = 'middle';

        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const val = this.board.grid[row][col];
                if (val !== 0) {
                    const pConfig = val === 1 ? THEME.player1 : THEME.player2;
                    this.textureCtx.fillStyle = pConfig.color;
                    const x = col * cellSize + cellSize / 2;
                    const y = row * cellSize + cellSize / 2;
                    this.textureCtx.fillText(pConfig.symbol, x, y);
                }
            }
        }

        // Linha de Vitória
        if (this.board.winningPath) {
            const ctx = this.textureCtx;
            ctx.strokeStyle = THEME.winLineColor;
            ctx.lineWidth = THEME.winLineWidth3D;
            ctx.lineCap = 'round';

            this.board.winningPath.forEach((step) => {
                const cx = step.col * cellSize + cellSize / 2;
                const cy = step.row * cellSize + cellSize / 2;
                const startX = cx - step.inDx * (cellSize / 2);
                const startY = cy - step.inDy * (cellSize / 2);
                const endX = cx + step.outDx * (cellSize / 2);
                const endY = cy + step.outDy * (cellSize / 2);

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            });
        }

        this.canvasTexture.needsUpdate = true;
    }

    getGridIntersection(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.mesh);

        if (intersects.length > 0) {
            const uv = intersects[0].uv;
            const col = THREE.MathUtils.clamp(Math.floor(uv.x * this.board.size), 0, this.board.size - 1);
            const row = THREE.MathUtils.clamp(Math.floor((1.0 - uv.y) * this.board.size), 0, this.board.size - 1);
            return { col, row };
        }
        return null;
    }

    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        cancelAnimationFrame(this.animationId);
        if (this.renderer.domElement.parentNode) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.geometry.dispose();
        this.renderer.dispose();
    }
}