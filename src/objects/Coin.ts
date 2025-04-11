class Coin extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'coin');
        
        // Add the coin to the scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this, true);  // true makes it a static body
        
        // Set the coin's scale and alpha for a glowing effect
        this.setScale(0.5);
        this.setAlpha(0.8);
        
        // Add a subtle pulsing effect
        scene.tweens.add({
            targets: this,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    collect() {
        // Play collection animation with a more dramatic effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 1.2,
            duration: 200,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.destroy();
            }
        });
        
        // Disable physics and collision
        if (this.body) {
            this.body.enable = false;
        }
    }
}

export { Coin };