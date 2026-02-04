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

    // ハイスコア設定
    highScores: {
        easy: 0,
        normal: 0,
        hard: 0,
        extreme: 0
    },

    // 難易度設定
    difficulty: 'normal',
    difficultySettings: {
        easy: {
            blockSpeed: 0.05,
            highHpRatio: 0.1,
            maxOrbs: 200,
            initialOrbs: 100, // 初期オーブ
            label: '簡単'
        },
        normal: {
            blockSpeed: 0.06,
            highHpRatio: 0.2,
            maxOrbs: 200,
            initialOrbs: 70,
            label: '普通'
        },
        hard: {
            blockSpeed: 0.07,
            highHpRatio: 0.3,
            maxOrbs: 200,
            initialOrbs: 50,
            label: '難しい'
        },
        extreme: {
            blockSpeed: 0.08,
            highHpRatio: 0.4,
            maxOrbs: 200,
            initialOrbs: 30,
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

    // ゲームモード: 'normal' または 'roguelite'
    gameMode: 'normal',

    // ローグライト専用プロパティ
    roguelite: {
        elapsedTime: 0,           // 経過時間(ms)
        startTime: 0,             // 開始時刻
        currentDifficultyLevel: 0, // 0=easy, 1=normal, 2=hard, 3=extreme
        extremeMultiplier: 1,     // 極み以降の強化倍率
        abilities: {},            // 獲得済み能力 { abilityId: level }
        skills: [],               // 獲得済みスキル [{ id, level, icon, name }] 最大3つ
        nextAbilityIndex: 0,      // 次の能力獲得インデックス
        abilityThresholds: [2000, 4000, 6000, 8000, 10000, 14000, 18000, 25000],
        isSelectingAbility: false, // 能力選択中フラグ
        pendingSkill: null,       // 入れ替え待ちのスキル
        currentChoices: null,     // 現在の選択肢（保持用）
    },

    // 能力定義（ローグライト用）
    allAbilities: [
        {
            id: 'orbAbsorb',
            name: 'オーブ吸収',
            icon: '🧲',
            maxLevel: 5,
            description: 'バーがオーブを吸引する',
            getLevelEffect: (level) => [3, 3.5, 4, 4.5, 6][level - 1]
        },
        {
            id: 'heal1',
            name: '回復(小)',
            icon: '💚',
            maxLevel: 1,
            isInstant: true,
            healAmount: 3,
            description: 'HPを3回復'
        },
        {
            id: 'heal2',
            name: '回復(中)',
            icon: '💚',
            maxLevel: 1,
            isInstant: true,
            healAmount: 4,
            description: 'HPを4回復'
        },
        {
            id: 'heal3',
            name: '回復(大)',
            icon: '💚',
            maxLevel: 1,
            isInstant: true,
            healAmount: 5,
            description: 'HPを5回復'
        },
        {
            id: 'barWidth',
            name: 'バー幅強化',
            icon: '📏',
            maxLevel: 5,
            description: 'バーの幅を拡大',
            getLevelEffect: (level) => [1.2, 1.4, 1.6, 1.8, 2.0][level - 1]
        },
        {
            id: 'orbLimit',
            name: 'オーブ上限増加',
            icon: '💎',
            maxLevel: 5,
            description: 'オーブの最大所持数を増加',
            getLevelEffect: (level) => [250, 300, 350, 400, 500][level - 1]
        },
        {
            id: 'orbDropRate',
            name: 'オーブ出現強化',
            icon: '✨',
            maxLevel: 5,
            description: 'オーブのドロップ率を上昇',
            getLevelEffect: (level) => [0.05, 0.10, 0.15, 0.20, 0.25][level - 1]
        },
        {
            id: 'ballDamage',
            name: 'ボール強化',
            icon: '⚪',
            maxLevel: 3,
            description: 'ボールの攻撃力を増加',
            getLevelEffect: (level) => [2, 3, 4][level - 1]
        }
    ],

    // スキルレベル効果（ローグライト用）
    skillLevelEffects: {
        penetrate: { maxLevel: 5, getEffect: (lv) => [3, 5, 10, 15, 20][lv - 1] },
        vPenetrate: { maxLevel: 5, getEffect: (lv) => [3, 5, 10, 15, 20][lv - 1] },
        hPenetrate: { maxLevel: 5, getEffect: (lv) => [3, 5, 10, 15, 20][lv - 1] },
        // 爆破: radius=ブロック数、count=爆発回数
        explode: { maxLevel: 5, getEffect: (lv) => ({ radius: [3, 4, 5, 6, 6][lv - 1], count: lv >= 5 ? 2 : 1 }) },
        gravity: { maxLevel: 5, getEffect: (lv) => ({ radius: [5, 7, 9, 11, 13][lv - 1], power: [1, 1.2, 1.4, 1.6, 1.8][lv - 1], extraDuration: lv >= 4 ? 5000 : 0 }) },
        barExplode: { maxLevel: 5, getEffect: (lv) => [3, 4, 5, 6, 7][lv - 1] },
        // ビーム: damage=ダメージ、widthMult=バー幅に対する倍率
        beam: { maxLevel: 5, getEffect: (lv) => ({ damage: [2, 3, 4, 4, 4][lv - 1], widthMult: [1, 1, 1, 1.1, 1.3][lv - 1] }) },
        clone: { maxLevel: 5, getEffect: (lv) => [1, 2, 5, 7, 10][lv - 1] },
        barInvincible: { maxLevel: 5, getEffect: (lv) => ({ duration: [3, 4, 5, 5, 5][lv - 1], widthMult: [1, 1, 1, 1.5, 2][lv - 1] }) }
    },

    // スキルコスト・パラメータ
    // スキル選択状態
    selectedSkills: [], // 選択された3つのスキルID

    // 全スキル定義
    allSkills: [
        {
            id: 'penetrate',
            name: '貫通',
            cost: 20,
            key: 'Q',
            icon: '🔥',
            description: '【パドル強化】一定時間、ボールが赤くなり、ブロックを貫通して破壊します。'
        },
        {
            id: 'explode',
            name: '爆破',
            cost: 40,
            key: 'E',
            icon: '💥',
            description: '【ボール強化】次にボールがブロックに当たった瞬間、爆発を起こして周囲のブロックを巻き込んで破壊します。'
        },
        {
            id: 'barExplode',
            name: 'バー爆破',
            cost: 100,
            key: 'R',
            icon: '💣',
            description: '【広範囲攻撃】バーの真上にあるブロックを一気に爆破・消去します。緊急回避に有効です。'
        },
        {
            id: 'clone',
            name: '分身',
            cost: 50,
            key: '?',
            icon: '👥',
            description: '【ボール追加】ボールが分裂して5つに増えます。分身したボールは落としてもHPが減りません。'
        },
        {
            id: 'beam',
            name: 'ビーム',
            cost: 100,
            key: '?',
            icon: '⚡',
            description: '【一撃必殺】バーから強力なビームを放ち、縦一列のブロックを薙ぎ払います。'
        },
        {
            id: 'vPenetrate',
            name: '縦貫通',
            cost: 30,
            key: '?',
            icon: '⬆️',
            description: '【軌道変化】全てのボールが真上に打ち出され、障害物を貫通して直進します。'
        },
        {
            id: 'hPenetrate',
            name: '横貫通',
            cost: 50,
            key: '?',
            icon: '↔️',
            description: '【軌道変化】全てのボールが真横に打ち出され、壁に反射しながらブロックを貫通破壊します。'
        },
        {
            id: 'barInvincible',
            name: 'バー無敵',
            cost: 30,
            key: '?',
            icon: '🛡️',
            description: '【防御強化】10秒間、バーが虹色に輝き無敵になります。ブロックが接触してもダメージを受けず、逆に破壊します。'
        },
        {
            id: 'gravity',
            name: '重力球',
            cost: 70,
            key: '?',
            icon: '🧲',
            description: '【補助効果】ボールを吸い寄せる重力場を生成します。散らばったボールをまとめるのに便利です。'
        }
    ],

    // skillCostsは削除し、allSkillsから参照するように変更予定だが、
    // 一時的に既存コードとの互換性のために残すか、別途ゲッターで対応する。
    // 今回は既存参照箇所を修正するため削除。

    // スキルパラメータ（コスト以外）
    skillParams: {
        barExplodeRange: 6
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
    paddleTouchId: null, // パドル操作用のタッチID

    // ブロック生成タイマー
    blockSpawnTimer: 0,
    blockSpawnInterval: 180, // フレーム数

    /**
     * ゲームを初期化
     */
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // モバイルブラウザのビューポート高さ対応
        this.setViewportHeight();
        window.addEventListener('resize', () => {
            this.setViewportHeight();
            this.resizeCanvas();
        });

        this.resizeCanvas();

        // ハイスコア読み込み
        this.loadHighScores();
        UI.updateMainMenuHighScores(this.highScores);

        this.setupInputHandlers();
        this.setupUICallbacks();
    },

    /**
     * ビューポート高さを動的に設定（モバイルブラウザ対応）
     */
    setViewportHeight() {
        // window.innerHeightを使用してアドレスバーを除いた実際の高さを取得
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
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
     * ハイスコアをロード
     */
    loadHighScores() {
        try {
            const saved = localStorage.getItem('swift-orbit-highscores');
            if (saved) {
                this.highScores = JSON.parse(saved);
            }
        } catch (e) {
            console.error('ハイスコアの読み込みに失敗しました', e);
        }
    },

    /**
     * ハイスコアを保存
     */
    saveHighScores() {
        try {
            localStorage.setItem('swift-orbit-highscores', JSON.stringify(this.highScores));
        } catch (e) {
            console.error('ハイスコアの保存に失敗しました', e);
        }
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
            if ((e.key === 'q' || e.key === 'Q') && !this.paused && !this.gameOver) {
                // Qキー: 1つ目のスキル
                if (this.selectedSkills[0]) {
                    this.activateSkill(this.selectedSkills[0]);
                }
            }
            if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !this.paused && !this.gameOver) {
                // Eキー/スペースキー: 2つ目のスキル
                if (this.selectedSkills[1]) {
                    this.activateSkill(this.selectedSkills[1]);
                }
            }
            if ((e.key === 'r' || e.key === 'R') && !this.paused && !this.gameOver) {
                // Rキー: 3つ目のスキル
                if (this.selectedSkills[2]) {
                    this.activateSkill(this.selectedSkills[2]);
                }
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

        // タッチ入力（マルチタッチ対応）
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();

            // 既にパドル操作中の指があれば無視、なければ最初のタッチをパドル操作用に割り当て
            if (this.paddleTouchId === null) {
                const touch = e.changedTouches[0];
                this.paddleTouchId = touch.identifier;
                this.mouseX = touch.clientX - rect.left;
                this.useMouseControl = true;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // スクロール防止
            const rect = this.canvas.getBoundingClientRect();

            // パドル操作用のタッチを探して更新
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.paddleTouchId) {
                    this.mouseX = touch.clientX - rect.left;
                    this.useMouseControl = true;
                    break;
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            // パドル操作用のタッチが終了したか確認
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.paddleTouchId) {
                    this.paddleTouchId = null;
                    break;
                }
            }
        }, { passive: false });
    },

    /**
     * UIコールバックを設定
     */
    setupUICallbacks() {
        UI.setupEventListeners({
            onDifficultySelect: (difficulty) => {
                this.difficulty = difficulty;
                this.showSkillSelection();
            },
            onBackToDifficulty: () => this.returnToDifficultySelect(),
            onSkillSelectToggle: (skillId) => this.toggleSkillSelection(skillId),
            onGameStart: () => this.startGame(),
            onSkillTrigger: (skillId) => this.activateSkill(skillId),
            onPause: () => this.togglePause(),
            onResume: () => this.resumeGame(),
            onRestart: () => this.restartGame(),
            onToStart: () => this.returnToStart(),
            onExit: () => this.exitGame(),
            onSkillPenetrate: () => this.activatePenetrateSkill(),
            onSkillExplode: () => this.activateExplodeSkill(),
            onSkillCancel: () => this.cancelSkill(),
            onRestartSkill: () => this.returnToSkillSelect(),
            onShowHelp: () => UI.renderHelpSkills(this.allSkills),
            // ローグライト用
            onModeNormal: () => this.selectNormalMode(),
            onModeRoguelite: () => this.selectRogueliteMode(),
            onSkillSwapCancel: () => this.cancelSkillSwap()
        });
    },

    /**
     * 通常モードを選択
     */
    selectNormalMode() {
        this.gameMode = 'normal';
        UI.showScreen('difficulty');
    },

    /**
     * ローグライトモードを選択
     */
    selectRogueliteMode() {
        this.gameMode = 'roguelite';
        this.startRogueliteGame();
    },

    /**
     * スキル入れ替えをキャンセル
     */
    cancelSkillSwap() {
        this.roguelite.pendingSkill = null;
        UI.hideSkillSwapSelection();
        // 能力選択に戻る
        if (this.roguelite.isSelectingAbility) {
            this.showAbilitySelection();
        }
    },

    /**
     * 難易度選択に戻る
     */
    returnToDifficultySelect() {
        UI.showScreen('difficulty');
        this.selectedSkills = [];
    },

    /**
     * スキル選択画面を表示
     */
    showSkillSelection() {
        this.selectedSkills = []; // リセット
        UI.renderSkillsList(this.allSkills, this.selectedSkills);
        UI.showScreen('skillSelect');
    },

    /**
     * スキルの選択/解除
     */
    toggleSkillSelection(skillId) {
        const index = this.selectedSkills.indexOf(skillId);
        if (index >= 0) {
            // 解除
            this.selectedSkills.splice(index, 1);
        } else {
            // 追加（3つまで）
            if (this.selectedSkills.length < 3) {
                this.selectedSkills.push(skillId);
            }
        }
        UI.renderSkillsList(this.allSkills, this.selectedSkills);
    },

    /**
     * スキル発動（共通エントリポイント）
     */
    activateSkill(skillId) {
        if (this.paused || this.gameOver) return;

        // スキルIDに基づいて分岐
        switch (skillId) {
            case 'penetrate':
                this.activatePenetrateSkill();
                break;
            case 'explode':
                this.activateExplodeSkill();
                break;
            case 'barExplode':
                this.activateBarExplodeSkill();
                break;
            case 'clone':
                this.activateCloneSkill();
                break;
            case 'beam':
                this.activateBeamSkill();
                break;
            case 'vPenetrate':
                this.activateVerticalPenetrateSkill();
                break;
            case 'hPenetrate':
                this.activateHorizontalPenetrateSkill();
                break;
            case 'barInvincible':
                this.activateBarInvincibleSkill();
                break;
            case 'gravity':
                this.activateGravitySkill();
                break;
        }
    },

    /**
     * ゲームを開始
     */
    startGame() {
        const difficulty = this.difficulty; // 保存された難易度を使用
        // 既存のゲームループを停止
        this.running = false;

        this.difficulty = difficulty;
        this.resetGameState();

        UI.showScreen('game');
        UI.hideAllOverlays();
        UI.updateDifficultyBadge(this.difficultySettings[this.difficulty].label);
        UI.renderSkillBar(this.allSkills, this.selectedSkills); // スキルバー生成

        this.resizeCanvas();
        this.createInitialBlocks();
        this.createPaddle();
        this.resetBall();

        this.paused = false;
        this.gameOver = false;

        // カウントダウン後にゲームを開始
        this.startCountdown(() => {
            this.running = true;
            this.gameLoop();
        });
    },

    /**
     * ローグライトモードでゲームを開始
     */
    startRogueliteGame() {
        // 既存のゲームループを停止
        this.running = false;

        // ローグライト初期化
        this.difficulty = 'easy'; // 初期難易度
        this.roguelite = {
            elapsedTime: 0,
            startTime: Date.now(),
            currentDifficultyLevel: 0,
            extremeMultiplier: 1,
            abilities: {},
            skills: [],
            nextAbilityIndex: 0,
            abilityThresholds: [2000, 4000, 6000, 8000, 10000, 14000, 18000, 25000],
            isSelectingAbility: false,
            pendingSkill: null,
            currentChoices: null,
        };

        this.selectedSkills = []; // スキルなしで開始
        this.resetGameState();

        UI.showScreen('game');
        UI.hideAllOverlays();
        UI.updateDifficultyBadge('ローグライト');
        UI.renderSkillBar(this.allSkills, this.selectedSkills); // 空のスキルバー

        this.resizeCanvas();
        this.createInitialBlocks();
        this.createPaddle();
        this.resetBall();

        this.paused = false;
        this.gameOver = false;

        // カウントダウン後にゲームを開始
        this.startCountdown(() => {
            this.running = true;
            this.gameLoop();
        });
    },

    /**
     * ローグライト: 能力獲得チェック
     */
    checkAbilityUnlock() {
        if (this.gameMode !== 'roguelite') return;
        if (this.roguelite.isSelectingAbility) return;

        const score = this.player.score;
        const thresholds = this.roguelite.abilityThresholds;
        const nextIndex = this.roguelite.nextAbilityIndex;

        // 固定閾値のチェック
        if (nextIndex < thresholds.length) {
            if (score >= thresholds[nextIndex]) {
                this.showAbilitySelection();
                return;
            }
        } else {
            // 25000以降: 10万まで10000毎、10万〜20万は25000毎、20万以降は50000毎
            const baseScore = thresholds[thresholds.length - 1]; // 25000
            const additionalIndex = nextIndex - thresholds.length;
            let nextThreshold;

            // 25000〜100000: 10000毎 (75000 / 10000 = 7.5 → 8回)
            const stepsTo100k = Math.ceil((100000 - baseScore) / 10000); // 8
            // 100000〜200000: 25000毎 (100000 / 25000 = 4回)
            const steps100kTo200k = 4;

            if (additionalIndex < stepsTo100k) {
                // 25000〜100000区間
                nextThreshold = baseScore + (additionalIndex + 1) * 10000;
            } else if (additionalIndex < stepsTo100k + steps100kTo200k) {
                // 100000〜200000区間
                const indexIn100k = additionalIndex - stepsTo100k;
                nextThreshold = 100000 + (indexIn100k + 1) * 25000;
            } else {
                // 200000以降: 50000毎
                const indexOver200k = additionalIndex - stepsTo100k - steps100kTo200k;
                nextThreshold = 200000 + (indexOver200k + 1) * 50000;
            }

            if (score >= nextThreshold) {
                this.showAbilitySelection();
                return;
            }
        }
    },

    /**
     * ローグライト: 能力選択画面を表示
     */
    showAbilitySelection() {
        this.roguelite.isSelectingAbility = true;
        this.pauseGameForAbility();

        // 保持された選択肢がない場合のみ新規生成
        if (!this.roguelite.currentChoices) {
            this.roguelite.currentChoices = this.generateAbilityChoices();
        }

        const choices = this.roguelite.currentChoices;
        const canReroll = this.player.hp > 5;

        UI.showAbilitySelection(
            choices,
            (choice, index) => {
                this.selectAbility(choice);
            },
            () => {
                // スキップ
                this.skipAbilitySelection();
            },
            () => {
                // 再抽選（HP5消費）
                this.rerollAbilitySelection();
            },
            canReroll
        );
    },

    /**
     * ローグライト: 能力選択用にゲームを一時停止
     */
    pauseGameForAbility() {
        this.paused = true;
    },

    /**
     * ローグライト: 3つの選択肢を生成
     */
    generateAbilityChoices() {
        const choices = [];
        const availableAbilities = [];
        const availableSkills = [];

        // 能力候補
        this.allAbilities.forEach(ability => {
            const currentLevel = this.roguelite.abilities[ability.id] || 0;
            if (currentLevel < ability.maxLevel) {
                availableAbilities.push({
                    ...ability,
                    currentLevel,
                    isSkill: false
                });
            }
        });

        // スキル候補（レベル上限未満のもの）
        this.allSkills.forEach(skill => {
            const existingSkill = this.roguelite.skills.find(s => s.id === skill.id);
            const currentLevel = existingSkill ? existingSkill.level : 0;
            const levelEffects = this.skillLevelEffects[skill.id];
            const maxLevel = levelEffects ? levelEffects.maxLevel : 1;

            if (currentLevel < maxLevel) {
                availableSkills.push({
                    ...skill,
                    currentLevel,
                    maxLevel,
                    isSkill: true
                });
            }
        });

        // 全候補を統合してシャッフル
        const allChoices = [...availableAbilities, ...availableSkills];
        this.shuffleArray(allChoices);

        // 3つ選択（足りなければ少なく）
        for (let i = 0; i < Math.min(3, allChoices.length); i++) {
            choices.push(allChoices[i]);
        }

        return choices;
    },

    /**
     * 配列をシャッフル
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    /**
     * ローグライト: 能力を選択
     */
    selectAbility(choice) {
        if (choice.isSkill) {
            this.acquireRogueliteSkill(choice);
        } else {
            this.applyAbility(choice);
        }
    },

    /**
     * ローグライト: 能力を適用
     */
    applyAbility(ability) {
        const currentLevel = this.roguelite.abilities[ability.id] || 0;
        const newLevel = currentLevel + 1;
        this.roguelite.abilities[ability.id] = newLevel;

        // 即時効果の場合
        if (ability.isInstant && ability.healAmount) {
            this.player.hp = Math.min(this.player.hp + ability.healAmount, this.player.maxHp);
            UI.updateHP(this.player.hp, this.player.maxHp);
        }

        // オーブ上限増加の場合
        if (ability.id === 'orbLimit' && ability.getLevelEffect) {
            // maxOrbsを更新
            this.difficultySettings[this.difficulty].maxOrbs = ability.getLevelEffect(newLevel);
        }

        this.finishAbilitySelection();
    },

    /**
     * ローグライト: スキルを獲得
     */
    acquireRogueliteSkill(skill) {
        const existingIndex = this.roguelite.skills.findIndex(s => s.id === skill.id);

        if (existingIndex >= 0) {
            // 既存スキルのレベルアップ
            this.roguelite.skills[existingIndex].level++;
            this.updateSelectedSkillsFromRoguelite();
            this.finishAbilitySelection();
        } else if (this.roguelite.skills.length < 3) {
            // 新規スキル追加（3つ未満）
            this.roguelite.skills.push({
                id: skill.id,
                level: 1,
                icon: skill.icon,
                name: skill.name
            });
            this.updateSelectedSkillsFromRoguelite();
            this.finishAbilitySelection();
        } else {
            // スキル入れ替えが必要
            this.roguelite.pendingSkill = skill;
            UI.hideAbilitySelection();
            UI.showSkillSwapSelection(this.roguelite.skills, skill, (index) => {
                this.swapSkill(index, skill);
            });
        }
    },

    /**
     * ローグライト: スキルを入れ替え
     */
    swapSkill(index, newSkill) {
        this.roguelite.skills[index] = {
            id: newSkill.id,
            level: 1,
            icon: newSkill.icon,
            name: newSkill.name
        };
        this.roguelite.pendingSkill = null;
        UI.hideSkillSwapSelection();
        this.updateSelectedSkillsFromRoguelite();
        this.finishAbilitySelection();
    },

    /**
     * ローグライト: selectedSkillsを更新
     */
    updateSelectedSkillsFromRoguelite() {
        this.selectedSkills = this.roguelite.skills.map(s => s.id);
        UI.renderSkillBar(this.allSkills, this.selectedSkills);
    },

    /**
     * ローグライト: 能力選択完了
     */
    finishAbilitySelection() {
        this.roguelite.isSelectingAbility = false;
        this.roguelite.nextAbilityIndex++;
        this.roguelite.currentChoices = null; // 選択肢をクリア
        UI.hideAbilitySelection();
        this.paused = false;
    },

    /**
     * ローグライト: 能力選択をスキップ
     */
    skipAbilitySelection() {
        this.finishAbilitySelection();
    },

    /**
     * ローグライト: 能力を再抽選（HP5消費）
     */
    rerollAbilitySelection() {
        if (this.player.hp > 5) {
            this.player.hp -= 5;
            UI.updateHP(this.player.hp, this.player.maxHp);
            this.roguelite.currentChoices = null; // 現在の選択肢をクリア
            UI.hideAbilitySelection();
            // 少し遅延して新しい選択肢を表示
            setTimeout(() => {
                this.showAbilitySelection();
            }, 100);
        }
    },

    /**
     * ローグライト: 難易度を時間経過で更新
     */
    updateRogueliteDifficulty() {
        if (this.gameMode !== 'roguelite') return;

        // 経過時間を更新
        this.roguelite.elapsedTime = Date.now() - this.roguelite.startTime;
        const seconds = Math.floor(this.roguelite.elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);

        const difficultyLevels = ['easy', 'normal', 'hard', 'extreme'];
        const previousLevel = this.roguelite.currentDifficultyLevel;
        const previousMultiplier = this.roguelite.extremeMultiplier;

        if (minutes < 4) {
            // 0-3分: easy -> normal -> hard -> extreme
            this.roguelite.currentDifficultyLevel = minutes;
            this.difficulty = difficultyLevels[minutes];
            this.roguelite.extremeMultiplier = 1;
        } else {
            // 4分以降: extreme固定、倍率増加
            this.roguelite.currentDifficultyLevel = 3;
            this.difficulty = 'extreme';
            // 5秒毎に0.1増加（8倍の頻度）、最大30倍
            const extraSeconds = seconds - 180; // 3分以降の秒数
            const increments = Math.floor(extraSeconds / 5); // 5秒毎に1増加
            this.roguelite.extremeMultiplier = Math.min(30, 1 + increments * 0.1);
        }

        // 難易度が変わった場合、UIを更新
        if (previousLevel !== this.roguelite.currentDifficultyLevel ||
            previousMultiplier !== this.roguelite.extremeMultiplier) {
            const label = minutes >= 4
                ? `極み x${this.roguelite.extremeMultiplier.toFixed(1)}`
                : difficultyLevels[minutes];
            UI.updateDifficultyBadge(label);
        }
    },

    /**
     * ローグライト: 能力効果を取得
     */
    getAbilityEffect(abilityId) {
        if (this.gameMode !== 'roguelite') return null;

        const level = this.roguelite.abilities[abilityId] || 0;
        if (level === 0) return null;

        const ability = this.allAbilities.find(a => a.id === abilityId);
        if (!ability || !ability.getLevelEffect) return null;

        return ability.getLevelEffect(level);
    },

    /**
     * ローグライト: 現在のオーブ上限を取得
     */
    getMaxOrbs() {
        const baseMax = this.difficultySettings[this.difficulty].maxOrbs;
        const orbLimitEffect = this.getAbilityEffect('orbLimit');
        return orbLimitEffect || baseMax;
    },

    /**
     * ローグライト: オーブドロップ率ボーナスを取得
     */
    getOrbDropRateBonus() {
        return this.getAbilityEffect('orbDropRate') || 0;
    },

    /**
     * ローグライト: バー幅倍率を取得
     */
    getBarWidthMultiplier() {
        return this.getAbilityEffect('barWidth') || 1;
    },

    /**
     * ローグライト: オーブ吸収範囲を取得
     */
    getOrbAbsorbRadius() {
        return this.getAbilityEffect('orbAbsorb') || 0;
    },

    /**
     * ローグライト: ボールダメージを取得
     */
    getBallDamage() {
        return this.getAbilityEffect('ballDamage') || 1;
    },

    /**
     * ローグライト: スキルレベルを取得
     */
    getSkillLevel(skillId) {
        if (this.gameMode !== 'roguelite') return 1;

        const skill = this.roguelite.skills.find(s => s.id === skillId);
        return skill ? skill.level : 1;
    },

    /**
     * ローグライト: スキルレベル効果を取得
     */
    getSkillLevelEffect(skillId) {
        const level = this.getSkillLevel(skillId);
        const effectDef = this.skillLevelEffects[skillId];

        if (!effectDef || !effectDef.getEffect) {
            return null;
        }

        return effectDef.getEffect(level);
    },

    /**
     * カウントダウンを開始してからコールバックを実行
     */
    startCountdown(callback) {
        let count = 3;
        UI.showCountdown(count);

        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                UI.showCountdown(count);
            } else {
                clearInterval(countInterval);
                UI.hideCountdown();
                if (callback) callback();
            }
        }, 1000);
    },

    /**
     * ゲーム状態をリセット
     */
    resetGameState() {
        const settings = this.difficultySettings[this.difficulty];
        this.player = {
            hp: 10,
            maxHp: 10,
            score: 0,
            orbs: settings.initialOrbs || 0,
            combo: 0,
            comboBonus: 0, // 現在のコンボボーナス%
        };

        this.blocks = [];
        this.balls = [];
        this.orbs = [];
        this.explosions = [];
        this.gravityWells = []; // 重力井戸
        this.shockwaves = []; // 衝撃波エフェクト
        this.beamEffects = []; // ビームエフェクト
        this.confetti = []; // 紙吹雪エフェクト
        this.blockSpawnTimer = 0;

        UI.updateHP(this.player.hp, this.player.maxHp);
        UI.updateScore(this.player.score);
        UI.updateOrbs(this.player.orbs);
        UI.updateCombo(0, 0);
    },

    /**
     * ボールをパドル上にリセット
     */
    resetBall() {
        const ballX = this.paddle.x + this.paddle.width / 2;
        const ballY = this.paddle.y - 15; // ボール半径(10) + 余白
        const ball = new Ball(ballX, ballY, 10);

        // 初期速度設定（上向き、少しランダムな角度）
        const speed = 7;
        const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2); // 真上 ±0.2ラジアン

        ball.dx = Math.cos(angle) * speed;
        ball.dy = Math.sin(angle) * speed;
        ball.speed = speed;

        this.balls = [ball];
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

            // ローグライトモードでextremMultiplierが高い場合、HPが上昇
            if (this.gameMode === 'roguelite' && this.roguelite.extremeMultiplier > 1) {
                const mult = this.roguelite.extremeMultiplier;

                // 黒曜石ブロック（HP20）: 5倍以降で出現、10倍で最大20%
                if (mult >= 5) {
                    const obsidianChance = Math.min(0.20, (mult - 5) / (10 - 5) * 0.20);
                    if (Math.random() < obsidianChance) {
                        hp = 20;
                        this.blocks.push(new Block(x, y, this.blockWidth, this.blockHeight, hp));
                        continue;
                    }
                }

                // ダイヤモンドブロック（HP10）: 2倍以降で出現、10倍で最大20%
                if (mult >= 2) {
                    const diamondChance = Math.min(0.20, (mult - 2) / (10 - 2) * 0.20);
                    if (Math.random() < diamondChance) {
                        hp = 10;
                        this.blocks.push(new Block(x, y, this.blockWidth, this.blockHeight, hp));
                        continue; // 次の列のブロック生成へ（continueは内側のループに効く）
                    }
                }

                // extremeMultiplier 1→30 で、HP5の確率が0.08→1.0に増加
                // 30倍で全てHP5、途中では線形補間
                const allRedThreshold = 30;
                const redRatio = Math.min(1, (mult - 1) / (allRedThreshold - 1));

                // 基本的な確率分布をシフト
                // redRatioが1に近づくほど、全てHP5に
                if (rand < redRatio) {
                    hp = 5;
                } else {
                    // 通常の確率分布を残りの範囲で適用
                    const adjustedRand = (rand - redRatio) / (1 - redRatio);
                    if (adjustedRand < settings.highHpRatio * 0.2) {
                        hp = 5;
                    } else if (adjustedRand < settings.highHpRatio * 0.4) {
                        hp = 4;
                    } else if (adjustedRand < settings.highHpRatio * 0.7) {
                        hp = 3;
                    } else if (adjustedRand < settings.highHpRatio) {
                        hp = 2;
                    }
                }
            } else {
                // 通常モードまたはローグライト初期
                if (rand < settings.highHpRatio * 0.2) {
                    hp = 5;
                } else if (rand < settings.highHpRatio * 0.4) {
                    hp = 4;
                } else if (rand < settings.highHpRatio * 0.7) {
                    hp = 3;
                } else if (rand < settings.highHpRatio) {
                    hp = 2;
                }
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

        if (!this.paused) {
            if (!this.gameOver) {
                this.update();
            } else {
                // ゲームオーバー時もエフェクトだけは更新
                this.updateConfetti();
            }
        }

        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    },

    /**
     * ゲーム更新
     */
    update() {
        // ローグライト: 難易度自動更新
        if (this.gameMode === 'roguelite') {
            this.updateRogueliteDifficulty();
        }

        this.updatePaddle();
        this.updateBalls();
        this.updateBlocks();
        this.updateOrbs();
        this.updateExplosions();
        this.updateShockwaves(); // 衝撃波更新
        this.updateBeamEffects(); // ビームエフェクト更新
        this.updateGravityWells(); // 重力井戸更新
        this.updateConfetti(); // 紙吹雪更新
        this.spawnBlocks();
        this.checkGameOver();
        this.updateUI();

        // ローグライト: 能力獲得チェック
        if (this.gameMode === 'roguelite') {
            this.checkAbilityUnlock();
        }
    },


    /**
     * パドル更新
     */
    updatePaddle() {
        // バー幅能力効果を適用
        const baseWidth = 120;
        const widthMultiplier = this.getBarWidthMultiplier();
        const targetWidth = baseWidth * widthMultiplier;

        // 無敵スキルによる幅変更がなければ能力効果を適用
        if (!this.paddle.invincible) {
            this.paddle.width = targetWidth;
        }

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
                ball.ignoredGravityWell = null; // 壁衝突でリセット
            }

            // 天井との衝突
            if (ball.y - ball.radius <= 0) {
                ball.dy = -ball.dy;
                ball.y = ball.radius;
                ball.ignoredGravityWell = null; // 天井衝突でリセット
            }

            // 画面外に出たら削除
            if (ball.y > this.canvas.height + ball.radius) {
                // 分身ボールの場合はダメージなしで消滅のみ
                if (ball.isClone) {
                    this.balls.splice(i, 1);
                    continue;
                }

                // 通常ボールが落ちた場合
                this.player.hp--;
                this.player.combo = 0;
                this.player.comboBonus = 0;
                UI.updateCombo(0, 0);
                UI.updateHP(this.player.hp, this.player.maxHp);
                this.balls.splice(i, 1);

                // 通常ボールが全て消えたかチェック
                const normalBallsRemaining = this.balls.filter(b => !b.isClone).length;

                if (normalBallsRemaining === 0) {
                    if (this.player.hp > 0) {
                        // 少し遅延させてボールを復活
                        setTimeout(() => {
                            // 通常ボールが0で、まだHPがあれば復活
                            const stillNoNormalBalls = this.balls.filter(b => !b.isClone).length === 0;
                            if (stillNoNormalBalls && this.player.hp > 0) {
                                this.resetBall();
                            }
                        }, 500);
                    } else {
                        // ゲームオーバー
                        setTimeout(() => {
                            if (this.balls.length === 0 || this.balls.filter(b => !b.isClone).length === 0) {
                                this.checkGameOver();
                            }
                        }, 100);
                    }
                }
                continue;
            }

            // パドルとの衝突
            if (this.checkBallPaddleCollision(ball)) {
                ball.ignoredGravityWell = null; // パドル衝突でリセット
            }

            // ブロックとの衝突
            if (this.checkBallBlockCollisions(ball)) {
                ball.ignoredGravityWell = null; // ブロック衝突でリセット
            }

            // 重力井戸との相互作用
            if (this.gravityWells) {
                for (const well of this.gravityWells) {
                    if (well.finished) continue;

                    // 除外中の重力井戸はスキップ
                    if (ball.ignoredGravityWell === well) continue;

                    // 中心に触れたらその重力井戸を吸引対象外にする（跳ね返りなし）
                    if (well.checkCollision(ball)) {
                        ball.ignoredGravityWell = well;
                        continue;
                    }

                    // 吸引力を適用
                    const pull = well.calculatePull(ball);
                    ball.dx += pull.x;
                    ball.dy += pull.y;
                }
            }
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
            return true; // 衡突あり
        }
        return false; // 街突なし
    },

    /**
     * ボールとブロックの衝突判定
     */
    checkBallBlockCollisions(ball) {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (!block || block.destroyed) continue;

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

                        // 水平移動ボール対策: ブロック上下端15%に当たった場合は角度をつける
                        const blockHeight = bounds.bottom - bounds.top;
                        const edgeThreshold = blockHeight * 0.15;
                        const relativeY = ball.y - bounds.top;

                        if (relativeY < edgeThreshold) {
                            // 上端15%に当たった場合、上向きに角度をつける
                            ball.dy = -Math.abs(ball.speed * 0.3);
                        } else if (relativeY > blockHeight - edgeThreshold) {
                            // 下端15%に当たった場合、下向きに角度をつける
                            ball.dy = Math.abs(ball.speed * 0.3);
                        }
                    }
                    if (fromTop || fromBottom) {
                        ball.dy = -ball.dy;
                    }
                }

                // ダメージ処理（ボール強化能力適用、分身ボールは半減）
                let damage = this.getBallDamage();
                // 分身ボールのダメージ半減（小数点以下切り上げ）
                if (ball.damageMultiplier) {
                    damage = Math.ceil(damage * ball.damageMultiplier);
                }
                if (ball.penetrating) {
                    damage = block.maxHp; // 貫通時は一撃破壊
                    ball.usePenetrate();
                }

                const destroyed = block.takeDamage(damage);

                if (destroyed) {
                    this.onBlockDestroyed(block, i);

                    // 貫通時は衝撃波エフェクトを発生
                    if (ball.penetrating && this.shockwaves) {
                        const sw = new ShockwaveEffect(
                            block.x + block.width / 2,
                            block.y + block.height / 2
                        );
                        this.shockwaves.push(sw);
                    }
                }

                // 爆破ボールの爆発処理
                if (ball.explodable && ball.explodeCount > 0) {
                    this.createExplosion(ball.x, ball.y, ball.explodeRadius);
                    ball.explodeCount--;
                    if (ball.explodeCount <= 0) {
                        ball.explodable = false;
                    }
                }

                // 貫通でない場合は1つのブロックで停止
                if (!ball.penetrating) {
                    return true; // 街突あり
                }
            }
        }
        return false; // 街突なし
    },

    /**
     * ブロック破壊時の処理
     */
    onBlockDestroyed(block, index) {
        this.blocks.splice(index, 1);

        // コンボ加算
        this.player.combo++;

        // コンボボーナス計算
        // 10コンボごとに2%、100コンボごとに追加5%
        const tens = Math.floor(this.player.combo / 10);
        const hundreds = Math.floor(this.player.combo / 100);
        this.player.comboBonus = tens * 2 + hundreds * 5;

        // UI更新
        UI.updateCombo(this.player.combo, this.player.comboBonus);

        // スコア加算（コンボボーナス適用）
        const baseScore = block.maxHp * 100;
        const bonusMultiplier = 1 + (this.player.comboBonus / 100);
        const scoreGain = Math.floor(baseScore * bonusMultiplier);
        this.player.score += scoreGain;

        // オーブドロップ判定（ドロップ率ボーナス適用）
        const baseDropRate = 0.3;
        const dropRateBonus = this.getOrbDropRateBonus();
        if (Math.random() < baseDropRate + dropRateBonus) {
            const orb = new Orb(block.x + block.width / 2, block.y + block.height / 2);
            this.orbs.push(orb);
        }
    },

    /**
     * ブロック更新
     */
    updateBlocks() {
        const settings = this.difficultySettings[this.difficulty];

        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (!block || block.destroyed) continue;

            block.y += settings.blockSpeed;

            // パドルとの衝突判定
            const paddleBounds = this.paddle.getBounds();
            if (block.y + block.height >= paddleBounds.top &&
                block.y <= paddleBounds.bottom &&
                block.x + block.width >= paddleBounds.left &&
                block.x <= paddleBounds.right) {

                // バー無敵時はダメージなしで破壊
                if (this.player.invincible) {
                    block.takeDamage(999);
                    this.onBlockDestroyed(block, i);
                } else {
                    // 通常時は残耐久分のダメージを受けてブロック破壊
                    this.player.hp -= block.hp;
                    this.player.combo = 0;
                    this.player.comboBonus = 0;
                    UI.updateCombo(0, 0);
                    UI.updateHP(this.player.hp, this.player.maxHp);
                    this.onBlockDestroyed(block, i);

                    // HP確認
                    if (this.player.hp <= 0) {
                        this.triggerGameOver();
                        return;
                    }
                }
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
        const maxOrbs = this.getMaxOrbs();
        const absorbRadius = this.getOrbAbsorbRadius();

        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];

            // オーブ吸収能力: パドル方向に吸い寄せる
            if (absorbRadius > 0 && this.paddle) {
                const paddleCenterX = this.paddle.x + this.paddle.width / 2;
                const paddleCenterY = this.paddle.y;
                const dx = paddleCenterX - orb.x;
                const dy = paddleCenterY - orb.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 吸収範囲内なら引き寄せる
                const absorbRangePixels = absorbRadius * this.paddle.width;
                if (distance < absorbRangePixels && distance > 0) {
                    const pullStrength = 0.05 * (1 - distance / absorbRangePixels);
                    orb.x += dx * pullStrength;
                    orb.dy += 0.1; // 落下速度をやや増加
                }
            }

            orb.update();

            // パドルとの衝突
            if (orb.checkCollisionWithPaddle(this.paddle)) {
                this.player.orbs += orb.value;
                // オーブ上限を適用（動的に取得）
                if (this.player.orbs > maxOrbs) {
                    this.player.orbs = maxOrbs;
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
     * 重力井戸更新
     */
    updateGravityWells() {
        if (!this.gravityWells) return;

        for (let i = this.gravityWells.length - 1; i >= 0; i--) {
            const well = this.gravityWells[i];
            well.update();

            if (well.finished) {
                this.gravityWells.splice(i, 1);
            }
        }
    },

    /**
     * 衝撃波エフェクト更新
     */
    updateShockwaves() {
        if (!this.shockwaves) return;

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.update();

            if (sw.finished) {
                this.shockwaves.splice(i, 1);
            }
        }
    },

    /**
     * ビームエフェクト更新
     */
    updateBeamEffects() {
        if (!this.beamEffects) return;

        for (let i = this.beamEffects.length - 1; i >= 0; i--) {
            const beam = this.beamEffects[i];
            beam.update();

            if (beam.finished) {
                this.beamEffects.splice(i, 1);
            }
        }
    },

    /**
     * ゲームオーバー判定
     */
    checkGameOver() {
        // プレイヤーおよびパドルの存在確認
        if (!this.player || !this.paddle) return;

        // HP が 0 以下
        if (this.player.hp <= 0) {
            this.triggerGameOver();
            return;
        }

        // ブロックが画面下に到達したらダメージ（即ゲームオーバーではない）
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (!block || block.destroyed) continue;

            // 画面下に到達
            if (block.y + block.height >= this.canvas.height) {
                // 残耐久分のダメージ
                this.player.hp -= block.hp;
                this.player.combo = 0;
                this.player.comboBonus = 0;
                UI.updateCombo(0, 0);
                UI.updateHP(this.player.hp, this.player.maxHp);
                UI.showDamageFlash(); // ダメージフラッシュ

                // ブロックを破壊
                this.blocks.splice(i, 1);

                // HP確認
                if (this.player.hp <= 0) {
                    this.triggerGameOver();
                    return;
                }
            }
        }
    },

    /**
     * ゲームオーバーを発動
     */
    triggerGameOver() {
        this.gameOver = true;

        // ハイスコア判定
        const currentScore = this.player.score;
        const currentHighScore = this.highScores[this.difficulty] || 0;
        let isNewRecord = false;

        if (currentScore > currentHighScore) {
            this.highScores[this.difficulty] = currentScore;
            this.saveHighScores();
            isNewRecord = true;

            // 紙吹雪発射
            for (let i = 0; i < 100; i++) {
                const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                this.confetti.push(new Confetti(
                    this.canvas.width / 2 + (Math.random() * 200 - 100),
                    this.canvas.height,
                    color
                ));
            }
        }

        UI.showFinalScore(currentScore, Math.max(currentScore, currentHighScore), isNewRecord);
        UI.showOverlay('gameover');
    },

    /**
     * 紙吹雪更新
     */
    updateConfetti() {
        if (!this.confetti) return;
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.update();
            if (c.timer >= c.duration) {
                this.confetti.splice(i, 1);
            }
        }
    },

    /**
     * 紙吹雪描画
     */
    drawConfetti() {
        if (!this.confetti) return;
        for (const c of this.confetti) {
            c.draw(this.ctx);
        }
    },

    /**
     * UI更新
     */
    updateUI() {
        // プレイヤーとパドルの存在確認
        if (!this.player || !this.paddle) return;

        const settings = this.difficultySettings[this.difficulty];

        // スコアとオーブの表示更新
        UI.updateScore(this.player.score);
        UI.updateOrbs(this.player.orbs, settings.maxOrbs);

        // スキルボタンの状態更新
        let canExplode = false;
        for (const ball of this.balls) {
            if (ball.explodable) {
                canExplode = true;
                break;
            }
        }

        UI.updateSkillButtons(
            this.player.orbs,
            this.allSkills,
            this.selectedSkills,
            this.paddle.enhanced,
            canExplode
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

        // 重力井戸（背景側）
        if (this.gravityWells) {
            for (const well of this.gravityWells) {
                well.draw(this.ctx);
            }
        }

        // 爆発エフェクト
        for (const explosion of this.explosions) {
            explosion.draw(this.ctx);
        }

        // ブロック
        for (const block of this.blocks) {
            if (block) block.draw(this.ctx);
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

        // 衝撃波エフェクト
        if (this.shockwaves) {
            for (const sw of this.shockwaves) {
                sw.draw(this.ctx);
            }
        }

        // ビームエフェクト
        if (this.beamEffects) {
            for (const beam of this.beamEffects) {
                beam.draw(this.ctx);
            }
        }

        // 紙吹雪エフェクト
        this.drawConfetti();
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
     * スキルコストを取得
     */
    getSkillCost(id) {
        const skill = this.allSkills.find(s => s.id === id);
        return skill ? skill.cost : 999;
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
            const cost = this.getSkillCost('penetrate');
            this.player.orbs += Math.floor(cost / 2);
            UI.setSkillActive('penetrate', false);
        } else if (enhanceType === 'explode') {
            const cost = this.getSkillCost('explode');
            this.player.orbs += Math.floor(cost / 2);
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
        const cost = this.getSkillCost('penetrate');
        if (this.player.orbs >= cost && !this.paddle.enhanced) {
            this.player.orbs -= cost;
            // レベル効果: 貫通回数
            const penetrateCount = this.getSkillLevelEffect('penetrate') || 3;
            this.paddle.enhance('penetrate', penetrateCount);
            UI.setSkillActive('penetrate', true);
        }
    },

    /**
     * 爆破スキル発動
     */
    activateExplodeSkill() {
        const cost = this.getSkillCost('explode');
        if (this.player.orbs >= cost) {
            this.player.orbs -= cost;

            // レベル効果: 爆破半径と爆破回数
            const effect = this.getSkillLevelEffect('explode') || { radius: 3, count: 1 };
            const explodeRadius = effect.radius * this.blockWidth;
            const explodeCount = effect.count || 1;

            // 全てのボールを爆破状態に強化
            this.balls.forEach(ball => {
                ball.explodable = true;
                ball.explodeRadius = explodeRadius;
                ball.explodeCount = explodeCount;
            });
        }
    },

    /**
     * 分身スキル発動
     */
    activateCloneSkill() {
        const cost = this.getSkillCost('clone');
        if (this.player.orbs >= cost) {
            this.player.orbs -= cost;

            const newBalls = [];
            // レベル効果: 分身数
            const cloneCount = this.getSkillLevelEffect('clone') || 5;

            // 通常ボールのみを対象（分身ボールは対象外）
            const normalBalls = this.balls.filter(ball => !ball.isClone);

            normalBalls.forEach(ball => {
                for (let i = 0; i < cloneCount; i++) {
                    const clone = new Ball(ball.x, ball.y, ball.radius);
                    clone.isClone = true;
                    clone.speed = ball.speed;
                    clone.maxSpeed = ball.maxSpeed;
                    // 分身ボールの攻撃力は通常の半分
                    clone.damageMultiplier = 0.5;

                    // 角度を散らす
                    const angle = Math.atan2(ball.dy, ball.dx);
                    const spread = (Math.PI / 4) * (Math.random() - 0.5);
                    const newAngle = angle + spread;

                    clone.dx = Math.cos(newAngle) * clone.speed;
                    clone.dy = Math.sin(newAngle) * clone.speed;

                    // 下向きになりすぎないように調整
                    if (clone.dy > 0 && clone.y > this.canvas.height / 2) {
                        clone.dy = -Math.abs(clone.dy);
                    }

                    newBalls.push(clone);
                }
            });

            this.balls.push(...newBalls);
        }
    },

    /**
     * ビームスキル発動
     * パドルから真上にレーザーを発射
     */
    activateBeamSkill() {
        const cost = this.getSkillCost('beam');
        if (this.player.orbs >= cost) {
            this.player.orbs -= cost;

            // レベル効果: ダメージと幅倍率
            const effect = this.getSkillLevelEffect('beam') || { damage: 2, widthMult: 1 };
            const beamDamage = effect.damage || 2;
            const widthMult = effect.widthMult || 1;

            // ビーム幅はバーの幅を基準
            const beamWidth = this.paddle.width * widthMult;
            const beamX = this.paddle.x + this.paddle.width / 2;

            // 範囲内のブロックにダメージ
            this.damageBlocksInRect(beamX - beamWidth / 2, 0, beamWidth, this.canvas.height, beamDamage);

            // ビームエフェクト（水色のビーム）
            if (this.beamEffects) {
                const beam = new BeamEffect(beamX, 0, this.paddle.y, beamWidth);
                this.beamEffects.push(beam);
            }
        }
    },

    /**
     * 縦貫通スキル発動
     */
    activateVerticalPenetrateSkill() {
        const cost = this.getSkillCost('vPenetrate');
        if (this.player.orbs >= cost) {
            this.player.orbs -= cost;
            // レベル効果: 貫通回数
            const penetrateCount = this.getSkillLevelEffect('vPenetrate') || 3;

            this.balls.forEach(ball => {
                ball.dx = 0;
                ball.dy = -Math.abs(ball.speed);
                ball.penetrating = true;
                ball.penetrateCount = 0;
                ball.maxPenetrateCount = penetrateCount;
                ball.penetrateTimer = 300; // 5秒制限
            });
        }
    },

    /**
     * 横貫通スキル発動
     */
    activateHorizontalPenetrateSkill() {
        const cost = this.getSkillCost('hPenetrate');
        if (this.player.orbs >= cost) {
            this.player.orbs -= cost;
            // レベル効果: 貫通回数
            const penetrateCount = this.getSkillLevelEffect('hPenetrate') || 3;

            this.balls.forEach(ball => {
                ball.dy = 0;
                ball.dx = ball.speed;
                ball.penetrating = true;
                ball.penetrateCount = 0;
                ball.maxPenetrateCount = penetrateCount;
                ball.penetrateTimer = 300; // 5秒制限
            });
        }
    },

    /**
     * バー無敵スキル発動
     */
    activateBarInvincibleSkill() {
        const cost = this.getSkillCost('barInvincible');
        if (this.player.orbs >= cost && !this.player.invincible) {
            this.player.orbs -= cost;
            this.player.invincible = true;
            this.paddle.invincible = true;

            // レベル効果: 時間とバー幅
            const effect = this.getSkillLevelEffect('barInvincible') || { duration: 10, widthMult: 1 };
            const duration = effect.duration * 1000;
            const widthMult = effect.widthMult || 1;

            // バー幅を変更
            if (widthMult > 1) {
                this.paddle.width = this.paddle.width * widthMult;
            }

            setTimeout(() => {
                this.player.invincible = false;
                this.paddle.invincible = false;
                // バー幅を元に戻す（能力効果は残る）
            }, duration);
        }
    },

    /**
     * 重力球スキル発動
     * ボール位置に重力場を生成し、ボールを吸い寄せる
     */
    activateGravitySkill() {
        const cost = this.getSkillCost('gravity');
        if (this.player.orbs >= cost && this.balls.length > 0) {
            this.player.orbs -= cost;

            // レベル効果: 半径とパワー
            const effect = this.getSkillLevelEffect('gravity') || { radius: 5, power: 1 };
            const wellRadius = this.blockWidth * effect.radius;

            this.balls.forEach(ball => {
                const well = new GravityWell(ball.x, ball.y, wellRadius, effect.power);
                this.gravityWells.push(well);
            });
        }
    },

    /**
     *矩形範囲内のブロックにダメージを与える
     */
    damageBlocksInRect(x, y, width, height, damage) {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.destroyed) continue;

            // 矩形同士の衝突判定
            if (x < block.x + block.width &&
                x + width > block.x &&
                y < block.y + block.height &&
                y + height > block.y) {

                const destroyed = block.takeDamage(damage);
                if (destroyed) {
                    this.onBlockDestroyed(block, i);
                }
            }
        }
    },

    /**
     * バー爆破スキル発動
     * バーの縦位置を基準に、指定ブロック数分の範囲を横一掃で破壊（耐久無視）
     */
    activateBarExplodeSkill() {
        const cost = this.getSkillCost('barExplode');
        if (this.player.orbs >= cost) {
            this.player.orbs -= cost;

            // レベル効果: 爆破ブロック数
            const rangeBlocks = this.getSkillLevelEffect('barExplode') || 3;
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
    createExplosion(x, y, radius) {
        const explosionRadius = radius || 150; // デフォルトは150
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
                const destroyed = block.takeDamage(4); // ダメージを4に変更
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
        // ローグライトモードではスキル選択ボタンを非表示
        const skillRestartBtn = document.getElementById('restart-skill-btn');
        if (skillRestartBtn) {
            skillRestartBtn.style.display = this.gameMode === 'roguelite' ? 'none' : '';
        }
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
        // ゲームモードに応じて適切な方法でリスタート
        if (this.gameMode === 'roguelite') {
            this.startRogueliteGame();
        } else {
            this.startGame(this.difficulty);
        }
    },

    /**
     * スキル選択画面に戻る
     */
    returnToSkillSelect() {
        UI.hideAllOverlays();
        this.paused = false;
        this.running = false;
        this.showSkillSelection();
    },

    /**
     * スタート画面に戻る
     */
    returnToStart() {
        this.running = false;
        UI.hideAllOverlays();
        UI.showScreen('start');
        UI.updateMainMenuHighScores(this.highScores);
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
