import { AssetUrls } from "./asset-urls";
import * as _ from 'lodash';

export module AcousterGame {

  const nameof = <T>(name: keyof T) => name;

  export class ScrollerPlayerConfig {
    assetSprite: string;
    assetChunks: string;
    assetChunkKeys: string[];
    scaleFactor: number;
    bodyW: number;
    bodyH: number;
    bodyHSquat: number;
    velocityX: number;
    velocityJump: number;
    respawnX: number;
    respawnY: number;
    gravity: number;
    keyLeft: Phaser.Key;
    keyRight: Phaser.Key;
    keyUp: Phaser.Key;
    keyDown: Phaser.Key;
    keyFire: Phaser.Key;
  }
  export class ScrollerPlayer {
    private readonly bulletTimeDelay = 300;

    public sprite: Phaser.Sprite;
    private chunks: Phaser.Particles.Arcade.Emitter;
    private bulletTime: number;
    private isDead: boolean;
    private isSquatting: boolean;
    
    constructor(
      private game: Phaser.Game,
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
        this.chunks.position.setTo(this.sprite.position.x, this.sprite.position.y);
        this.chunks.start(true, 2000, null, 10);
      });
      this.sprite.anchor.setTo(0.5, 1);
      this.setBodyDims(config.bodyW, config.bodyH);
      this.sprite.scale.setTo(config.scaleFactor, config.scaleFactor);
      this.sprite.body.gravity.y = config.gravity;
      this.sprite.animations.play('stand');
      this.sprite.position.setTo(config.respawnX, config.respawnY);

      // player chunks
      // TODO: 2913bc3d: move particle emitter creation to commons
      this.chunks = game.add.emitter(0, 0, 20);
      this.chunks.makeParticles(config.assetChunks, config.assetChunkKeys, 20, false, false);
      const angleRange = 40;
      this.chunks.setAngle(-90 - angleRange/2, -90 + angleRange/2, 2000, 3000);
      this.chunks.scale = new Phaser.Point(0.25, 0.25); // NOTE: 2913bc3d: scale seems to affect the speeds
      this.chunks.gravity = new Phaser.Point(0, 3000);

      // misc initialization
      this.sprite.body.collideWorldBounds = true;
      // this.sprite.body.onWorldBounds = true;
      this.bulletTime = game.time.now + this.bulletTimeDelay;
    }

    private setBodyDims(bw: number, bh: number) {
      // NOTE: this code takes `anchor.setTo(0.5, 1);` and `scale` into account
      this.sprite.body.setSize(bw, bh, (this.sprite.width / this.sprite.scale.x -bw)/2, this.sprite.height / this.sprite.scale.y - bh);
    }

    update(game: Phaser.Game) {

      if (!this.sprite.alive) {
        if (this.config.keyFire.isDown)
          this.respawn();
        return;
      }

      // .... handle keys
      if (!this.isDead) {
        if (this.config.keyLeft.isDown)
          this.sprite.body.velocity.x = -this.config.velocityX;
        else if (this.config.keyRight.isDown)
          this.sprite.body.velocity.x = this.config.velocityX;
        else
          this.sprite.body.velocity.x = 0;
        if (this.config.keyUp.isDown && this.sprite.body.touching.down)
          this.sprite.body.velocity.y = -this.config.velocityJump;
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
      if (this.sprite.animations.currentAnim.name == 'squat')
        this.setBodyDims(this.config.bodyW, this.config.bodyHSquat);
      else
        this.setBodyDims(this.config.bodyW, this.config.bodyH);

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
      this.bulletTime = this.game.time.now + this.bulletTimeDelay;
      this.sprite.position.setTo(this.config.respawnX, this.config.respawnY);
      this.sprite.revive();
    }

    private fireBullets(game: Phaser.Game) {
      if (game.time.now > this.bulletTime) {
        var bullet = this.bullets.getFirstExists(false);
        if (bullet) {
          let sign = Math.sign(this.sprite.scale.x);
          bullet.reset(this.sprite.x + sign * 45, this.sprite.y - 75);
          bullet.body.velocity.x = sign * 750;
          this.bulletTime = game.time.now + this.bulletTimeDelay;
        }
      }
    }
  }









  export class MyGameStateMain extends Phaser.State {

    walls: Phaser.Group;
    players: Phaser.Group;
    coins: Phaser.Group;
    enemies: Phaser.Group;
    monsters: Phaser.Group;
    bullets: Phaser.Group;
    playerz: ScrollerPlayer[] = [];
    explosions: Phaser.Group;
    lava: Phaser.TileSprite;
    chunksGenericMeat: Phaser.Particles.Arcade.Emitter;
    
    preload(game: Phaser.Game) {
      game.load.image('rock', AssetUrls.rock);
      game.load.image('lava', AssetUrls.lava);
      game.load.image('platform1', AssetUrls.platform1);
      game.load.spritesheet('flame', AssetUrls.flame, 64, 128, 32);
      game.load.spritesheet('explosion', AssetUrls.explosion, 192, 192, 20);
      game.load.atlasJSONHash(
        'player1',
        AssetUrls.playerMikhail.img, // CODE: dab4d273: code for real human sprites
        AssetUrls.playerMikhail.json,
        // AssetUrls.debugPlayerSprite.img,
        // AssetUrls.debugPlayerSprite.json,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      game.load.atlasJSONHash(
        'player2',
        AssetUrls.playerAdriana.img, // CODE: dab4d273: code for real human sprites
        AssetUrls.playerAdriana.json,
        // AssetUrls.debugPlayerSprite.imgBlue,
        // AssetUrls.debugPlayerSprite.json,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      // game.load.atlasJSONHash(
      //   'chunks-debug-sprite',
      //   AssetUrls.debugPlayerSprite.chunkImg,
      //   AssetUrls.debugPlayerSprite.chunkJson,
      //   Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      game.load.atlasJSONHash(
        'chunks-adriana',
        AssetUrls.playerAdriana.chunkImg,
        AssetUrls.playerAdriana.chunkJson,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      game.load.atlasJSONHash(
        'chunks-mikhail',
        AssetUrls.playerMikhail.chunkImg,
        AssetUrls.playerMikhail.chunkJson,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      game.load.atlasJSONHash(
        'dragon',
        AssetUrls.dragon.img800Red,
        AssetUrls.dragon.json800,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
      game.load.atlasJSONHash(
        'chunks-meat-steak',
        AssetUrls.meatSteaks.img,
        AssetUrls.meatSteaks.json,
        Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
    }

    create(game: Phaser.Game) {
      const playerGravity = 1500;
      const playerVelocityX = 350;
      const playerVelocityJump = 800;

      game.stage.backgroundColor = "#c4ebff";

      // Start the Arcade physics system (for movements and collisions)
      game.physics.startSystem(Phaser.Physics.ARCADE);

      // Add the physics engine to all game objects
      game.world.enableBody = true;

      this.walls = game.add.group();
      this.players = game.add.group();
      this.coins = game.add.group();
      this.enemies = game.add.group();
      this.monsters = game.add.group();

      this.addPlatform(game, 100, game.world.centerY + 150);
      this.addPlatform(game, game.world.width-100, game.world.centerY + 150);
      this.addPlatform(game, game.world.centerX, game.world.centerY);
      this.addPlatform(game, 50, game.world.centerY - 150);
      this.addPlatform(game, game.world.width-50, game.world.centerY - 150);

      this.addFire(game, game.world.centerX, game.world.centerY);

      this.lava = game.add.tileSprite(0, game.world.centerY + 250, 800, 100, 'lava');
      //this.lava.anchor.setTo(0.5, 0);
      this.lava.body.immovable = true;
      this.lava.fixedToCamera = true;

      this.enemies.add(this.lava);

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
      
      this.explosions = game.add.group();
      this.explosions.createMultiple(30, 'explosion');
      this.explosions.forEach(explosion => {
        explosion.scale.setTo(0.8, 0.8);
        explosion.anchor.setTo(0.5, 0.5);
        explosion.animations.add('kaboom', _.range(0, 20), 60, true);
      }, game);

      this.test_addDragon();

      // generic meat chunks
      // TODO: 2913bc3d: move particle emitter creation to commons
      this.chunksGenericMeat = game.add.emitter(0, 0, 40);
      this.chunksGenericMeat.makeParticles('chunks-meat-steak', _.range(1, 13).map(x => x + ''), 40, false, false);
      const angleRange = 40;
      this.chunksGenericMeat.setAngle(-90 - angleRange/2, -90 + angleRange/2, 500, 700); // NOTE: 2913bc3d: scale seems to affect the speeds
      this.chunksGenericMeat.gravity = new Phaser.Point(0, 700);


      
      // this.chunks.makeParticles(config.assetChunks, , 20, false, false); // CODE for satlas-debug-sprite-chunk
      let player1 = new ScrollerPlayer(game, this.bullets, <ScrollerPlayerConfig> {
        assetSprite: 'player1',
        assetChunks: 'chunks-mikhail',
        // assetChunkKeys: ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6', 'chunk7', 'chunk8', 'chunk9', 'chunk10'], // CODE: dab4d273: code for debug sprite
        assetChunkKeys: ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6', 'chunk7', 'meat1', 'meat2', 'meat3', 'meat4', 'meat5', 'meat6', 'meat7', 'meat8', 'meat9'],
        scaleFactor: 0.12, // CODE: dab4d273: code for real human sprites
        // scaleFactor: 0.2,
        // bodyW: 200, // NOTE: size of each frame in spritesheet: 484 x 534
        // bodyH: 500,
        // bodyHSquat: 220,
        bodyW: 250, // CODE: dab4d273: code for real human sprites
        bodyH: 700,
        bodyHSquat: 320,
        gravity: playerGravity,
        velocityX: playerVelocityX,
        velocityJump: playerVelocityJump,
        respawnX: game.world.centerX - 300,
        respawnY: game.world.centerY - 200,
        keyLeft: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
        keyRight: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
        keyUp: game.input.keyboard.addKey(Phaser.Keyboard.UP),
        keyDown: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        keyFire: game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR),
      });
      this.players.add(player1.sprite);
      this.playerz.push(player1);

      let player2 = new ScrollerPlayer(game, this.bullets, <ScrollerPlayerConfig> {
        assetSprite: 'player2',
        assetChunks: 'chunks-adriana',
        // assetChunkKeys: ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6', 'chunk7', 'chunk8', 'chunk9', 'chunk10'], // CODE: dab4d273: code for debug sprite
        assetChunkKeys: ['ad-chunk1', 'ad-chunk2', 'ad-chunk3', 'ad-chunk4', 'ad-chunk5', 'ad-chunk6', 'ad-chunk7-head2', 'ad-chunk8', 'meat1', 'meat2', 'meat3', 'meat4', 'meat5', 'meat6', 'meat7', 'meat8', 'meat9'],
        scaleFactor: 0.12, // CODE: dab4d273: code for real human sprites
        // scaleFactor: 0.2,
        // bodyW: 200, // NOTE: size of each frame in spritesheet: 484 x 534
        // bodyH: 500,
        // bodyHSquat: 220,
        bodyW: 250, // CODE: dab4d273: code for real human sprites
        bodyH: 700,
        bodyHSquat: 320,
        gravity: playerGravity,
        velocityX: playerVelocityX,
        velocityJump: playerVelocityJump,
        respawnX: game.world.centerX - 300,
        respawnY: game.world.centerY,
        
        // test on computer
        keyLeft: game.input.keyboard.addKey(Phaser.Keyboard.A),
        keyRight: game.input.keyboard.addKey(Phaser.Keyboard.D),
        keyUp: game.input.keyboard.addKey(Phaser.Keyboard.W),
        keyDown: game.input.keyboard.addKey(Phaser.Keyboard.S),
        keyFire: game.input.keyboard.addKey(Phaser.Keyboard.Q),

        // alphagrip
        // keyLeft: game.input.keyboard.addKey(Phaser.Keyboard.C),
        // keyRight: game.input.keyboard.addKey(Phaser.Keyboard.Y),
        // keyUp: game.input.keyboard.addKey(Phaser.Keyboard.Z),
        // keyDown: game.input.keyboard.addKey(Phaser.Keyboard.K),
        // keyFire: game.input.keyboard.addKey(Phaser.Keyboard.H),
      });
      this.players.add(player2.sprite);
      this.playerz.push(player2);

      const ySkyAboveBounds = 500;
      // this.game.world.setBounds(0, -ySkyAboveBounds, 8000, this.game.height + ySkyAboveBounds);
      this.game.world.setBounds(0, -ySkyAboveBounds, this.game.width, this.game.height + ySkyAboveBounds);
    }
    test_addDragon() {
      const animFrameRate = 10;
      const animFrameRateDeath = 50;
      // let sprite = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'lava');
      let sprite = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'dragon', 'idle');
      sprite.animations.add('sit', ['idle'], 1, true);
      sprite.animations.add('attack', ['attack1', 'attack2', 'attack3', 'attack4', 'attack5'], animFrameRate, true);
      sprite.animations.add('fly', ['fly1', 'fly2'], animFrameRate, true);
      sprite.animations.add('death', ['attack1', 'attack2', 'attack1', 'attack2', 'attack1', 'attack2'], animFrameRateDeath, false);
      sprite.animations.play('attack');
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(0.6, 0.6);
      sprite.health = 1;
      // TODO: 4a3e03b6: dragon TMP!!!!
      const bw = 200;
      const bh = 200;
      sprite.body.setSize(bw, bh, (sprite.width / sprite.scale.x - bw)/2, sprite.height / sprite.scale.y - bh);
      this.monsters.add(sprite);
    }

    update(game: Phaser.Game) {
      game.physics.arcade.collide(this.players, this.walls);
      game.physics.arcade.overlap(this.players, this.coins, (player: Phaser.Sprite, coin: Phaser.Sprite) => {
        coin.kill();
        console.log(`TODO: coin!!!!!!`);
      }, null, game);
      game.physics.arcade.overlap(this.players, this.enemies, (player: Phaser.Sprite, lava: Phaser.Sprite) => {
        let sPlayer = this.playerz.find(x => x.sprite == player);
        sPlayer.diePainfully();
      }, null, game);
      game.physics.arcade.overlap(this.players, this.monsters, (player: Phaser.Sprite, lava: Phaser.Sprite) => {
        let sPlayer = this.playerz.find(x => x.sprite == player);
        sPlayer.diePainfully();
      }, null, game);
      game.physics.arcade.overlap(this.bullets, this.walls, (bullet: Phaser.Sprite, wall: Phaser.Sprite) => {
        bullet.kill();
        this.kaboomHere(bullet.x, bullet.y);
      }, null, game);
      game.physics.arcade.overlap(this.players, this.bullets, (player: Phaser.Sprite, bullet: Phaser.Sprite) => {
        bullet.kill();
        this.kaboomHere(bullet.x, bullet.y);
        let sPlayer = this.playerz.find(x => x.sprite == player);
        sPlayer.diePainfully();
      }, null, game);
      game.physics.arcade.overlap(this.monsters, this.bullets, (monster: Phaser.Sprite, bullet: Phaser.Sprite) => {
        bullet.kill();
        this.kaboomHere(bullet.x, bullet.y);
        monster.health--;
        if (monster.health == 0) {
          this.monsterDiesInAgony(monster);
        }
      }, null, game);

      this.playerz.forEach(player => {
        player.update(game);
      });

      // this.game.camera.x += 1;
      // console.log(this.game.camera.x);
      this.lava.tilePosition.x = -1.1 * this.game.camera.x;
    }

    monsterDiesInAgony(monster: Phaser.Sprite) {
      monster.animations.play('death').onComplete.addOnce(() => {
        monster.kill();
        this.chunksGenericMeat.position.setTo(monster.position.x, monster.position.y);
        this.chunksGenericMeat.start(true, 2000, null, 8);
        // let sMonster = this.monsterz.find(x => x.sprite == player);
        // sMonster.diePainfully();
      });
    }
    
    render(game: Phaser.Game) {
      // this.playerz.forEach(player => {
      //   game.debug.body(player.sprite);
      // });
      // this.enemies.children.forEach(sss => {
      //   game.debug.body(sss as Phaser.Sprite);
      // });
      // this.bullets.children.forEach(sss => {
      //   game.debug.body(sss as Phaser.Sprite);
      // });
      // this.monsters.children.forEach(sss => {
      //   game.debug.body(sss as Phaser.Sprite);
      // });
    }

    //----------------------------------------------------------------------------------------------------

    private addPlatform(game: Phaser.Game, x: number, y: number) {
      let platform1 = game.add.sprite(x, y, 'platform1');
      platform1.scale.setTo(0.5, 0.5);
      platform1.anchor.setTo(0.5, 0);
      platform1.body.immovable = true;
      this.walls.add(platform1);
    }

    private addFire(game: Phaser.Game, x: number, y: number): any {
      let fire1 = game.add.sprite(x, y, 'flame');
      fire1.animations.add('flame', _.range(0, 31), 20, true);
      fire1.animations.play('flame');
      fire1.anchor.setTo(0.5, 0.85);
      fire1.body.setSize(50, 80, 10, 40);
      this.enemies.add(fire1);
    }

    private kaboomHere(x: number, y: number): any {
      var explosion = this.explosions.getFirstExists(false);
      explosion.reset(x, y);
      explosion.play('kaboom', 30, false, true);
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
