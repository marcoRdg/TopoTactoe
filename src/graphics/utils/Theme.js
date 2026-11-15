export const THEMES = {
    dark: {
        pageBg: '#1a1a1a',
        textColor: '#ffffff',
        boardBg: '#2a2a2a',
        gridColor: '#ffffff',
        gridWidth2D: 2,
        gridWidth3D: 5,

        centerBorderColor: '#747774',
        centerBorderWidth2D: 3,
        centerBorderWidth3D: 8,
        ghostBorderColor: '#888888',
        ghostOpacity: 0.25,

        player1: { symbol: 'X', color: '#ff5555' },
        player2: { symbol: 'O', color: '#5555ff' },

        winLineColor: '#3d052c',
        winLineWidth2D: 6,
        winLineWidth3D: 15,

        textureSize: 512,
        materialRoughness: 0.45,
        materialMetalness: 0.05,

        hoverColor: 'rgba(255, 255, 255, 0.14)',
        textureSize: 512,
        materialRoughness: 0.45,
        materialMetalness: 0.05
    },

    light: {
        pageBg: '#eef1f5',
        textColor: '#1e272e',
        boardBg: '#ffffff',
        gridColor: '#2f3640',
        gridWidth2D: 2,
        gridWidth3D: 5,

        centerBorderColor: '#0984e3',
        centerBorderWidth2D: 3,
        centerBorderWidth3D: 8,
        ghostBorderColor: '#b2bec3',
        ghostOpacity: 0.35,

        player1: { symbol: 'X', color: '#d63031' },
        player2: { symbol: 'O', color: '#0984e3' },

        winLineColor: '#10ac84',
        winLineWidth2D: 6,
        winLineWidth3D: 15,

        textureSize: 512,
        materialRoughness: 0.65,
        materialMetalness: 0.0,

        hoverColor: 'rgba(9, 132, 227, 0.16)',
        textureSize: 512,
        materialRoughness: 0.65,
        materialMetalness: 0.0
    },

    neon: {
        pageBg: '#090a0f',
        textColor: '#00f3ff',
        boardBg: '#111625',
        gridColor: '#00f3ff',
        gridWidth2D: 2,
        gridWidth3D: 5,

        centerBorderColor: '#ff007f',
        centerBorderWidth2D: 3,
        centerBorderWidth3D: 10,
        ghostBorderColor: '#3b4266',
        ghostOpacity: 0.3,

        player1: { symbol: 'X', color: '#ff2a85' },
        player2: { symbol: 'O', color: '#ffe600' },

        winLineColor: '#5b1145',
        winLineWidth2D: 6,
        winLineWidth3D: 16,

        textureSize: 512,
        materialRoughness: 0.2,
        materialMetalness: 0.25,

        hoverColor: 'rgba(0, 243, 255, 0.20)',
        textureSize: 512,
        materialRoughness: 0.2,
        materialMetalness: 0.25
    }
};

// Objeto ativo compartilhado por todos os renderizadores
export const THEME = { ...THEMES.dark };

export function setTheme(themeKey) {
    if (THEMES[themeKey]) {
        Object.assign(THEME, THEMES[themeKey]);
    }
}