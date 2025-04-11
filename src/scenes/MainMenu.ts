import { Scene } from 'phaser';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Add title
        this.add.text(400, 200, 'Ninja Game', {
            fontSize: '64px',
            color: '#fff'
        }).setOrigin(0.5);

        // Add play button
        const playButton = this.add.text(400, 300, 'Play', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#4a4a4a',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.scene.start('Game');
        });

        // Add level editor button
        const editorButton = this.add.text(400, 380, 'Level Editor', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#4a4a4a',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.scene.start('LevelEditor');
        });

        // Add hover effects
        [playButton, editorButton].forEach(button => {
            button.on('pointerover', () => {
                button.setStyle({ backgroundColor: '#666666' });
            });
            button.on('pointerout', () => {
                button.setStyle({ backgroundColor: '#4a4a4a' });
            });
        });
    }
}
