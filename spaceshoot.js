let score = 0, lives = 3, gameOver = false;
let playerSpeed = 5, shootMode = "single", asteroidDelay = 1500;

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload, create, update }
};
const game = new Phaser.Game(config);

let player, cursors, bullets, asteroids, stars, shootKey, lastShootTime = 0, asteroidTimer, powerups;
let mobileLeft = false, mobileRight = false, mobileShoot = false;

function preload() {
    this.load.image('playerShip', 'assets/spaceship.png');
    this.load.image('asteroid', 'assets/asteroid.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('heartBuff', 'assets/heart.png');
    this.load.image('speedBuff', 'assets/fast.png');
    this.load.image('doubleBuff', 'assets/more.png');
}

function create() {
    const { width, height } = this.sys.game.canvas;

    const gfxP = this.add.graphics();
    gfxP.fillStyle(0xffffff, 1);
    gfxP.fillCircle(3, 3, 3);
    gfxP.generateTexture('particle', 6, 6);
    gfxP.destroy();

    stars = this.add.group();
    for (let i = 0; i < 150; i++) {
        stars.add(this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 1, 0xffffff, 0.8));
    }

    player = this.physics.add.sprite(width / 2, height - 100, 'playerShip')
        .setScale(0.12)
        .setOrigin(0.5)
        .setCollideWorldBounds(true);

    bullets = this.physics.add.group();
    asteroids = this.physics.add.group();
    powerups = this.physics.add.group();

    cursors = this.input.keyboard.createCursorKeys();
    shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    asteroidTimer = this.time.addEvent({
        delay: asteroidDelay, callback: spawnAsteroid, callbackScope: this, loop: true
    });

    this.time.addEvent({ delay: 10000, callback: spawnPowerup, callbackScope: this, loop: true });

    this.physics.add.overlap(bullets, asteroids, hitAsteroid, null, this);
    this.physics.add.overlap(player, asteroids, hitPlayer, null, this);
    this.physics.add.overlap(player, powerups, takePowerup, null, this);

    document.getElementById("btn-left").addEventListener("touchstart", () => mobileLeft = true);
    document.getElementById("btn-left").addEventListener("touchend", () => mobileLeft = false);

    document.getElementById("btn-right").addEventListener("touchstart", () => mobileRight = true);
    document.getElementById("btn-right").addEventListener("touchend", () => mobileRight = false);

    document.getElementById("btn-shoot").addEventListener("touchstart", () => mobileShoot = true);
    document.getElementById("btn-shoot").addEventListener("touchend", () => mobileShoot = false);

    this.time.addEvent({
        delay: 15000,
        callback: () => {
            if (asteroidDelay > 400) {
                asteroidDelay -= 200;
                asteroidTimer.remove();
                asteroidTimer = this.time.addEvent({ delay: asteroidDelay, callback: spawnAsteroid, callbackScope: this, loop: true });
            }
        },
        loop: true
    });
}

function update(time) {
    if (gameOver) return;
    if (cursors.left.isDown || mobileLeft) player.x -= playerSpeed;
    else if (cursors.right.isDown || mobileRight) player.x += playerSpeed;
    player.x = Phaser.Math.Clamp(player.x, 20, this.sys.game.canvas.width - 20);
    if (shootKey.isDown && time > lastShootTime + 250 || mobileShoot && time > lastShootTime + 250 ) { shoot(this); lastShootTime = time; }
    stars.children.entries.forEach(s => { s.y += 1; if (s.y > this.sys.game.canvas.height) { s.y = 0; s.x = Phaser.Math.Between(0, this.sys.game.canvas.width); } });
    asteroids.children.each(a => { if (a.active) this.physics.moveToObject(a, player, 100); });
    bullets.children.each(b => { if (b.y < -50) b.destroy(); });
    asteroids.children.each(a => { if (a.y > this.sys.game.canvas.height + 200) a.destroy(); });
    powerups.children.each(p => { if (p.y > this.sys.game.canvas.height + 200) p.destroy(); });
}

//SHOOT
function shoot(scene) {
    if (shootMode === "single") {
        const bullet = bullets.create(player.x, player.y - (player.displayHeight * 0.5) - 6, 'bullet')
            .setScale(0.12).setOrigin(0.5);
        bullet.body.setVelocity(0, -600);
    } else {
        const b1 = bullets.create(player.x - 12, player.y - (player.displayHeight * 0.5) - 6, 'bullet').setScale(0.12).setOrigin(0.5);
        const b2 = bullets.create(player.x + 12, player.y - (player.displayHeight * 0.5) - 6, 'bullet').setScale(0.12).setOrigin(0.5);
        b1.body.setVelocity(-100, -600);
        b2.body.setVelocity(100, -600);
    }
}

//SPAWN ASTEROID
function spawnAsteroid() {
    if (gameOver) return;
    const x = Phaser.Math.Between(50, this.sys.game.canvas.width - 50);
    const a = asteroids.create(x, -50, 'asteroid').setScale(0.12).setOrigin(0.5);
    // opcional: ajustar el body size para que coincida con displaySize
    if (a.body && a.displayWidth && a.displayHeight) {
        a.body.setSize(Math.round(a.displayWidth), Math.round(a.displayHeight));
        a.body.setOffset(Math.round(-a.displayWidth / 2 + a.width / 2), Math.round(-a.displayHeight / 2 + a.height / 2));
    }
}

//SPAWN BUFFS
function spawnPowerup() {
    if (gameOver) return;
    const x = Phaser.Math.Between(60, this.sys.game.canvas.width - 60);
    const type = Phaser.Math.RND.pick(['heartBuff', 'speedBuff', 'doubleBuff']);
    const buff = powerups.create(x, -30, type).setScale(0.12).setOrigin(0.5);
    buff.setData('type', type);
    buff.body.setVelocity(0, 120);
    this.tweens.add({ targets: buff, angle: 360, duration: 2000, repeat: -1 });
    this.tweens.add({ targets: buff, alpha: { from: 1, to: 0.5 }, duration: 700, yoyo: true, repeat: -1 });
}

//IMPACT ASTEROID
function hitAsteroid(bullet, asteroid) {
    const center = asteroid.getCenter ? asteroid.getCenter() : { x: asteroid.x, y: asteroid.y };
    const x = center.x, y = center.y;

    const particles = this.add.particles('particle');
    const emitter = particles.createEmitter({
        speed: { min: 100, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500
    });

    emitter.explode(18, x, y);

    this.time.delayedCall(400, () => {
        if (particles && particles.destroy) particles.destroy();
    });

    if (bullet && bullet.destroy) bullet.destroy();
    if (asteroid && asteroid.destroy) asteroid.destroy();

    score += 10;
    document.getElementById('score').textContent = score;
}

//TAKE DAMAGE
function hitPlayer(pl, asteroid) {
    if (gameOver) return;
    const center = pl.getCenter ? pl.getCenter() : { x: pl.x, y: pl.y };
    const particles = this.add.particles('particle');
    const emitter = particles.createEmitter({
        speed: { min: 100, max: 220 }, angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 }, lifespan: 700
    });
    emitter.explode(25, center.x, center.y);
    this.time.delayedCall(500, () => { if (particles && particles.destroy) particles.destroy(); });

    asteroid.destroy();
    lives--;
    document.getElementById('lives').textContent = lives;
    if (lives <= 0) endGame(this);
}

//TAKE BUFFS
function takePowerup(pl, buff) {
    const type = buff.getData('type');
    buff.destroy();
    if (type === 'heartBuff') {
        lives = Math.min(lives + 1, 3);
        document.getElementById('lives').textContent = lives;
    } else if (type === 'speedBuff') {
        playerSpeed = 9;
        this.time.delayedCall(5000, () => playerSpeed = 5);
    } else if (type === 'doubleBuff') {
        shootMode = 'double';
        this.time.delayedCall(7000, () => shootMode = 'single');
    }
}

//GAME OVER
function endGame(scene) {
    gameOver = true;
    if (asteroidTimer) asteroidTimer.remove();

    scene.add.text(scene.sys.game.canvas.width / 2, scene.sys.game.canvas.height / 2 - 50,
        'GAME OVER', { fontSize: '64px', color: '#ff0000' }).setOrigin(0.5);

    const restartBtn = scene.add.text(scene.sys.game.canvas.width / 2, scene.sys.game.canvas.height / 2 + 50,
        'RESTART', { fontSize: '28px', backgroundColor: '#00f3ff', color: '#000', padding: { x: 18, y: 10 } })
        .setOrigin(0.5).setInteractive();

    restartBtn.on('pointerdown', () => {
        score = 0; lives = 3; playerSpeed = 5; shootMode = 'single'; asteroidDelay = 1500;
        document.getElementById('score').textContent = score;
        document.getElementById('lives').textContent = lives;
        gameOver = false;
        scene.scene.restart();
    });
}