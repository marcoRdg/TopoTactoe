import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { THEME } from '../utils/Theme.js';

export class RendererMorph3D {
    constructor(board, containerId, topology = 'torus', options = {}) {
        this.board = board;
        this.topology = topology;
        this.container = document.getElementById(containerId);
        this.isOverlay = Boolean(options.isOverlay);
        this.hoveredCell = null;

        this.morphState = {
            rollU: 0, // Fase 1: enrola horizontalmente (Cilindro)
            bendV: 0  // Fase 2: curva verticalmente (Toro / Klein)
        };
        this.isFolded = false;

        this.createTextureCanvas();

        // Usa o tamanho exato do canvas 2D se estiver em modo overlay
        const fallbackSize = Math.min(600, window.innerWidth - 24, window.innerHeight - 140);
        const canvasSize = options.canvasSize || Math.max(300, Math.floor(fallbackSize / 3) * 3);

        // Distância Z calibrada para o plano L0 = 6.0 ocupar exatamente 1/3 da tela (encaixe 1:1 com o 2D)
        this.L0 = 6.0;
        const fov = 45;
        this.zExact = (3 * this.L0) / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
        this.camera.position.set(0, 0, this.zExact);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(canvasSize, canvasSize);
        if (this.isOverlay) {
            this.renderer.domElement.classList.add('canvas-overlay-3d');
        }
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.geometry = new THREE.PlaneGeometry(1, 1, 64, 64);
        this.baseUVs = this.geometry.attributes.uv.array.slice();

        const material = new THREE.MeshStandardMaterial({
            map: this.canvasTexture,
            side: THREE.DoubleSide,
            roughness: THEME.materialRoughness,
            metalness: THEME.materialMetalness
        });

        this.mesh = new THREE.Mesh(this.geometry, material);
        this.scene.add(this.mesh);

        // Iluminação inicia uniforme para casar com o 2D plano e ativa luz direcional ao dobrar
        this.ambientLight = new THREE.AmbientLight(0xffffff, Math.PI);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0);
        this.dirLight.position.set(5, 10, 10);
        this.scene.add(this.dirLight);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.updateGeometry();
        this.draw();

        this.animationId = null;
        this.animate();

        const delay = this.isOverlay ? 150 : 600;
        this.initialFoldTimeout = setTimeout(() => this.fold(), delay);
    }

    setHover(cell) {
        const prev = this.hoveredCell;
        if (!prev && !cell) return;
        if (prev && cell && prev.col === cell.col && prev.row === cell.row) return;

        this.hoveredCell = cell;
        this.draw();
    }

    updateGeometry() {
        const pos = this.geometry.attributes.position;
        const count = pos.count;
        const L0 = this.L0;

        const rMinor = this.topology === 'cylinder' ? 2.5 : 1.2;
        const rMajor = 3.0;
        const LuTarget = 2 * Math.PI * rMinor;
        const LvTarget = 2 * Math.PI * rMajor;

        const t1 = this.morphState.rollU;
        const t2 = this.morphState.bendV;

        const currLu = THREE.MathUtils.lerp(L0, LuTarget, t1);
        const currLv = THREE.MathUtils.lerp(L0, LvTarget, t2);

        for (let i = 0; i < count; i++) {
            const u = this.baseUVs[i * 2];
            const v = this.baseUVs[i * 2 + 1];

            // Fase 1: Enrola horizontalmente (Cilindro)
            const theta = (u - 0.5) * 2 * Math.PI * t1;
            const xCyl = t1 < 1e-4
                ? (u - 0.5) * L0
                : currLu * Math.sin(theta) / (2 * Math.PI * t1);

            const zRaw = t1 < 1e-4
                ? 0
                : currLu * (1 - Math.cos(theta)) / (2 * Math.PI * t1);

            const zCentered = zRaw - rMinor * Math.sin((Math.PI / 2) * t1);

            let x, y, z;

            if (this.topology === 'cylinder') {
                x = xCyl;
                y = (v - 0.5) * L0;
                z = zCentered;
            } else if (this.topology === 'torus') {
                // Fase 2A: Fecha verticalmente (Toro)
                const phi = (v - 0.5) * 2 * Math.PI * t2;
                const yBend = t2 < 1e-4
                    ? (v - 0.5) * L0
                    : currLv * Math.sin(phi) / (2 * Math.PI * t2);

                const zBend = t2 < 1e-4
                    ? 0
                    : currLv * (1 - Math.cos(phi)) / (2 * Math.PI * t2);

                x = xCyl;
                y = yBend - zCentered * Math.sin(phi);
                z = zBend + zCentered * Math.cos(phi) - rMajor * Math.sin((Math.PI / 2) * t2);
            } else if (this.topology === 'klein') {
                // Fase 2B: Deforma na Garrafa de Klein
                const yCyl = (v - 0.5) * L0;
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

                x = THREE.MathUtils.lerp(xCyl, kx * 0.4, t2);
                y = THREE.MathUtils.lerp(yCyl, ky * 0.4, t2);
                z = THREE.MathUtils.lerp(zCentered, kz * 0.4, t2);
            }

            pos.setXYZ(i, x, y, z);
        }

        pos.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }

    fold() {
        clearTimeout(this.initialFoldTimeout);
        if (this.timeline) this.timeline.kill();
        this.isFolded = true;

        this.timeline = gsap.timeline({
            onUpdate: () => this.updateGeometry()
        });

        this.timeline.to(this.morphState, {
            rollU: 1,
            duration: 1.4,
            ease: 'power2.inOut'
        });

        if (this.topology !== 'cylinder') {
            this.timeline.to(this.morphState, {
                bendV: 1,
                duration: 1.6,
                ease: 'power2.inOut'
            }, '-=0.3');
        }

        gsap.to(this.camera.position, {
            x: 0,
            y: 8,
            z: 14,
            duration: 2.2,
            ease: 'power2.inOut'
        });

        gsap.to(this.ambientLight, { intensity: 1.6, duration: 1.5 });
        gsap.to(this.dirLight, { intensity: 2.0, duration: 1.5 });
    }

    unfold() {
        clearTimeout(this.initialFoldTimeout);
        if (this.timeline) this.timeline.kill();
        this.isFolded = false;

        this.timeline = gsap.timeline({
            onUpdate: () => this.updateGeometry()
        });

        this.timeline.to(this.morphState, {
            bendV: 0,
            duration: 1.2,
            ease: 'power2.inOut'
        }).to(this.morphState, {
            rollU: 0,
            duration: 1.2,
            ease: 'power2.inOut'
        }, '-=0.2');

        gsap.to(this.camera.position, {
            x: 0,
            y: 0,
            z: this.zExact,
            duration: 2.0,
            ease: 'power2.inOut'
        });

        gsap.to(this.ambientLight, { intensity: Math.PI, duration: 1.5 });
        gsap.to(this.dirLight, { intensity: 0, duration: 1.5 });
    }

    toggleFold() {
        if (this.isFolded) this.unfold();
        else this.fold();
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
        clearTimeout(this.initialFoldTimeout);
        if (this.timeline) this.timeline.kill();
        cancelAnimationFrame(this.animationId);
        if (this.renderer.domElement.parentNode) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.geometry.dispose();
        this.renderer.dispose();
    }
}