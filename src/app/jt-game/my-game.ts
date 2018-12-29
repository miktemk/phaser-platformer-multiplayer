import { AssetUrls } from "./asset-urls";
import * as _ from 'lodash';

export module AcousterGame {

  const nameof = <T>(name: keyof T) => name;

  export class ScrollerPlayerConfig {
    assetSprite: string;
    assetChunks: string;
    scaleFactor: number;
    bodyW: number;
    bodyH: number;
    bodyHSquat: number;
    keyLeft: Phaser.Key;
    keyRight: Phaser.Key;
    keyUp: Phaser.Key;
    keyDown: Phaser.Key;
    keyFire: Phaser.Key;
  }
  export class ScrollerPlayer {
    public sprite: Phaser.Sprite;
    private chunks: Phaser.Particles.Arcade.Emitter;
    private bulletTime: number;
    private isDead: boolean;
    private isSquatting: boolean;
    
    constructor(
      game: Phaser.Game,
      private bullets: Phaser.Group,
      private config: ScrollerPlayerConfig,
    ) {
      // player sprite
      const animDelay = 15;
      this.sprite = game.add.sprite(game.world.centerX, game.world.centerY, config.assetSprite, 'standing');
      this.sprite.animations.add('stand', ['standing'], 1, true);
      this.sprite.animations.add('squat', ['squat'], 1, true);
      this.sprite.animations.add('walk', ['walk1', 'walk2', 'walk3', 'walk4'], animDelay, true);
      this.sprite.animations.add('jump', ['jump1', 'jump2'], animDelay, true);
      this.sprite.animations.add('shoot', ['shoot1', 'shoot2', 'shoot3'], animDelay, false); // .onComplete.add(() => {});
      this.sprite.animations.add('jump-shoot', ['jump-shoot1', 'jump-shoot2', 'jump-shoot3'], animDelay, false);
      this.sprite.animations.add('death', ['death1', 'death2', 'death3'], animDelay, false).onComplete.add(() => {
        this.sprite.kill();
        this.chunks.position = this.sprite.position;
        this.chunks.start(true, 2000, null, 10);
      });
      this.sprite.anchor.setTo(0.5, 1);
      this.setBodyDims(config.bodyW, config.bodyH);
      this.sprite.scale.setTo(config.scaleFactor, config.scaleFactor);
      this.sprite.body.gravity.y = 1000;
      this.sprite.animations.play('stand');

      // player chunks
      this.chunks = game.add.emitter(0, 0, 10);
      this.chunks.makeParticles(config.assetChunks, ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6', 'chunk7', 'chunk8', 'chunk9', 'chunk10'], 10, false, false);
      const angleRange = 40;
      this.chunks.setAngle(-90 - angleRange/2, -90 + angleRange/2, 2000, 3000);
      this.chunks.scale = new Phaser.Point(0.25, 0.25);
      this.chunks.gravity = new Phaser.Point(0, 3000);

      // misc initialization
      this.bulletTime = game.time.now + 200;
    }

    private setBodyDims(bw: number, bh: number) {
      // NOTE: this code takes `anchor.setTo(0.5, 1);` and `scale` into account
      this.sprite.body.setSize(bw, bh, (this.sprite.width / this.sprite.scale.x -bw)/2, this.sprite.height / this.sprite.scale.y - bh);
    }

    update(game: Phaser.Game) {
      // .... handle keys
      if (!this.isDead) {
        if (this.config.keyLeft.isDown)
          this.sprite.body.velocity.x = -350;
        else if (this.config.keyRight.isDown)
          this.sprite.body.velocity.x = 350;
        else
          this.sprite.body.velocity.x = 0;
        if (this.config.keyUp.isDown && this.sprite.body.touching.down)
          this.sprite.body.velocity.y = -500;
        if (this.config.keyDown.isDown && this.sprite.body.touching.down) {
          this.isSquatting = true;
          this.sprite.body.velocity.x = 0;
        }
        else {
          this.isSquatting = false;
        }
        if (this.config.keyFire.isDown)
          this.fireBullets(game);
      }

      // .... handle visuals/animation/orientation
      if (this.isDead) {
        this.sprite.animations.play('death');
      }
      else if (this.config.keyFire.isDown) {
        if (!this.sprite.body.touching.down)
          this.sprite.animations.play('jump-shoot');
        else
          this.sprite.animations.play('shoot');
      }
      else if (!this.sprite.body.touching.down)
        this.sprite.animations.play('jump');
      else if (this.sprite.body.velocity.x != 0)
        this.sprite.animations.play('walk');
      else if (this.sprite.body.velocity.x == 0) {
        if (this.isSquatting)
          this.sprite.animations.play('squat');
        else
          this.sprite.animations.play('stand');
      }

      // TODO: bug here
      // if (this.sprite.animations.currentAnim.name == 'squat')
      //   this.setBodyDims(this.config.bodyW, this.config.bodyHSquat);
      // else
      //   this.setBodyDims(this.config.bodyW, this.config.bodyH);

      if (this.sprite.body.velocity.x < 0)
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      if (this.sprite.body.velocity.x > 0)
        this.sprite.scale.x = Math.abs(this.sprite.scale.x);
    }

    diePainfully() {
      this.isDead = true;
      this.sprite.body.velocity.y = -100;
    }

    respawn() {
      this.isDead = false;
      this.sprite.revive();
    }

    private fireBullets(game: Phaser.Game) {
      if (game.time.now > this.bulletTime) {
        var bullet = this.bullets.getFirstExists(false);
        if (bullet) {
          let sign = Math.sign(this.sprite.scale.x);
          bullet.reset(this.sprite.x + sign * 30, this.sprite.y - 75);
          bullet.body.velocity.x = sign * 500;
          this.bulletTime = game.time.now + 200;
        }
      }
    }
  }









  export class MyGameStateMain extends Phaser.State {

    walls: Phaser.Group;
    players: Phaser.Group;
    coins: Phaser.Group;
    enemies: Phaser.Group;
    bullets: Phaser.Group;
    playerz: ScrollerPlayer[] = [];
    
    preload(game: Phaser.Game) {
      game.load.image('rock', AssetUrls.rock);
      game.load.image('lava', AssetUrls.lava);
      game.load.image('platform1', AssetUrls.platform1);
      game.load.spritesheet('flame', AssetUrls.flame, 64, 128, 32);
      game.load.atlasJSONHash(
        'player1',
        AssetUrls.debugPlayerSprite.img,
        AssetUrls.debugPlayerSprite.json,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      game.load.atlasJSONHash(
        'player1-chunk',
        AssetUrls.debugPlayerSpriteChunk.img,
        AssetUrls.debugPlayerSpriteChunk.json,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
    }

    create(game: Phaser.Game) {
      game.stage.backgroundColor = "#c4ebff";

      // Start the Arcade physics system (for movements and collisions)
      game.physics.startSystem(Phaser.Physics.ARCADE);

      // Add the physics engine to all game objects
      game.world.enableBody = true;

      this.walls = game.add.group();
      this.players = game.add.group();
      this.coins = game.add.group();
      this.enemies = game.add.group();

      let platform1 = game.add.sprite(game.world.centerX, game.world.centerY + 100, 'platform1');
      platform1.anchor.setTo(0.5, 0);
      platform1.body.immovable = true;
      this.walls.add(platform1);

      let fire1 = game.add.sprite(game.world.centerX + 200, game.world.centerY + 100, 'flame');
      fire1.animations.add('flame', _.range(0, 31), 20, true);
      fire1.animations.play('flame');
      fire1.anchor.setTo(0.5, 0.85);
      this.enemies.add(fire1);

      let lava = game.add.sprite(game.world.centerX, game.world.centerY + 250, 'lava');
      lava.anchor.setTo(0.5, 0);
      lava.body.immovable = true;
      this.enemies.add(lava);

      this.bullets = game.add.group();
      this.bullets.enableBody = true;
      this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
      this.bullets.createMultiple(40, 'rock');
      this.bullets.setAll('anchor.x', 0.5);
      this.bullets.setAll('anchor.y', 0.5);
      this.bullets.setAll('scale.x', 0.4);
      this.bullets.setAll('scale.y', 0.4);
      this.bullets.setAll(nameof<Phaser.Sprite>('outOfBoundsKill'), true);
      this.bullets.setAll(nameof<Phaser.Sprite>('checkWorldBounds'), true);
      
      let player1 = new ScrollerPlayer(game, this.bullets, <ScrollerPlayerConfig> {
        assetSprite: 'player1',
        assetChunks: 'player1-chunk',
        scaleFactor: 0.2,
        bodyW: 200, // NOTE: size of each frame in spritesheet: 484 x 534
        bodyH: 500,
        bodyHSquat: 220,
        keyLeft: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
        keyRight: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
        keyUp: game.input.keyboard.addKey(Phaser.Keyboard.UP),
        keyDown: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        keyFire: game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR),
      });
      this.players.add(player1.sprite);
      this.playerz.push(player1);
      player1.sprite.position.setTo(game.world.centerX-200, game.world.centerY - 200);

    }

    update(game: Phaser.Game) {
      game.physics.arcade.collide(this.players, this.walls);
      // Call the 'takeCoin' function when the player takes a coin
      game.physics.arcade.overlap(this.players, this.coins, this.callback_takeCoin, null, this);
      // Call the 'restart' function when the player touches the enemy
      game.physics.arcade.overlap(this.players, this.enemies, this.callback_death, null, this);

      this.playerz.forEach(player => {
        player.update(game);
      });
    }

    render(game: Phaser.Game) {
      // game.debug.bodyInfo(this.player1, 32, 32);
      this.playerz.forEach(player => {
        // game.debug.body(player.sprite);
      });
    }

    callback_takeCoin(player: Phaser.Sprite, coin: Phaser.Sprite) {
      coin.kill();
      console.log(`coin!!!!!!`);
    }
    callback_death(player: Phaser.Sprite, lava: Phaser.Sprite) {
      let sPlayer = this.playerz.find(x => x.sprite == player);
      sPlayer.diePainfully();
    }

  }

  export class MyGame {
    game: Phaser.Game;
    constructor(parent: any) {
      let mainState = new MyGameStateMain();
      this.game = new Phaser.Game(800, 600, Phaser.CANVAS, parent, mainState);
    }
  }

  // export class SimpleGameCodepen {
  //   game: Phaser.Game;
  //   constructor() {
  //     let gameGlobals = <MyGameGlobals> {
  //       level: SampleDebugGameLevels[1],
  //     }
  //     let mainState = new MyGameStateMain(gameGlobals);
  //     this.game = new Phaser.Game(800, 600, Phaser.CANVAS, 'content', mainState); // LESSON: Phaser.CANVAS works in codepen, but Phaser.AUTO defaults to WEBGL for some reason and fails
  //   }
  // }

}

//======================= for codepen comment these lines... ===================================

export const MyGame = AcousterGame.MyGame;
export type MyGame = AcousterGame.MyGame;

//======================= ...and uncomment these lines ===================================

// window.onload = () => { new AcousterGame.SimpleGameCodepen(); };

// ... and also remove `export` from `export module AcousterGame `
// ... also codepen does not support this syntax: <ClassName> { ... }, so remove all `<RandomSidescrollingArtifactsConfig>`, etc
