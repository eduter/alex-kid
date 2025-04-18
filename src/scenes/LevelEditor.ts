import { Scene } from 'phaser';

export class LevelEditor extends Scene {
    private grid: Phaser.GameObjects.Graphics;
    private selectedTile: number = 0;
    private isEraser: boolean = false;
    private tileSize: number = 32;
    private levelData: number[][] = [];
    private tileButtons: Phaser.GameObjects.Text[] = [];
    private uiBackground: Phaser.GameObjects.Image;

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

        // Initialize empty level data
        this.initializeLevelData();

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

    private initializeLevelData() {
        // Create a 24x24 grid of empty tiles (-1)
        for (let y = 0; y < 24; y++) {
            this.levelData[y] = [];
            for (let x = 0; x < 24; x++) {
                this.levelData[y][x] = -1;
            }
        }
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
            { id: -1, name: 'Empty' },
            { id: 0, name: 'Ground' },
            { id: 1, name: 'Platform' },
            { id: 4, name: 'Spike' },
            { id: 7, name: 'Goal' },
            { id: 8, name: 'Coin', isCoin: true }
        ];

        tileTypes.forEach((tile, index) => {
            // Add tile preview next to the text
            if (tile.id >= 0) {
                if (tile.isCoin) {
                    this.add.image(820, 154 + index * 40 + 10, 'coin')
                        .setOrigin(0.5)
                        .setScale(0.8)
                        .setDepth(10)
                        .setData('isPalettePreview', true);
                } else {
                    this.add.sprite(820, 154 + index * 40 + 10, 'tiles', tile.id)
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
            const tileTypes = [-1, 0, 1, 4, 7, 8]; // Match the tile IDs from createTilePalette
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
            this.levelData[y][x] = this.isEraser ? -1 : this.selectedTile;
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
        for (let y = 0; y < 24; y++) {
            for (let x = 0; x < 24; x++) {
                const tileId = this.levelData[y][x];
                if (tileId >= 0) {
                    if (tileId === 8) { // Coin
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
                            tileId
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
        const levelJson = JSON.stringify(this.levelData);
        localStorage.setItem('savedLevel', levelJson);
        alert('Level saved!');
    }

    private loadLevel() {
        const savedLevel = localStorage.getItem('savedLevel');
        if (savedLevel) {
            this.levelData = JSON.parse(savedLevel);
            this.drawLevel();
        } else {
            alert('No saved level found!');
        }
    }

    private testLevel() {
        // Save current level to localStorage for the Game scene to load
        localStorage.setItem('savedLevel', JSON.stringify(this.levelData));
        this.scene.start('Game');
    }
} 