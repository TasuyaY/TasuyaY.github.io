// ========================================
// エンティティ定義
// ========================================

/**
 * ブロッククラス
 * 耐久値、色、ヒビ割れ表示を管理
 */
class Block {
    constructor(x, y, width, height, maxHp) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.destroyed = false;
    }

    /**
     * HP に応じた色を取得
     */
    getColor() {
        const colors = {
            1: '#44ff44',  // 緑
            2: '#00ffff',  // シアン
            3: '#ffff00',  // 黄
            4: '#ff8800',  // オレンジ
            5: '#ff4444'   // 赤
        };
        return colors[this.maxHp] || colors[1];
    }

    /**
     * 現在のHPに応じた暗さを取得
     */
    getDarkenFactor() {
        const ratio = this.hp / this.maxHp;
        return 0.3 + (ratio * 0.7);
    }

    /**
     * ダメージを受ける
     */
    takeDamage(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.destroyed = true;
            return true;
        }
        return false;
    }

    /**
     * ブロックを描画
     */
    draw(ctx) {
        if (this.destroyed) return;

        const baseColor = this.getColor();
        const darken = this.getDarkenFactor();

        // ベースブロック描画
        ctx.save();

        // グラデーション
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, this.adjustBrightness(baseColor, darken + 0.1));
        gradient.addColorStop(1, this.adjustBrightness(baseColor, darken - 0.1));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4, 4);
        ctx.fill();

        // 光沢
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(this.x + 4, this.y + 4, this.width - 8, (this.height - 4) / 3, 2);
        ctx.fill();

        // ヒビ割れ描画
        this.drawCracks(ctx);

        // ボーダー
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4, 4);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * ヒビ割れを描画
     */
    drawCracks(ctx) {
        const ratio = this.hp / this.maxHp;

        if (ratio > 0.5) return; // 50%以上なら描画しない

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 2;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        if (ratio <= 0.5 && ratio > 0.25) {
            // 中程度のヒビ
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 5);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + 8, cy - 8);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + 5, cy + 10);
            ctx.stroke();
        } else if (ratio <= 0.25) {
            // 大きなヒビ
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy - 10);
            ctx.lineTo(cx - 5, cy);
            ctx.lineTo(cx - 12, cy + 8);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx - 5, cy);
            ctx.lineTo(cx + 5, cy - 5);
            ctx.lineTo(cx + 15, cy);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx + 5, cy - 5);
            ctx.lineTo(cx + 3, cy + 12);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx - 5, cy);
            ctx.lineTo(cx, cy + 15);
            ctx.stroke();
        }
    }

    /**
     * 色の明るさを調整
     */
    adjustBrightness(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        const nr = Math.round(Math.min(255, r * factor));
        const ng = Math.round(Math.min(255, g * factor));
        const nb = Math.round(Math.min(255, b * factor));

        return `rgb(${nr}, ${ng}, ${nb})`;
    }

    /**
     * 衝突判定用の矩形を取得
     */
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

/**
 * ボールクラス
 */
class Ball {
    constructor(x, y, radius = 8) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = 4.8; // 0.8倍に調整
        this.maxSpeed = 4.2; // 速度上限（元の70%）
        this.dx = this.speed * (Math.random() > 0.5 ? 1 : -1);
        this.dy = -this.speed;

        // スキル状態
        this.penetrating = false;
        this.penetrateCount = 0;
        this.maxPenetrateCount = 10;

        this.explodable = false;
        this.explodeTimer = 0;
        this.explodeDuration = 300; // フレーム数

        this.isClone = false; // 分身フラグ

        // 残像用履歴（通常ボールのみ使用）
        this.trail = [];
        this.maxTrailLength = 8;

        // 重力井戸関連（触れた井戸をスキップするため）
        this.ignoredGravityWell = null;
    }

    /**
     * ボールを更新
     */
    update() {
        // 速度制限を適用
        this.clampSpeed();

        // 残像用に位置履歴を記録（通常ボールのみ）
        if (!this.isClone) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }

        this.x += this.dx;
        this.y += this.dy;

        // 爆破タイマー更新
        if (this.explodable) {
            this.explodeTimer++;
            if (this.explodeTimer >= this.explodeDuration) {
                this.explodable = false;
                this.explodeTimer = 0;
            }
        }
    }

    /**
     * 速度を上限内に制限
     */
    clampSpeed() {
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (currentSpeed > this.maxSpeed) {
            const scale = this.maxSpeed / currentSpeed;
            this.dx *= scale;
            this.dy *= scale;
        }
    }

    /**
     * ボールを描画
     */
    draw(ctx) {
        ctx.save();

        // 分身ボール: 白色系
        // 通常ボール: 金色系 + 残像
        if (this.isClone) {
            // 分身ボール（白色）
            let glowColor = 'rgba(200, 200, 255, 0.5)';
            let ballColor = '#ffffff';

            if (this.penetrating) {
                glowColor = 'rgba(255, 150, 150, 0.8)';
                ballColor = '#ffaaaa';
            } else if (this.explodable) {
                glowColor = 'rgba(255, 200, 150, 0.8)';
                ballColor = '#ffddaa';
            }

            ctx.shadowBlur = 15;
            ctx.shadowColor = glowColor;

            const gradient = ctx.createRadialGradient(
                this.x - this.radius / 3, this.y - this.radius / 3, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, ballColor);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 通常ボール（金色 + 残像）

            // 残像を描画
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.4;
                const size = this.radius * (0.4 + (i / this.trail.length) * 0.4);

                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // グロー効果
            let glowColor = 'rgba(255, 215, 0, 0.6)';
            let ballColor = '#ffd700';

            if (this.penetrating) {
                glowColor = 'rgba(255, 100, 0, 0.8)';
                ballColor = '#ff6600';
            } else if (this.explodable) {
                glowColor = 'rgba(255, 200, 0, 0.8)';
                ballColor = '#ffcc00';
            }

            ctx.shadowBlur = 25;
            ctx.shadowColor = glowColor;

            // ボール本体
            const gradient = ctx.createRadialGradient(
                this.x - this.radius / 3, this.y - this.radius / 3, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#fff8dc');
            gradient.addColorStop(1, ballColor);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 爆破可能表示（両方共通）
        if (this.explodable) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 200, 0, ' + (0.5 + Math.sin(this.explodeTimer * 0.2) * 0.5) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 貫通効果を付与
     */
    enablePenetrate() {
        this.penetrating = true;
        this.penetrateCount = 0;
    }

    /**
     * 爆破可能状態にする
     */
    enableExplode() {
        this.explodable = true;
        this.explodeTimer = 0;
    }

    /**
     * 貫通効果を使用（ブロック破壊時に呼ぶ）
     */
    usePenetrate() {
        if (this.penetrating) {
            this.penetrateCount++;
            if (this.penetrateCount >= this.maxPenetrateCount) {
                this.penetrating = false;
                this.penetrateCount = 0;
            }
        }
    }

    /**
     * 爆破を実行
     */
    explode() {
        if (this.explodable) {
            this.explodable = false;
            this.explodeTimer = 0;
            return true;
        }
        return false;
    }

    /**
     * 速度を正規化
     */
    normalizeSpeed() {
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (currentSpeed !== 0) {
            this.dx = (this.dx / currentSpeed) * this.speed;
            this.dy = (this.dy / currentSpeed) * this.speed;
        }
    }
}

/**
 * パドル（バー）クラス
 */
class Paddle {
    constructor(x, y, width = 120, height = 15) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 10;

        // 強化状態
        this.enhanced = false;
        this.enhanceType = null; // 'penetrate' or 'explode'

        // 無敵状態
        this.invincible = false;
        this.animationTimer = 0;
    }

    /**
     * パドルを描画
     */
    draw(ctx) {
        ctx.save();

        // アニメーションタイマー更新
        this.animationTimer += 0.1;

        // グロー効果
        let glowColor = 'rgba(0, 255, 255, 0.5)';
        let paddleColor1 = '#00ffff';
        let paddleColor2 = '#0088aa';

        // 無敵状態は虹色明滅
        if (this.invincible) {
            // 虹色を時間で変化させる
            const hue = (this.animationTimer * 50) % 360;
            const brightness = 0.7 + Math.sin(this.animationTimer * 3) * 0.3;
            glowColor = `hsla(${hue}, 100%, 70%, 0.9)`;
            paddleColor1 = `hsl(${hue}, 100%, ${60 + brightness * 20}%)`;
            paddleColor2 = `hsl(${(hue + 30) % 360}, 100%, ${40 + brightness * 20}%)`;
        } else if (this.enhanced) {
            if (this.enhanceType === 'penetrate') {
                glowColor = 'rgba(255, 100, 0, 0.8)';
                paddleColor1 = '#ff6600';
                paddleColor2 = '#aa4400';
            } else if (this.enhanceType === 'explode') {
                glowColor = 'rgba(255, 200, 0, 0.8)';
                paddleColor1 = '#ffcc00';
                paddleColor2 = '#aa8800';
            }
        }

        ctx.shadowBlur = this.invincible ? 25 : 15;
        ctx.shadowColor = glowColor;

        // パドル本体
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, paddleColor1);
        gradient.addColorStop(1, paddleColor2);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, this.height / 2);
        ctx.fill();

        // 光沢
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(this.x + 10, this.y + 2, this.width - 20, this.height / 3, 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * 左に移動
     */
    moveLeft(canvasWidth) {
        this.x = Math.max(0, this.x - this.speed);
    }

    /**
     * 右に移動
     */
    moveRight(canvasWidth) {
        this.x = Math.min(canvasWidth - this.width, this.x + this.speed);
    }

    /**
     * 特定の位置に移動
     */
    moveTo(targetX, canvasWidth) {
        this.x = Math.max(0, Math.min(canvasWidth - this.width, targetX - this.width / 2));
    }

    /**
     * 強化状態にする
     */
    enhance(type) {
        this.enhanced = true;
        this.enhanceType = type;
    }

    /**
     * 強化状態をリセット
     */
    resetEnhance() {
        this.enhanced = false;
        this.enhanceType = null;
    }

    /**
     * 強化状態を解除
     */
    clearEnhance() {
        this.enhanced = false;
        this.enhanceType = null;
    }

    /**
     * 衝突判定用の矩形を取得
     */
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

/**
 * オーブクラス
 */
class Orb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.speed = 3;
        this.value = 10;
        this.collected = false;
        this.animationOffset = Math.random() * Math.PI * 2;
    }

    /**
     * オーブを更新
     */
    update() {
        this.y += this.speed;
        this.animationOffset += 0.1;
    }

    /**
     * オーブを描画
     */
    draw(ctx) {
        if (this.collected) return;

        ctx.save();

        const pulse = Math.sin(this.animationOffset) * 0.3 + 0.7;

        // グロー
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(170, 136, 255, 0.8)';

        // オーブ本体
        const gradient = ctx.createRadialGradient(
            this.x, this.y - 2, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ddaaff');
        gradient.addColorStop(1, '#aa88ff');

        ctx.fillStyle = gradient;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 光の輪
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3 + Math.sin(this.animationOffset * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * パドルとの衝突判定
     */
    checkCollisionWithPaddle(paddle) {
        const bounds = paddle.getBounds();
        return (
            this.x >= bounds.left &&
            this.x <= bounds.right &&
            this.y + this.radius >= bounds.top &&
            this.y - this.radius <= bounds.bottom
        );
    }
}

/**
 * 爆発エフェクトクラス
 */
class Explosion {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.radius = 0;
        this.alpha = 1;
        this.finished = false;
        this.expandSpeed = 15;
        this.fadeSpeed = 0.05;
    }

    /**
     * 更新
     */
    update() {
        if (this.radius < this.maxRadius) {
            this.radius += this.expandSpeed;
        } else {
            this.alpha -= this.fadeSpeed;
            if (this.alpha <= 0) {
                this.finished = true;
            }
        }
    }

    /**
     * 描画
     */
    draw(ctx) {
        if (this.finished) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // 外輪
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * 衝撃波エフェクトクラス（貫通用）
 */
class ShockwaveEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 60;
        this.alpha = 1;
        this.finished = false;
        this.expandSpeed = 8;
    }

    update() {
        this.radius += this.expandSpeed;
        this.alpha = 1 - (this.radius / this.maxRadius);

        if (this.radius >= this.maxRadius) {
            this.finished = true;
        }
    }

    draw(ctx) {
        if (this.finished) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // 外側リング
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 内側リング
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * ビームエフェクトクラス
 */
class BeamEffect {
    constructor(x, y, height) {
        this.x = x;
        this.y = y; // 終点Y（上端）
        this.height = height; // ビームの高さ
        this.width = 60;
        this.maxWidth = 80;
        this.alpha = 1;
        this.finished = false;
        this.timer = 0;
        this.duration = 30; // フレーム数

        // パーティクル
        this.particles = [];
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * this.width,
                y: this.y + Math.random() * this.height,
                size: 2 + Math.random() * 4,
                speed: 3 + Math.random() * 5,
                alpha: Math.random()
            });
        }
    }

    update() {
        this.timer++;

        // 幅を脈動させる
        this.width = this.maxWidth * (0.8 + Math.sin(this.timer * 0.3) * 0.2);

        // フェードアウト
        if (this.timer > this.duration * 0.6) {
            this.alpha = 1 - ((this.timer - this.duration * 0.6) / (this.duration * 0.4));
        }

        if (this.timer >= this.duration) {
            this.finished = true;
        }

        // パーティクル更新
        for (const p of this.particles) {
            p.y -= p.speed;
            p.alpha = Math.random();
            if (p.y < this.y) {
                p.y = this.y + this.height;
            }
        }
    }

    draw(ctx) {
        if (this.finished) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // メインビーム
        const gradient = ctx.createLinearGradient(
            this.x - this.width / 2, 0,
            this.x + this.width / 2, 0
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
        gradient.addColorStop(0.3, 'rgba(100, 255, 255, 0.6)');
        gradient.addColorStop(0.5, 'rgba(200, 255, 255, 1)');
        gradient.addColorStop(0.7, 'rgba(100, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);

        // 中央コア（より明るい）
        const coreWidth = this.width * 0.3;
        const coreGradient = ctx.createLinearGradient(
            this.x - coreWidth / 2, 0,
            this.x + coreWidth / 2, 0
        );
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = coreGradient;
        ctx.fillRect(this.x - coreWidth / 2, this.y, coreWidth, this.height);

        // グロー効果
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00ffff';

        // パーティクル
        for (const p of this.particles) {
            ctx.globalAlpha = this.alpha * p.alpha;
            ctx.fillStyle = '#aaffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/**
 * 重力場クラス
 * ボールを吸い寄せる重力場を生成
 */
class GravityWell {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius; // 吸引半径
        this.coreRadius = 15; // 中心の球体半径
        this.duration = 600; // 10秒（60fps × 10）
        this.timer = 0;
        this.finished = false;
        this.pullStrength = 0.30; // 吸引力（2倍に強化）

        // パーティクル用
        this.particles = [];
        this.maxParticles = 20;
        this.initParticles();
    }

    /**
     * パーティクル初期化
     */
    initParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createParticle());
        }
    }

    /**
     * パーティクル生成
     */
    createParticle() {
        const angle = Math.random() * Math.PI * 2;
        const dist = this.radius * (0.3 + Math.random() * 0.7);
        return {
            angle: angle,
            dist: dist,
            speed: 0.5 + Math.random() * 1.5,
            size: 2 + Math.random() * 3
        };
    }

    /**
     * 更新
     */
    update() {
        this.timer++;
        if (this.timer >= this.duration) {
            this.finished = true;
        }

        // パーティクル更新（中心に向かって移動）
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.dist -= p.speed;
            if (p.dist <= this.coreRadius) {
                // 中心に到達したらリセット
                this.particles[i] = this.createParticle();
            }
        }
    }

    /**
     * ボールへの吸引力を計算
     */
    calculatePull(ball) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.radius) {
            return { x: 0, y: 0 }; // 範囲外
        }

        // 距離に応じた吸引力（近いほど強い）
        const strength = this.pullStrength * (1 - distance / this.radius);
        const normalX = dx / distance;
        const normalY = dy / distance;

        return {
            x: normalX * strength,
            y: normalY * strength
        };
    }

    /**
     * ボールが重力球の中心に触れたか判定
     */
    checkCollision(ball) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.coreRadius + ball.radius;
    }

    /**
     * 描画
     */
    draw(ctx) {
        if (this.finished) return;

        ctx.save();

        // 残り時間に応じた透明度
        const lifeRatio = 1 - (this.timer / this.duration);
        const baseAlpha = Math.min(1, lifeRatio * 2);

        // 吸引範囲（外周リング）
        ctx.globalAlpha = baseAlpha * 0.2;
        ctx.strokeStyle = '#8800ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 吸引範囲グラデーション
        const rangeGradient = ctx.createRadialGradient(
            this.x, this.y, this.coreRadius,
            this.x, this.y, this.radius
        );
        rangeGradient.addColorStop(0, 'rgba(100, 0, 200, 0.3)');
        rangeGradient.addColorStop(1, 'rgba(100, 0, 200, 0)');
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = rangeGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 吸い込みパーティクル
        ctx.globalAlpha = baseAlpha * 0.8;
        for (const p of this.particles) {
            const px = this.x + Math.cos(p.angle) * p.dist;
            const py = this.y + Math.sin(p.angle) * p.dist;

            ctx.fillStyle = '#cc88ff';
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 中心の球体
        ctx.globalAlpha = baseAlpha;
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(150, 0, 255, 0.8)';

        const coreGradient = ctx.createRadialGradient(
            this.x - this.coreRadius / 3, this.y - this.coreRadius / 3, 0,
            this.x, this.y, this.coreRadius
        );
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, '#cc88ff');
        coreGradient.addColorStop(1, '#6600cc');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.coreRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}


/**
 * 紙吹雪エフェクト
 */
class Confetti {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 8 + 4;
        this.vx = Math.random() * 6 - 3;
        this.vy = Math.random() * -10 - 5;
        this.gravity = 0.2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
        this.timer = 0;
        this.duration = 300;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        this.timer++;
    }

    draw(ctx) {
        if (this.timer >= this.duration) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, 1 - this.timer / this.duration);

        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        ctx.restore();
    }
}

// エクスポート用（モジュールとして使用する場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Block, Ball, Paddle, Orb, Explosion, ShockwaveEffect, BeamEffect, GravityWell, Confetti };
}
