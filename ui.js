// ========================================
// UI管理
// ========================================

const UI = {

    screens: {
        start: document.getElementById('start-screen'),
        difficulty: document.getElementById('difficulty-screen'),
        skillSelect: document.getElementById('skill-select-screen'),
        game: document.getElementById('game-screen')
    },
    overlays: {
        pause: document.getElementById('pause-overlay'),
        gameover: document.getElementById('gameover-overlay'),
        help: document.getElementById('help-overlay'),
        ability: document.getElementById('ability-overlay'),
        skillSwap: document.getElementById('skill-swap-overlay')
    },
    elements: {
        hpFill: document.getElementById('hp-fill'),
        scoreValue: document.getElementById('score-value'),
        orbValue: document.getElementById('orb-value'),
        difficultyBadge: document.getElementById('difficulty-badge'),
        finalScore: document.getElementById('final-score'),
        skillBar: document.getElementById('skill-bar'),
        skillList: document.getElementById('skills-list'),
        selectedSlots: document.querySelectorAll('.selected-skill-slot'),
        gameStartBtn: document.getElementById('game-start-btn'),
        abilityChoices: document.getElementById('ability-choices'),
        skillSwapChoices: document.getElementById('skill-swap-choices')
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
        gameoverStart: document.getElementById('gameover-start-btn'),
        backToDifficulty: document.getElementById('back-to-difficulty-btn'),
        restartSkill: document.getElementById('restart-skill-btn'),
        startHelp: document.getElementById('start-help-btn'),
        pauseHelp: document.getElementById('pause-help-btn'),
        helpBack: document.getElementById('help-back-btn'),
        modeNormal: document.getElementById('mode-normal-btn'),
        modeRoguelite: document.getElementById('mode-roguelite-btn'),
        backToMode: document.getElementById('back-to-mode-btn'),
        skillSwapCancel: document.getElementById('skill-swap-cancel-btn')
    },

    // コールバック保持
    callbacks: {},

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
     * 最終スコアを表示（ゲームオーバー画面用）
     */
    /**
     * 最終スコアを表示（ゲームオーバー画面用）
     */
    showFinalScore(score, highScore, isNewRecord) {
        const finalScoreEl = document.getElementById('final-score');
        const highScoreContainer = document.getElementById('final-highscore-container');
        const highScoreEl = document.getElementById('final-highscore');
        const newRecordMsg = document.getElementById('new-record-msg');

        if (finalScoreEl) {
            finalScoreEl.textContent = score.toLocaleString();
        }

        if (highScoreContainer && highScoreEl) {
            highScoreContainer.style.display = 'block';
            highScoreEl.textContent = highScore.toLocaleString();

            if (isNewRecord && newRecordMsg) {
                newRecordMsg.style.display = 'block';
                newRecordMsg.textContent = 'NEW RECORD!!';
            } else if (newRecordMsg) {
                newRecordMsg.style.display = 'none';
            }
        }
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
     * コンボ数を更新
     */
    updateCombo(combo, bonus) {
        const comboEl = document.getElementById('combo-container');
        const comboValueEl = document.getElementById('combo-value');
        const comboBonusEl = document.getElementById('combo-bonus');

        if (comboEl && comboValueEl && comboBonusEl) {
            if (combo > 0) {
                comboEl.style.display = 'flex';
                comboValueEl.textContent = `${combo} COMBO`;
                if (bonus > 0) {
                    comboBonusEl.textContent = `+${bonus}%`;
                    comboBonusEl.style.display = 'block';
                } else {
                    comboBonusEl.style.display = 'none';
                }
            } else {
                comboEl.style.display = 'none';
            }
        }
    },

    /**
     * メインメニューのハイスコア表示を更新
     */
    updateMainMenuHighScores(highScores) {
        const difficultyButtons = document.querySelectorAll('.btn-difficulty');
        difficultyButtons.forEach(btn => {
            const difficulty = btn.dataset.difficulty;
            const score = highScores[difficulty] || 0;

            let scoreEl = btn.querySelector('.highscore-display');
            if (!scoreEl) {
                scoreEl = document.createElement('div');
                scoreEl.className = 'highscore-display';
                scoreEl.style.fontSize = '0.8rem';
                scoreEl.style.color = '#ffd700';
                scoreEl.style.marginTop = '4px';
                btn.appendChild(scoreEl);
            }
            scoreEl.textContent = `ハイスコア: ${score.toLocaleString()}`;
        });
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
     * スキル選択リストを描画
     */
    renderSkillsList(allSkills, selectedSkills) {
        this.elements.skillList.innerHTML = '';

        allSkills.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            if (selectedSkills.includes(skill.id)) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="skill-card-icon">${skill.icon}</div>
                <div class="skill-card-name">${skill.name}</div>
                <div class="skill-card-cost">${skill.cost}</div>
            `;

            card.addEventListener('click', () => {
                if (this.callbacks.onSkillSelectToggle) {
                    this.callbacks.onSkillSelectToggle(skill.id);
                }
            });

            this.elements.skillList.appendChild(card);
        });

        // 選択スロットの更新
        this.updateSelectedSlots(allSkills, selectedSkills);

        // 開始ボタンの状態更新
        if (selectedSkills.length === 3) {
            this.elements.gameStartBtn.classList.remove('disabled');
        } else {
            this.elements.gameStartBtn.classList.add('disabled');
        }
    },

    /**
     * 選択スロットを更新
     */
    updateSelectedSlots(allSkills, selectedSkills) {
        this.elements.selectedSlots.forEach((slot, index) => {
            const skillId = selectedSkills[index];
            if (skillId) {
                const skill = allSkills.find(s => s.id === skillId);
                slot.className = 'selected-skill-slot filled';
                slot.innerHTML = `
                    <div style="font-size: 1.5rem;">${skill.icon}</div>
                    <div>${skill.name}</div>
                `;
                slot.onclick = () => {
                    if (this.callbacks.onSkillSelectToggle) {
                        this.callbacks.onSkillSelectToggle(skillId);
                    }
                };
            } else {
                slot.className = 'selected-skill-slot';
                slot.textContent = '空き';
                slot.onclick = null;
            }
        });
    },



    /**
     * ヘルプ画面のスキル一覧を生成
     */
    renderHelpSkills(skills) {
        const container = document.getElementById('help-skills-list');
        if (!container) return;

        container.innerHTML = '';

        Object.values(skills).forEach(skill => {
            const skillItem = document.createElement('div');
            skillItem.className = 'help-skill-item';

            const icon = document.createElement('div');
            icon.className = 'help-skill-icon';
            // アイコン表示
            icon.textContent = skill.icon;

            const info = document.createElement('div');
            info.className = 'help-skill-info';

            const name = document.createElement('div');
            name.className = 'help-skill-name';
            name.textContent = skill.name;

            const cost = document.createElement('div');
            cost.className = 'help-skill-cost';
            cost.textContent = `消費オーブ: ${skill.cost}`;

            const desc = document.createElement('div');
            desc.className = 'help-skill-desc';
            desc.textContent = skill.description;

            info.appendChild(name);
            info.appendChild(cost);
            info.appendChild(desc);

            skillItem.appendChild(icon);
            skillItem.appendChild(info);

            container.appendChild(skillItem);
        });
    },

    /**
     * ゲーム画面のスキルバーを描画（動的生成）
     */
    renderSkillBar(allSkills, selectedSkills) {
        this.elements.skillBar.innerHTML = '';

        // カギカッコ付きキー割り当てガイド (固定: 1番目=Q, 2番目=E, 3番目=R)
        const keys = ['Q', 'E', 'R'];

        selectedSkills.forEach((skillId, index) => {
            const skill = allSkills.find(s => s.id === skillId);
            if (!skill) return;

            const btn = document.createElement('button');
            btn.className = 'skill-btn';
            btn.dataset.skillId = skillId;
            btn.disabled = true;
            btn.id = `skill-btn-${skillId}`;

            btn.innerHTML = `
                <div class="skill-key">${keys[index]}</div>
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-cost">${skill.cost}</div>
            `;

            btn.addEventListener('click', () => {
                if (this.callbacks.onSkillTrigger) {
                    this.callbacks.onSkillTrigger(skillId);
                }
            });

            this.elements.skillBar.appendChild(btn);
        });

        // セパレーター
        const separator = document.createElement('div');
        separator.className = 'skill-separator';
        this.elements.skillBar.appendChild(separator);

        // キャンセルボタン
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'skill-btn skill-cancel';
        cancelBtn.id = 'skill-cancel';
        cancelBtn.disabled = true;
        cancelBtn.innerHTML = `
            <div class="skill-key">C</div>
            <div class="skill-icon">↩️</div>
            <div class="skill-name">解除</div>
            <div class="skill-cost">返金</div>
        `;

        cancelBtn.addEventListener('click', () => {
            if (this.callbacks.onSkillCancel) {
                this.callbacks.onSkillCancel();
            }
        });

        this.elements.skillBar.appendChild(cancelBtn);
    },

    /**
     * スキルボタンの有効/無効を更新
     */
    updateSkillButtons(orbs, allSkills, selectedSkills, paddleEnhanced, ballExplodable) {
        selectedSkills.forEach(skillId => {
            const skill = allSkills.find(s => s.id === skillId);
            const btn = document.getElementById(`skill-btn-${skillId}`);
            if (!btn || !skill) return;

            // 爆破スキルの特殊判定
            if (skillId === 'explode' && ballExplodable) {
                btn.disabled = false;
                btn.classList.add('explode-ready');
            } else if (orbs >= skill.cost && !paddleEnhanced) {
                btn.disabled = false;
                btn.classList.remove('explode-ready');
            } else {
                btn.disabled = true;
                btn.classList.remove('explode-ready');
            }
        });

        // 解除ボタン
        const cancelBtn = document.getElementById('skill-cancel');
        if (cancelBtn) {
            cancelBtn.disabled = !paddleEnhanced;
        }
    },

    /**
     * スキルボタンのアクティブ状態を設定
     */
    setSkillActive(skillId, active) {
        const btn = document.getElementById(`skill-btn-${skillId}`);
        if (!btn) return;

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
        this.callbacks = callbacks; // コールバックを保存

        // 難易度選択ボタン
        this.buttons.difficulties.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                if (callbacks.onDifficultySelect) {
                    callbacks.onDifficultySelect(difficulty);
                }
            });
        });

        // 戻るボタン
        if (this.buttons.backToDifficulty) {
            this.buttons.backToDifficulty.addEventListener('click', () => {
                if (callbacks.onBackToDifficulty) callbacks.onBackToDifficulty();
            });
        }

        // ゲーム開始ボタン
        if (this.elements.gameStartBtn) {
            this.elements.gameStartBtn.addEventListener('click', () => {
                // disabledでない場合のみ発火
                if (!this.elements.gameStartBtn.classList.contains('disabled')) {
                    if (callbacks.onGameStart) callbacks.onGameStart();
                }
            });
        }

        // 終了ボタン
        this.buttons.exit.addEventListener('click', () => {
            if (callbacks.onExit) callbacks.onExit();
        });

        // ヘッダ（HUD）クリックでポーズ
        const gameHud = document.getElementById('game-hud');
        if (gameHud) {
            gameHud.addEventListener('click', () => {
                if (callbacks.onPause) callbacks.onPause();
            });
        }

        /* ポーズボタン削除に伴い廃止
        // ポーズボタン
        this.buttons.pause.addEventListener('click', () => {
            if (callbacks.onPause) callbacks.onPause();
        });
        */

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

        // スキル選択からやり直し
        if (this.buttons.restartSkill) {
            this.buttons.restartSkill.addEventListener('click', () => {
                if (callbacks.onRestartSkill) callbacks.onRestartSkill();
            });
        }

        // スタート画面のヘルプ
        if (this.buttons.startHelp) {
            this.buttons.startHelp.addEventListener('click', () => {
                this.showOverlay('help');
                if (callbacks.onShowHelp) callbacks.onShowHelp();
            });
        }

        // ポーズ画面のヘルプ
        if (this.buttons.pauseHelp) {
            this.buttons.pauseHelp.addEventListener('click', () => {
                this.showOverlay('help');
                if (callbacks.onShowHelp) callbacks.onShowHelp();
            });
        }

        // ヘルプ画面の閉じる
        if (this.buttons.helpBack) {
            this.buttons.helpBack.addEventListener('click', () => {
                this.hideOverlay('help');
            });
        }

        // モード選択: 通常モード
        if (this.buttons.modeNormal) {
            this.buttons.modeNormal.addEventListener('click', () => {
                if (callbacks.onModeNormal) callbacks.onModeNormal();
            });
        }

        // モード選択: ローグライト
        if (this.buttons.modeRoguelite) {
            this.buttons.modeRoguelite.addEventListener('click', () => {
                if (callbacks.onModeRoguelite) callbacks.onModeRoguelite();
            });
        }

        // 難易度選択画面の戻る
        if (this.buttons.backToMode) {
            this.buttons.backToMode.addEventListener('click', () => {
                this.showScreen('start');
            });
        }

        // スキル入れ替えキャンセル
        if (this.buttons.skillSwapCancel) {
            this.buttons.skillSwapCancel.addEventListener('click', () => {
                this.hideOverlay('skillSwap');
                if (callbacks.onSkillSwapCancel) callbacks.onSkillSwapCancel();
            });
        }
    },

    /**
     * 能力選択UIを表示
     */
    showAbilitySelection(choices, onSelect, onSkip, onReroll, canReroll) {
        const container = this.elements.abilityChoices;
        if (!container) return;

        container.innerHTML = '';

        choices.forEach((choice, index) => {
            const card = document.createElement('div');
            card.className = 'ability-card';

            // スキルかどうか判定
            const isSkill = choice.isSkill;
            if (isSkill) {
                card.classList.add('ability-card-skill');
            }

            const icon = document.createElement('div');
            icon.className = 'ability-card-icon';
            icon.textContent = choice.icon || '?';

            const info = document.createElement('div');
            info.className = 'ability-card-info';

            const name = document.createElement('div');
            name.className = 'ability-card-name';
            name.textContent = choice.name;

            const level = document.createElement('div');
            level.className = 'ability-card-level';
            if (choice.currentLevel !== undefined && choice.maxLevel) {
                level.textContent = `Lv.${choice.currentLevel} → ${choice.currentLevel + 1}/${choice.maxLevel}`;
            } else if (choice.isInstant) {
                level.textContent = '即時効果';
            }

            const desc = document.createElement('div');
            desc.className = 'ability-card-desc';
            desc.textContent = choice.description || '';

            info.appendChild(name);
            info.appendChild(level);
            info.appendChild(desc);
            card.appendChild(icon);
            card.appendChild(info);

            card.addEventListener('click', () => {
                if (onSelect) onSelect(choice, index);
            });

            container.appendChild(card);
        });

        // アクションボタンコンテナを作成
        const actionContainer = document.createElement('div');
        actionContainer.className = 'ability-actions';

        // スキップボタン
        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn ability-btn ability-btn-skip';
        skipBtn.innerHTML = '<span class="btn-text">何もしない</span>';
        skipBtn.addEventListener('click', () => {
            if (onSkip) onSkip();
        });
        actionContainer.appendChild(skipBtn);

        // 再抽選ボタン
        const rerollBtn = document.createElement('button');
        rerollBtn.className = 'btn ability-btn ability-btn-reroll';
        rerollBtn.innerHTML = '<span class="btn-text">再抽選 (HP-5)</span>';
        rerollBtn.disabled = !canReroll;
        rerollBtn.addEventListener('click', () => {
            if (onReroll && canReroll) onReroll();
        });
        actionContainer.appendChild(rerollBtn);

        container.appendChild(actionContainer);

        this.showOverlay('ability');
    },

    /**
     * 能力選択UIを非表示
     */
    hideAbilitySelection() {
        this.hideOverlay('ability');
    },

    /**
     * スキル入れ替えUIを表示
     */
    showSkillSwapSelection(currentSkills, newSkill, onSelect) {
        const container = this.elements.skillSwapChoices;
        if (!container) return;

        container.innerHTML = '';

        currentSkills.forEach((skill, index) => {
            const card = document.createElement('div');
            card.className = 'skill-swap-card';

            const icon = document.createElement('div');
            icon.className = 'skill-swap-icon';
            icon.textContent = skill.icon || '?';

            const name = document.createElement('div');
            name.className = 'skill-swap-name';
            name.textContent = `${skill.name} Lv.${skill.level}`;

            card.appendChild(icon);
            card.appendChild(name);

            card.addEventListener('click', () => {
                if (onSelect) onSelect(index);
            });

            container.appendChild(card);
        });

        this.showOverlay('skillSwap');
    },

    /**
     * スキル入れ替えUIを非表示
     */
    hideSkillSwapSelection() {
        this.hideOverlay('skillSwap');
    },

    /**
     * カウントダウン表示
     */
    showCountdown(count) {
        let overlay = document.getElementById('countdown-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'countdown-overlay';
            overlay.className = 'countdown-overlay';
            document.body.appendChild(overlay);
        }
        overlay.textContent = count;
        overlay.style.display = 'flex';
        overlay.classList.add('countdown-animate');
        // アニメーション再トリガー
        setTimeout(() => overlay.classList.remove('countdown-animate'), 100);
    },

    /**
     * カウントダウン非表示
     */
    hideCountdown() {
        const overlay = document.getElementById('countdown-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    /**
     * ダメージフラッシュ表示
     */
    showDamageFlash() {
        let flash = document.getElementById('damage-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.id = 'damage-flash';
            flash.className = 'damage-flash';
            document.body.appendChild(flash);
        }
        flash.classList.remove('active');
        // 強制リフロー
        void flash.offsetWidth;
        flash.classList.add('active');
    },
};

