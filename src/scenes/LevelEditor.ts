import { Scene } from 'phaser';

interface TMXLayer {
    data: number[];
    height: number;
    width: number;
    name: string;
    opacity: number;
    type: string;
    visible: boolean;
    x: number;
    y: number;
}

interface TMXTileset {
    firstgid: number;
    image: string;
    imageheight: number;
    imagewidth: number;
    margin: number;
    name: string;
    spacing: number;
    tileheight: number;
    tilewidth: number;
}

interface TMXMap {
    height: number;
    width: number;
    layers: TMXLayer[];
    nextlayerid: number;
    nextobjectid: number;
    orientation: string;
    renderorder: string;
    tiledversion: string;
    tileheight: number;
    tilesets: TMXTileset[];
    tilewidth: number;
    type: string;
    version: string;
}

export class LevelEditor extends Scene {
    private grid: Phaser.GameObjects.Graphics;
    private selectedTile: number = 0;
    private isEraser: boolean = false;
    private tileSize: number = 32;
    private tmxData: TMXMap;
    private tileButtons: Phaser.GameObjects.Text[] = [];
    private uiBackground: Phaser.GameObjects.Image;
    private currentLayer: number = 0;

    constructor() {
        super('LevelEditor');
    }

    preload() {
        // Load the tileset SVG as a spritesheet
        this.load.spritesheet('tiles', 'assets/tileset.svg', {
            frameWidth: 32,
            frameHeight: 32,
            spacing: 0
        });
        this.load.image('ui-bg', 'assets/ui-bg.svg');
        this.load.image('coin', 'assets/coin.svg');
    }

    create() {
        // Create UI background
        this.uiBackground = this.add.image(800, 384, 'ui-bg');
        this.uiBackground.setOrigin(0, 0.5);
        this.uiBackground.setDepth(1);

        // Create grid
        this.grid = this.add.graphics();
        this.drawGrid();
        this.grid.setDepth(2);

        // Initialize empty TMX data
        this.initializeTMXData();

        // Create tile palette
        this.createTilePalette();

        // Create UI buttons
        this.createButtons();

        // Add input handlers
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.x < 768) { // Only allow placing tiles in the main area
                const gridX = Math.floor(pointer.x / this.tileSize);
                const gridY = Math.floor(pointer.y / this.tileSize);
                this.placeTile(gridX, gridY);
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && pointer.x < 768) {
                const gridX = Math.floor(pointer.x / this.tileSize);
                const gridY = Math.floor(pointer.y / this.tileSize);
                this.placeTile(gridX, gridY);
            }
        });

        // Add keyboard shortcuts
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-E', () => {
                this.isEraser = !this.isEraser;
                this.updateTilePalette();
            });

            this.input.keyboard.on('keydown-S', (event: KeyboardEvent) => {
                if (event.ctrlKey) {
                    this.saveLevel();
                }
            });

            // Add ESC key to return to main menu
            this.input.keyboard.on('keydown-ESC', () => {
                this.scene.start('MainMenu');
            });
        }
    }

    private initializeTMXData() {
        this.tmxData = {
            height: 24,
            width: 24,
            layers: [{
                data: Array(24 * 24).fill(0), // 0 is empty in TMX
                height: 24,
                width: 24,
                name: "main",
                opacity: 1,
                type: "tilelayer",
                visible: true,
                x: 0,
                y: 0
            }],
            nextlayerid: 2,
            nextobjectid: 1,
            orientation: "orthogonal",
            renderorder: "right-down",
            tiledversion: "1.10.2",
            tileheight: 32,
            tilesets: [{
                firstgid: 1,
                image: "tileset.svg",
                imageheight: 32,
                imagewidth: 32,
                margin: 0,
                name: "tiles",
                spacing: 0,
                tileheight: 32,
                tilewidth: 32
            }],
            tilewidth: 32,
            type: "map",
            version: "1.10"
        };
    }

    private drawGrid() {
        this.grid.clear();
        this.grid.lineStyle(1, 0x666666, 0.3);

        // Draw vertical lines
        for (let x = 0; x <= 24; x++) {
            this.grid.moveTo(x * this.tileSize, 0);
            this.grid.lineTo(x * this.tileSize, 24 * this.tileSize);
        }

        // Draw horizontal lines
        for (let y = 0; y <= 24; y++) {
            this.grid.moveTo(0, y * this.tileSize);
            this.grid.lineTo(24 * this.tileSize, y * this.tileSize);
        }

        this.grid.strokePath();
    }

    private createTilePalette() {
        const tileTypes = [
            { id: 0, name: 'Empty' },
            { id: 1, name: 'Ground' },      // First tile in tileset (x=0)
            { id: 2, name: 'Platform' },    // Second tile in tileset (x=32)
            { id: 3, name: 'Grass' },       // Third tile in tileset (x=64)
            { id: 4, name: 'Goal' },        // Fourth tile in tileset (x=96)
            { id: 5, name: 'Coin', isCoin: true }
        ];

        tileTypes.forEach((tile, index) => {
            // Add tile preview next to the text
            if (tile.id > 0) {
                if (tile.isCoin) {
                    this.add.image(820, 154 + index * 40 + 10, 'coin')
                        .setOrigin(0.5)
                        .setScale(0.8)
                        .setDepth(10)
                        .setData('isPalettePreview', true);
                } else {
                    this.add.sprite(820, 154 + index * 40 + 10, 'tiles', tile.id - 1)
                        .setOrigin(0.5)
                        .setScale(0.8)
                        .setDepth(10)
                        .setData('isPalettePreview', true);
                }
            }

            const button = this.add.text(850, 154 + index * 40, `${tile.name}`, {
                fontSize: '16px',
                color: '#fff',
                backgroundColor: this.selectedTile === tile.id ? '#666666' : '#4a4a4a',
                padding: { x: 10, y: 5 }
            })
            .setInteractive()
            .setDepth(10)
            .on('pointerdown', () => {
                this.selectedTile = tile.id;
                this.isEraser = false;
                this.updateTilePalette();
            });

            this.tileButtons.push(button);
        });
    }

    private updateTilePalette() {
        this.tileButtons.forEach((button, index) => {
            const tileTypes = [0, 1, 2, 3, 4, 5]; // Match the tile IDs from createTilePalette
            button.setStyle({
                backgroundColor: this.selectedTile === tileTypes[index] ? '#666666' : '#4a4a4a'
            });
        });
    }

    private createButtons() {
        // Load button
        this.add.text(820, 500, 'Load Level', {
            fontSize: '16px',
            color: '#fff',
            backgroundColor: '#4a4a4a',
            padding: { x: 10, y: 5 }
        })
        .setInteractive()
        .setDepth(10)
        .on('pointerdown', () => this.loadLevel());

        // Test button
        this.add.text(820, 550, 'Test Level', {
            fontSize: '16px',
            color: '#fff',
            backgroundColor: '#4a4a4a',
            padding: { x: 10, y: 5 }
        })
        .setInteractive()
        .setDepth(10)
        .on('pointerdown', () => this.testLevel());
    }

    private placeTile(x: number, y: number) {
        if (x >= 0 && x < 24 && y >= 0 && y < 24) {
            const index = y * 24 + x;
            this.tmxData.layers[this.currentLayer].data[index] = this.isEraser ? 0 : this.selectedTile;
            this.drawLevel();
        }
    }

    private drawLevel() {
        // Clear existing tiles but keep palette previews
        this.children.list
            .filter(child => 
                (child instanceof Phaser.GameObjects.Sprite || child instanceof Phaser.GameObjects.Image) && 
                !child.getData('isPalettePreview') &&
                child !== this.uiBackground
            )
            .forEach(child => child.destroy());

        // Draw tiles
        const layer = this.tmxData.layers[this.currentLayer];
        for (let y = 0; y < 24; y++) {
            for (let x = 0; x < 24; x++) {
                const tileId = layer.data[y * 24 + x];
                if (tileId > 0) {
                    if (tileId === 5) { // Coin
                        this.add.image(
                            x * this.tileSize + this.tileSize / 2,
                            y * this.tileSize + this.tileSize / 2,
                            'coin'
                        )
                        .setOrigin(0.5, 0.5)
                        .setDepth(3)
                        .setData('isPalettePreview', false);
                    } else {
                        this.add.sprite(
                            x * this.tileSize + this.tileSize / 2,
                            y * this.tileSize + this.tileSize / 2,
                            'tiles',
                            tileId - 1
                        )
                        .setOrigin(0.5, 0.5)
                        .setDepth(3)
                        .setData('isPalettePreview', false);
                    }
                }
            }
        }
    }

    private saveLevel() {
        const levelJson = JSON.stringify(this.tmxData);
        localStorage.setItem('savedLevel', levelJson);
        alert('Level saved!');
    }

    private loadLevel() {
        const savedLevel = localStorage.getItem('savedLevel');
        if (savedLevel) {
            try {
                this.tmxData = JSON.parse(savedLevel);
                this.drawLevel();
            } catch (e) {
                alert('Error loading level: Invalid TMX JSON format');
            }
        } else {
            alert('No saved level found!');
        }
    }

    private testLevel() {
        // Save current level to localStorage for the Game scene to load
        localStorage.setItem('savedLevel', JSON.stringify(this.tmxData));
        this.scene.start('Game');
    }
} 