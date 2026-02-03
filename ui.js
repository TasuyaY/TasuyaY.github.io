// ========================================
// UI管理
// ========================================

const UI = {
    screens: {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen')
    },
    overlays: {
        pause: document.getElementById('pause-overlay'),
        gameover: document.getElementById('gameover-overlay')
    },
    elements: {
        hpFill: document.getElementById('hp-fill'),
        scoreValue: document.getElementById('score-value'),
        orbValue: document.getElementById('orb-value'),
        difficultyBadge: document.getElementById('difficulty-badge'),
        finalScore: document.getElementById('final-score'),
        skillPenetrate: document.getElementById('skill-penetrate'),
        skillExplode: document.getElementById('skill-explode'),
        skillBarExplode: document.getElementById('skill-bar-explode'),
        skillCancel: document.getElementById('skill-cancel')
    },
    buttons: {
        difficulties: document.querySelectorAll('.btn-difficulty'),
        exit: document.getElementById('exit-btn'),
        pause: document.getElementById('pause-btn'),
        resume: document.getElementById('resume-btn'),
        restart: document.getElementById('restart-btn'),
        toStart: document.getElementById('to-start-btn'),
        pauseExit: document.getElementById('pause-exit-btn'),
        gameoverRestart: document.getElementById('gameover-restart-btn'),
        gameoverStart: document.getElementById('gameover-start-btn')
    },

    /**
     * 画面を切り替え
     */
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    },

    /**
     * オーバーレイを表示
     */
    showOverlay(overlayName) {
        if (this.overlays[overlayName]) {
            this.overlays[overlayName].classList.add('active');
        }
    },

    /**
     * オーバーレイを非表示
     */
    hideOverlay(overlayName) {
        if (this.overlays[overlayName]) {
            this.overlays[overlayName].classList.remove('active');
        }
    },

    /**
     * すべてのオーバーレイを非表示
     */
    hideAllOverlays() {
        Object.values(this.overlays).forEach(overlay => {
            overlay.classList.remove('active');
        });
    },

    /**
     * HPバーを更新
     */
    updateHP(current, max) {
        const percentage = (current / max) * 100;
        this.elements.hpFill.style.width = `${percentage}%`;

        // HPに応じて色を変更
        if (percentage > 50) {
            this.elements.hpFill.style.backgroundPosition = 'right';
        } else if (percentage > 25) {
            this.elements.hpFill.style.backgroundPosition = 'center';
        } else {
            this.elements.hpFill.style.backgroundPosition = 'left';
        }
    },

    /**
     * スコアを更新
     */
    updateScore(score) {
        this.elements.scoreValue.textContent = score.toLocaleString();
    },

    /**
     * オーブ数を更新
     */
    updateOrbs(orbs, maxOrbs) {
        if (maxOrbs) {
            this.elements.orbValue.textContent = `${orbs}/${maxOrbs}`;
        } else {
            this.elements.orbValue.textContent = orbs;
        }
    },

    /**
     * 難易度バッジを更新
     */
    updateDifficultyBadge(difficulty) {
        const labels = {
            easy: '簡単',
            normal: '普通',
            hard: '難しい',
            extreme: '極み'
        };
        const colors = {
            easy: '#44ff44',
            normal: '#00ffff',
            hard: '#ff8800',
            extreme: '#ff4444'
        };

        this.elements.difficultyBadge.textContent = labels[difficulty] || difficulty;
        this.elements.difficultyBadge.style.borderColor = colors[difficulty] || '#ffffff';
        this.elements.difficultyBadge.style.color = colors[difficulty] || '#ffffff';
    },

    /**
     * 最終スコアを表示
     */
    showFinalScore(score) {
        this.elements.finalScore.textContent = score.toLocaleString();
    },

    /**
     * スキルボタンの有効/無効を更新
     */
    updateSkillButtons(orbs, penetrateCost, explodeCost, barExplodeCost, paddleEnhanced, ballExplodable) {
        // 貫通スキル
        if (orbs >= penetrateCost && !paddleEnhanced) {
            this.elements.skillPenetrate.disabled = false;
        } else {
            this.elements.skillPenetrate.disabled = true;
        }

        // 爆破スキル
        if (ballExplodable) {
            // 爆破可能状態なら発動ボタンとして使用
            this.elements.skillExplode.disabled = false;
            this.elements.skillExplode.classList.add('explode-ready');
            this.elements.skillExplode.classList.remove('active');
        } else if (orbs >= explodeCost && !paddleEnhanced) {
            this.elements.skillExplode.disabled = false;
            this.elements.skillExplode.classList.remove('explode-ready');
        } else {
            this.elements.skillExplode.disabled = true;
            this.elements.skillExplode.classList.remove('explode-ready');
        }

        // バー爆破スキル
        if (orbs >= barExplodeCost) {
            this.elements.skillBarExplode.disabled = false;
        } else {
            this.elements.skillBarExplode.disabled = true;
        }

        // 解除ボタン（スキル発動待機中のみ有効）
        if (paddleEnhanced) {
            this.elements.skillCancel.disabled = false;
        } else {
            this.elements.skillCancel.disabled = true;
        }
    },

    /**
     * スキルボタンのアクティブ状態を設定
     */
    setSkillActive(skillName, active) {
        const btn = skillName === 'penetrate' ? this.elements.skillPenetrate : this.elements.skillExplode;
        if (active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    },

    /**
     * イベントリスナーを設定
     */
    setupEventListeners(callbacks) {
        // 難易度選択ボタン
        this.buttons.difficulties.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                if (callbacks.onDifficultySelect) {
                    callbacks.onDifficultySelect(difficulty);
                }
            });
        });

        // 終了ボタン
        this.buttons.exit.addEventListener('click', () => {
            if (callbacks.onExit) callbacks.onExit();
        });

        // ポーズボタン
        this.buttons.pause.addEventListener('click', () => {
            if (callbacks.onPause) callbacks.onPause();
        });

        // 再開ボタン
        this.buttons.resume.addEventListener('click', () => {
            if (callbacks.onResume) callbacks.onResume();
        });

        // リスタートボタン
        this.buttons.restart.addEventListener('click', () => {
            if (callbacks.onRestart) callbacks.onRestart();
        });

        // スタート画面に戻るボタン
        this.buttons.toStart.addEventListener('click', () => {
            if (callbacks.onToStart) callbacks.onToStart();
        });

        // ポーズ中の終了ボタン
        this.buttons.pauseExit.addEventListener('click', () => {
            if (callbacks.onExit) callbacks.onExit();
        });

        // ゲームオーバー時のリスタート
        this.buttons.gameoverRestart.addEventListener('click', () => {
            if (callbacks.onRestart) callbacks.onRestart();
        });

        // ゲームオーバー時のスタート画面に戻る
        this.buttons.gameoverStart.addEventListener('click', () => {
            if (callbacks.onToStart) callbacks.onToStart();
        });

        // スキルボタン
        this.elements.skillPenetrate.addEventListener('click', () => {
            if (callbacks.onSkillPenetrate) callbacks.onSkillPenetrate();
        });

        this.elements.skillExplode.addEventListener('click', () => {
            if (callbacks.onSkillExplode) callbacks.onSkillExplode();
        });

        this.elements.skillBarExplode.addEventListener('click', () => {
            if (callbacks.onSkillBarExplode) callbacks.onSkillBarExplode();
        });

        this.elements.skillCancel.addEventListener('click', () => {
            if (callbacks.onSkillCancel) callbacks.onSkillCancel();
        });
    }
};
