// ========================================
// ゲームメインロジック
// ========================================

const Game = {
    // キャンバス関連
    canvas: null,
    ctx: null,

    // ゲーム状態
    running: false,
    paused: false,
    gameOver: false,

    // 難易度設定
    difficulty: 'normal',
    difficultySettings: {
        easy: {
            blockSpeed: 0.05,
            highHpRatio: 0.1,
            maxOrbs: 200,  // オーブ保有上限
            label: '簡単'
        },
        normal: {
            blockSpeed: 0.06,
            highHpRatio: 0.2,
            maxOrbs: 200,
            label: '普通'
        },
        hard: {
            blockSpeed: 0.07,
            highHpRatio: 0.3,
            maxOrbs: 200,
            label: '難しい'
        },
        extreme: {
            blockSpeed: 0.08,
            highHpRatio: 0.4,
            maxOrbs: 200,
            label: '極み'
        }
    },

    // プレイヤー
    player: {
        hp: 3,
        maxHp: 3,
        score: 0,
        orbs: 0
    },

    // スキルコスト・パラメータ
    skillCosts: {
        penetrate: 30,
        explode: 50,
        barExplode: 100,         // バー爆破スキルコスト
        barExplodeRange: 6       // バー爆破の範囲（ブロック数）
    },

    // ゲームオブジェクト
    paddle: null,
    balls: [],
    blocks: [],
    orbs: [],
    explosions: [],

    // ブロック設定
    blockRows: 5,
    blockCols: 10,
    blockWidth: 0,
    blockHeight: 30,
    blockPadding: 4,

    // 入力状態
    keys: {
        left: false,
        right: false
    },
    mouseX: 0,
    useMouseControl: true,

    // ブロック生成タイマー
    blockSpawnTimer: 0,
    blockSpawnInterval: 180, // フレーム数

    /**
     * ゲームを初期化
     */
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupInputHandlers();
        this.setupUICallbacks();
    },

    /**
     * キャンバスサイズを調整
     */
    resizeCanvas() {
        const gameScreen = document.getElementById('game-screen');
        const hud = document.getElementById('game-hud');
        const skillBar = document.getElementById('skill-bar');

        this.canvas.width = gameScreen.clientWidth;
        this.canvas.height = gameScreen.clientHeight - hud.clientHeight - skillBar.clientHeight;

        // ブロック幅を再計算
        this.blockWidth = (this.canvas.width - this.blockPadding * (this.blockCols + 1)) / this.blockCols;
    },

    /**
     * 入力ハンドラを設定
     */
    setupInputHandlers() {
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.keys.left = true;
                this.useMouseControl = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.keys.right = true;
                this.useMouseControl = false;
            }
            if (e.key === 'Escape') {
                this.togglePause();
            }
            if ((e.key === ' ' || e.key === 'e' || e.key === 'E') && !this.paused && !this.gameOver) {
                // スペース/Eキーで爆破発動
                this.activateExplodeSkill();
            }
            if ((e.key === 'q' || e.key === 'Q') && !this.paused && !this.gameOver) {
                // Qキーで貫通発動
                this.activatePenetrateSkill();
            }
            if ((e.key === 'r' || e.key === 'R') && !this.paused && !this.gameOver) {
                // Rキーでバー爆破発動
                this.activateBarExplodeSkill();
            }
            if ((e.key === 'c' || e.key === 'C') && !this.paused && !this.gameOver) {
                // Cキーでスキル待機解除
                this.cancelSkill();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.keys.left = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.keys.right = false;
            }
        });

        // マウス入力
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.useMouseControl = true;
        });

        // タッチ入力
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.touches[0].clientX - rect.left;
            this.useMouseControl = true;
        }, { passive: false });
    },

    /**
     * UIコールバックを設定
     */
    setupUICallbacks() {
        UI.setupEventListeners({
            onDifficultySelect: (difficulty) => this.startGame(difficulty),
            onPause: () => this.togglePause(),
            onResume: () => this.resumeGame(),
            onRestart: () => this.restartGame(),
            onToStart: () => this.returnToStart(),
            onExit: () => this.exitGame(),
            onSkillPenetrate: () => this.activatePenetrateSkill(),
            onSkillExplode: () => this.activateExplodeSkill(),
            onSkillBarExplode: () => this.activateBarExplodeSkill(),
            onSkillCancel: () => this.cancelSkill()
        });
    },

    /**
     * ゲームを開始
     */
    startGame(difficulty) {
        // 既存のゲームループを停止
        this.running = false;

        this.difficulty = difficulty;
        this.resetGameState();

        UI.showScreen('game');
        UI.hideAllOverlays();
        UI.updateDifficultyBadge(difficulty);

        this.resizeCanvas();
        this.createInitialBlocks();
        this.createPaddle();
        this.createBall();

        this.paused = false;
        this.gameOver = false;

        // 少し遅延して新しいループを開始（前のループが確実に終了するのを待つ）
        setTimeout(() => {
            this.running = true;
            this.gameLoop();
        }, 50);
    },

    /**
     * ゲーム状態をリセット
     */
    resetGameState() {
        this.player = {
            hp: 10,
            maxHp: 10,
            score: 0,
            orbs: 0
        };

        this.blocks = [];
        this.balls = [];
        this.orbs = [];
        this.explosions = [];
        this.blockSpawnTimer = 0;

        UI.updateHP(this.player.hp, this.player.maxHp);
        UI.updateScore(this.player.score);
        UI.updateOrbs(this.player.orbs);
    },

    /**
     * 初期ブロックを生成
     */
    createInitialBlocks() {
        const settings = this.difficultySettings[this.difficulty];

        for (let row = 0; row < this.blockRows; row++) {
            for (let col = 0; col < this.blockCols; col++) {
                const x = this.blockPadding + col * (this.blockWidth + this.blockPadding);
                const y = this.blockPadding + row * (this.blockHeight + this.blockPadding);

                // HPを決定
                let hp = 1;
                const rand = Math.random();

                if (rand < settings.highHpRatio * 0.2) {
                    hp = 5;
                } else if (rand < settings.highHpRatio * 0.4) {
                    hp = 4;
                } else if (rand < settings.highHpRatio * 0.7) {
                    hp = 3;
                } else if (rand < settings.highHpRatio) {
                    hp = 2;
                }

                this.blocks.push(new Block(x, y, this.blockWidth, this.blockHeight, hp));
            }
        }
    },

    /**
     * 新しいブロック行を生成
     */
    spawnNewBlockRow() {
        const settings = this.difficultySettings[this.difficulty];

        for (let col = 0; col < this.blockCols; col++) {
            const x = this.blockPadding + col * (this.blockWidth + this.blockPadding);
            const y = -this.blockHeight;

            // HPを決定
            let hp = 1;
            const rand = Math.random();

            if (rand < settings.highHpRatio * 0.2) {
                hp = 5;
            } else if (rand < settings.highHpRatio * 0.4) {
                hp = 4;
            } else if (rand < settings.highHpRatio * 0.7) {
                hp = 3;
            } else if (rand < settings.highHpRatio) {
                hp = 2;
            }

            this.blocks.push(new Block(x, y, this.blockWidth, this.blockHeight, hp));
        }
    },

    /**
     * パドルを作成
     */
    createPaddle() {
        const paddleWidth = 120;
        const paddleHeight = 15;
        const x = (this.canvas.width - paddleWidth) / 2;
        const y = this.canvas.height - paddleHeight - 20;

        this.paddle = new Paddle(x, y, paddleWidth, paddleHeight);
    },

    /**
     * ボールを作成
     */
    createBall() {
        const ball = new Ball(
            this.canvas.width / 2,
            this.canvas.height - 60,
            8
        );
        this.balls.push(ball);
    },

    /**
     * メインゲームループ
     */
    gameLoop() {
        if (!this.running) return;

        if (!this.paused && !this.gameOver) {
            this.update();
        }

        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    },

    /**
     * ゲーム更新
     */
    update() {
        this.updatePaddle();
        this.updateBalls();
        this.updateBlocks();
        this.updateOrbs();
        this.updateExplosions();
        this.spawnBlocks();
        this.checkGameOver();
        this.updateUI();
    },

    /**
     * パドル更新
     */
    updatePaddle() {
        if (this.useMouseControl) {
            this.paddle.moveTo(this.mouseX, this.canvas.width);
        } else {
            if (this.keys.left) {
                this.paddle.moveLeft(this.canvas.width);
            }
            if (this.keys.right) {
                this.paddle.moveRight(this.canvas.width);
            }
        }
    },

    /**
     * ボール更新
     */
    updateBalls() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            ball.update();

            // 壁との衝突
            if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= this.canvas.width) {
                ball.dx = -ball.dx;
                ball.x = Math.max(ball.radius, Math.min(this.canvas.width - ball.radius, ball.x));
            }

            // 天井との衝突
            if (ball.y - ball.radius <= 0) {
                ball.dy = -ball.dy;
                ball.y = ball.radius;
            }

            // 床との衝突（ダメージ）
            if (ball.y + ball.radius >= this.canvas.height) {
                this.player.hp--;
                UI.updateHP(this.player.hp, this.player.maxHp);

                if (this.balls.length > 1) {
                    this.balls.splice(i, 1);
                } else {
                    // ボールをリセット
                    ball.x = this.paddle.x + this.paddle.width / 2;
                    ball.y = this.paddle.y - 20;
                    ball.dy = -Math.abs(ball.dy);
                    ball.penetrating = false;
                    ball.explodable = false;
                }
                continue;
            }

            // パドルとの衝突
            this.checkBallPaddleCollision(ball);

            // ブロックとの衝突
            this.checkBallBlockCollisions(ball);
        }
    },

    /**
     * ボールとパドルの衝突判定
     */
    checkBallPaddleCollision(ball) {
        const paddleBounds = this.paddle.getBounds();

        if (
            ball.y + ball.radius >= paddleBounds.top &&
            ball.y - ball.radius <= paddleBounds.bottom &&
            ball.x >= paddleBounds.left &&
            ball.x <= paddleBounds.right &&
            ball.dy > 0
        ) {
            // 衝突位置に応じて角度を変更
            const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
            const angle = (hitPos - 0.5) * Math.PI * 0.7;

            ball.dx = ball.speed * Math.sin(angle);
            ball.dy = -ball.speed * Math.cos(angle);
            ball.normalizeSpeed();

            ball.y = paddleBounds.top - ball.radius;

            // パドルが強化状態の場合
            if (this.paddle.enhanced) {
                if (this.paddle.enhanceType === 'penetrate') {
                    ball.enablePenetrate();
                } else if (this.paddle.enhanceType === 'explode') {
                    ball.enableExplode();
                }
                this.paddle.clearEnhance();
                UI.setSkillActive('penetrate', false);
                UI.setSkillActive('explode', false);
            }
        }
    },

    /**
     * ボールとブロックの衝突判定
     */
    checkBallBlockCollisions(ball) {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.destroyed) continue;

            const bounds = block.getBounds();

            // 衝突判定
            const closestX = Math.max(bounds.left, Math.min(ball.x, bounds.right));
            const closestY = Math.max(bounds.top, Math.min(ball.y, bounds.bottom));

            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const distance = Math.sqrt(distX * distX + distY * distY);

            if (distance < ball.radius) {
                // 貫通状態でない場合は反射
                if (!ball.penetrating) {
                    // 衝突面を判定して反射
                    const fromLeft = ball.x < bounds.left;
                    const fromRight = ball.x > bounds.right;
                    const fromTop = ball.y < bounds.top;
                    const fromBottom = ball.y > bounds.bottom;

                    if (fromLeft || fromRight) {
                        ball.dx = -ball.dx;
                    }
                    if (fromTop || fromBottom) {
                        ball.dy = -ball.dy;
                    }
                }

                // ダメージ処理
                let damage = 1;
                if (ball.penetrating) {
                    damage = block.maxHp; // 貫通時は一撃破壊
                    ball.usePenetrate();
                }

                const destroyed = block.takeDamage(damage);

                if (destroyed) {
                    this.onBlockDestroyed(block, i);
                }

                // 貫通でない場合は1つのブロックで停止
                if (!ball.penetrating) {
                    break;
                }
            }
        }
    },

    /**
     * ブロック破壊時の処理
     */
    onBlockDestroyed(block, index) {
        this.blocks.splice(index, 1);

        // スコア加算
        const scoreGain = block.maxHp * 100;
        this.player.score += scoreGain;

        // オーブドロップ判定
        if (Math.random() < 0.3) {
            const orb = new Orb(block.x + block.width / 2, block.y + block.height / 2);
            this.orbs.push(orb);
        }
    },

    /**
     * ブロック更新
     */
    updateBlocks() {
        const settings = this.difficultySettings[this.difficulty];

        for (const block of this.blocks) {
            if (!block.destroyed) {
                block.y += settings.blockSpeed;
            }
        }
    },

    /**
     * 新しいブロックを生成
     * blockSpeedに基づいて生成間隔を自動計算
     */
    spawnBlocks() {
        const settings = this.difficultySettings[this.difficulty];

        // ブロック1行分の距離を移動する時間で生成間隔を計算
        // これにより、速度が変わってもブロックの間隔が一定に保たれる
        const blockRowDistance = this.blockHeight + this.blockPadding;
        const spawnInterval = Math.floor(blockRowDistance / settings.blockSpeed);

        this.blockSpawnTimer++;

        if (this.blockSpawnTimer >= spawnInterval) {
            this.blockSpawnTimer = 0;
            this.spawnNewBlockRow();
        }
    },

    /**
     * オーブ更新
     */
    updateOrbs() {
        const settings = this.difficultySettings[this.difficulty];

        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            orb.update();

            // パドルとの衝突
            if (orb.checkCollisionWithPaddle(this.paddle)) {
                this.player.orbs += orb.value;
                // オーブ上限を適用
                if (this.player.orbs > settings.maxOrbs) {
                    this.player.orbs = settings.maxOrbs;
                }
                this.orbs.splice(i, 1);
                continue;
            }

            // 画面外に出たら削除
            if (orb.y > this.canvas.height + orb.radius) {
                this.orbs.splice(i, 1);
            }
        }
    },

    /**
     * 爆発エフェクト更新
     */
    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.update();

            if (explosion.finished) {
                this.explosions.splice(i, 1);
            }
        }
    },

    /**
     * ゲームオーバー判定
     */
    checkGameOver() {
        // HP が 0
        if (this.player.hp <= 0) {
            this.triggerGameOver();
            return;
        }

        // ブロックが画面下またはパドルに到達
        for (const block of this.blocks) {
            if (block.destroyed) continue;

            if (block.y + block.height >= this.paddle.y) {
                this.triggerGameOver();
                return;
            }
        }
    },

    /**
     * ゲームオーバーを発動
     */
    triggerGameOver() {
        this.gameOver = true;
        UI.showFinalScore(this.player.score);
        UI.showOverlay('gameover');
    },

    /**
     * UI更新
     */
    updateUI() {
        const settings = this.difficultySettings[this.difficulty];
        UI.updateScore(this.player.score);
        UI.updateOrbs(this.player.orbs, settings.maxOrbs);

        const ballExplodable = this.balls.some(b => b.explodable);
        UI.updateSkillButtons(
            this.player.orbs,
            this.skillCosts.penetrate,
            this.skillCosts.explode,
            this.skillCosts.barExplode,
            this.paddle.enhanced,
            ballExplodable
        );
    },

    /**
     * 描画
     */
    draw() {
        // 背景クリア
        this.ctx.fillStyle = 'rgba(10, 10, 26, 1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // グリッド背景
        this.drawGrid();

        // 爆発エフェクト
        for (const explosion of this.explosions) {
            explosion.draw(this.ctx);
        }

        // ブロック
        for (const block of this.blocks) {
            block.draw(this.ctx);
        }

        // オーブ
        for (const orb of this.orbs) {
            orb.draw(this.ctx);
        }

        // パドル
        if (this.paddle) {
            this.paddle.draw(this.ctx);
        }

        // ボール
        for (const ball of this.balls) {
            ball.draw(this.ctx);
        }
    },

    /**
     * グリッド背景を描画
     */
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        const gridSize = 40;

        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    },

    /**
     * スキル待機状態を解除
     * パドルの状態をリセットし、消費オーブの半額を返却
     */
    cancelSkill() {
        if (!this.paddle.enhanced) return; // 待機状態でなければ何もしない

        // 消費オーブの半額を返却
        const enhanceType = this.paddle.enhanceType;
        if (enhanceType === 'penetrate') {
            this.player.orbs += Math.floor(this.skillCosts.penetrate / 2);
            UI.setSkillActive('penetrate', false);
        } else if (enhanceType === 'explode') {
            this.player.orbs += Math.floor(this.skillCosts.explode / 2);
            UI.setSkillActive('explode', false);
        }

        // オーブ上限を適用
        const settings = this.difficultySettings[this.difficulty];
        if (this.player.orbs > settings.maxOrbs) {
            this.player.orbs = settings.maxOrbs;
        }

        // パドルの状態をリセット
        this.paddle.resetEnhance();

        // ボールの爆破可能状態も解除
        for (const ball of this.balls) {
            ball.explodable = false;
            ball.explodeTimer = 0;
        }
    },

    /**
     * 貫通スキル発動
     */
    activatePenetrateSkill() {
        if (this.player.orbs >= this.skillCosts.penetrate && !this.paddle.enhanced) {
            this.player.orbs -= this.skillCosts.penetrate;
            this.paddle.enhance('penetrate');
            UI.setSkillActive('penetrate', true);
        }
    },

    /**
     * 爆破スキル発動
     */
    activateExplodeSkill() {
        // ボールが爆破可能状態なら爆発を実行
        for (const ball of this.balls) {
            if (ball.explodable) {
                if (ball.explode()) {
                    this.createExplosion(ball.x, ball.y);
                }
                return;
            }
        }

        // そうでなければスキルを準備
        if (this.player.orbs >= this.skillCosts.explode && !this.paddle.enhanced) {
            this.player.orbs -= this.skillCosts.explode;
            this.paddle.enhance('explode');
            UI.setSkillActive('explode', true);
        }
    },

    /**
     * バー爆破スキル発動
     * バーの縦位置を基準に、指定ブロック数分の範囲を横一掃で破壊（耐久無視）
     */
    activateBarExplodeSkill() {
        if (this.player.orbs >= this.skillCosts.barExplode) {
            this.player.orbs -= this.skillCosts.barExplode;

            // バー爆破範囲を計算（ブロック数 × (ブロック高さ + 余白)）
            const rangeBlocks = this.skillCosts.barExplodeRange;
            const rangeHeight = rangeBlocks * (this.blockHeight + this.blockPadding);

            // バーの上部から指定範囲内のブロックをすべて破壊
            const destructionTop = this.paddle.y - rangeHeight;
            const destructionBottom = this.paddle.y;

            // エフェクト用に中央位置を計算
            const effectY = this.paddle.y - rangeHeight / 2;

            // 範囲内のブロックを耐久無視で破壊
            for (let i = this.blocks.length - 1; i >= 0; i--) {
                const block = this.blocks[i];
                if (block.destroyed) continue;

                const blockBottom = block.y + block.height;
                const blockTop = block.y;

                // ブロックが範囲内にあるか判定
                if (blockBottom >= destructionTop && blockTop <= destructionBottom) {
                    // 耐久無視で即座に破壊
                    block.destroyed = true;
                    block.hp = 0;
                    this.onBlockDestroyed(block, i);
                }
            }

            // 横一掃エフェクト（画面全体に爆発エフェクトを複数表示）
            const explosionCount = 5;
            for (let i = 0; i < explosionCount; i++) {
                const x = (this.canvas.width / (explosionCount + 1)) * (i + 1);
                this.explosions.push(new Explosion(x, effectY, 80));
            }
        }
    },

    /**
     * 爆発を生成
     */
    createExplosion(x, y) {
        const explosionRadius = 150; // 爆破範囲を1.5倍に拡大
        this.explosions.push(new Explosion(x, y, explosionRadius));

        // 範囲内のブロックにダメージ
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.destroyed) continue;

            const blockCenterX = block.x + block.width / 2;
            const blockCenterY = block.y + block.height / 2;

            const dist = Math.sqrt(
                Math.pow(blockCenterX - x, 2) + Math.pow(blockCenterY - y, 2)
            );

            if (dist <= explosionRadius) {
                const destroyed = block.takeDamage(2);
                if (destroyed) {
                    this.onBlockDestroyed(block, i);
                }
            }
        }
    },

    /**
     * ポーズ切り替え
     */
    togglePause() {
        if (this.gameOver) return;

        if (this.paused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    },

    /**
     * ポーズ
     */
    pauseGame() {
        this.paused = true;
        UI.showOverlay('pause');
    },

    /**
     * 再開
     */
    resumeGame() {
        this.paused = false;
        UI.hideOverlay('pause');
    },

    /**
     * リスタート
     */
    restartGame() {
        UI.hideAllOverlays();
        this.startGame(this.difficulty);
    },

    /**
     * スタート画面に戻る
     */
    returnToStart() {
        this.running = false;
        UI.hideAllOverlays();
        UI.showScreen('start');
    },

    /**
     * ゲーム終了
     */
    exitGame() {
        this.running = false;
        // ブラウザを閉じるか、メッセージを表示
        if (confirm('ゲームを終了しますか？')) {
            window.close();
            // ブラウザによってはwindow.close()が機能しないため
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a1a;color:#fff;font-family:sans-serif;"><h1>ゲームを終了しました</h1></div>';
        }
    }
};

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
