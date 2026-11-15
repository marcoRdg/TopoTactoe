import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

export class Geometries {
    static create(topology) {
        if (topology === 'cylinder') {
            // Cilindro aberto nas pontas (raio superior, raio inferior, altura, segmentos)
            return new THREE.CylinderGeometry(2, 2, 6, 64, 64, true);
        }
        
        if (topology === 'klein') {
            // Equação paramétrica da Garrafa de Klein (Forma de Garrafa/Figura 8)
            const kleinFunction = (u, v, target) => {
                u *= Math.PI;
                v *= 2 * Math.PI;

                u = u * 2;
                let x, y, z;
                if (u < Math.PI) {
                    x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
                    z = -8 * Math.sin(u) - (2 * (1 - Math.cos(u) / 2)) * Math.sin(u) * Math.cos(v);
                } else {
                    x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
                    z = -8 * Math.sin(u);
                }
                y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);

                target.set(x * 0.4, y * 0.4, z * 0.4);
            };

            return new ParametricGeometry(kleinFunction, 64, 64);
        }

        // Padrão: Toro
        return new THREE.TorusGeometry(3, 1.2, 64, 100);
    }
}