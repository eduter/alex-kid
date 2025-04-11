import { Scene } from 'phaser';
import { Coin } from '../objects/Coin';

export class Game extends Scene
{
    private ninja!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private isAttacking: boolean = false;
    
    // Tile-based properties
    private tileSize: number = 32;
    private gridWidth: number = 32; // 32 tiles wide
    private gridHeight: number = 24; // 24 tiles high
    private levelData: number[][] = [];
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private tileset!: Phaser.Tilemaps.Tileset | null;
    private groundLayer!: Phaser.Tilemaps.TilemapLayer | null;
    private coins: Phaser.GameObjects.Group;

    constructor ()
    {
        super('Game');
    }

    init(data: { isTestingLevel?: boolean })
    {
        // Initialize empty level data
        for (let y = 0; y < this.gridHeight; y++) {
            this.levelData[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.levelData[y][x] = -1;
            }
        }

        // Load saved level if available
        const savedLevel = localStorage.getItem('savedLevel');
        if (savedLevel) {
            this.levelData = JSON.parse(savedLevel);
        }
    }

    preload()
    {
        // Load game assets
        this.load.spritesheet('ninja', 
            'assets/ninja-sprites.svg',
            { frameWidth: 64, frameHeight: 64 }
        );
        
        // Load tile assets
        this.load.image('tiles', 'assets/tileset.svg');
        this.load.image('coin', 'assets/coin.svg');
        
        this.load.image('background', 'assets/background.svg');
    }

    create ()
    {
        // Add background
        this.add.image(400, 300, 'background');

        // Create tilemap
        this.tilemap = this.make.tilemap({
            data: this.levelData,
            tileWidth: this.tileSize,
            tileHeight: this.tileSize,
            width: this.gridWidth,
            height: this.gridHeight
        });
        
        this.tileset = this.tilemap.addTilesetImage('tiles');
        
        if (!this.tileset) {
            console.error('Failed to load tileset');
            return;
        }
        
        // Create layer
        this.groundLayer = this.tilemap.createLayer(0, this.tileset, 0, 0);
        
        if (!this.groundLayer) {
            console.error('Failed to create layer');
            return;
        }
        
        // Set collision for specific tiles
        this.groundLayer.setCollisionByExclusion([-1, 8]); // Collide with any tile that isn't empty or a coin

        // Create coins group
        this.coins = this.add.group({
            classType: Coin,
            runChildUpdate: true
        });
        
        // Place coins based on level data
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.levelData[y][x] === 8) { // Coin tile
                    // Remove coin from level data so it doesn't create a collision
                    this.levelData[y][x] = -1;
                    
                    // Create coin using the Coin class
                    const coin = new Coin(
                        this,
                        x * this.tileSize + this.tileSize / 2,
                        y * this.tileSize + this.tileSize / 2
                    );
                    
                    // Add to coins group
                    this.coins.add(coin);
                }
            }
        }
        
        // Create ninja character at a safe starting position
        this.ninja = this.physics.add.sprite(50, 50, 'ninja');
        this.ninja.setBounce(0.1); // Reduce bounce
        this.ninja.setCollideWorldBounds(true);
        this.ninja.setGravityY(600); // Increase gravity
        this.ninja.setSize(32, 48); // Adjust collision box
        this.ninja.setOffset(16, 16); // Center the collision box

        // Create animations
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('ninja', { start: 0, end: 1 }),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('ninja', { start: 2, end: 4 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('ninja', { start: 5, end: 5 }),
            frameRate: 1,
            repeat: 0
        });

        this.anims.create({
            key: 'attack',
            frames: this.anims.generateFrameNumbers('ninja', { start: 6, end: 6 }),
            frameRate: 1,
            repeat: 0
        });

        // Set up controls
        this.cursors = this.input.keyboard?.createCursorKeys();
        if (!this.cursors) {
            console.error('Failed to create cursor keys');
            return;
        }

        // Add space key for attack
        this.input.keyboard?.on('keydown-SPACE', () => {
            if (!this.isAttacking) {
                this.isAttacking = true;
                this.ninja.anims.play('attack', true);
                this.time.delayedCall(500, () => {
                    this.isAttacking = false;
                    if (this.ninja.body?.touching.down) {
                        this.ninja.anims.play('idle', true);
                    }
                });
            }
        });

        // Add collision between ninja and layer
        if (this.groundLayer) {
            this.physics.add.collider(this.ninja, this.groundLayer);
        }

        // Add collision between ninja and coins
        this.physics.add.overlap(this.ninja, this.coins, (_ninja, coin) => {
            console.log('collectCoin', _ninja, coin);
            
            if (coin instanceof Coin) {
                coin.collect();
                this.score += 10;
                this.scoreText.setText('Score: ' + this.score);
            }
        }, undefined, this);

        // Add score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', { 
            fontSize: '32px', 
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        })
        .setScrollFactor(0) // Keep score fixed on screen
        .setDepth(100);
        
        // Add camera follow
        this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
        this.cameras.main.startFollow(this.ninja, true);

        // Add return to editor key
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.start('LevelEditor');
        });
    }

    update()
    {
        if (!this.ninja.body || !this.cursors) return;

        const onGround = this.ninja.body.blocked.down;

        // Handle movement
        if (this.cursors.left.isDown) {
            this.ninja.setVelocityX(-160);
            if (!this.isAttacking && onGround) {
                this.ninja.anims.play('run', true);
            }
            this.ninja.flipX = true;
        } else if (this.cursors.right.isDown) {
            this.ninja.setVelocityX(160);
            if (!this.isAttacking && onGround) {
                this.ninja.anims.play('run', true);
            }
            this.ninja.flipX = false;
        } else {
            this.ninja.setVelocityX(0);
            if (!this.isAttacking && onGround) {
                this.ninja.anims.play('idle', true);
            }
        }

        // Handle jumping
        if (this.cursors.up.isDown && onGround) {
            this.ninja.setVelocityY(-450);
            this.ninja.anims.play('jump', true);
        }

        // Play jump animation while in air
        if (!onGround && !this.isAttacking) {
            this.ninja.anims.play('jump', true);
        }
    }
}
