document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // --- 오디오 엔진 (새로운 '찰진 나무 딱 소리') ---
    // ===================================================================
    let audioContext;
    let convolverNode;
    let impulseResponseBuffer;
    const impulseResponseUrl = 'https://webaudio.github.io/web-audio-api/samples/audio/impulse-responses/small-drum-room.wav';
    const BPM = 100;
    const beatInterval = 60000 / BPM; // 600ms

    async function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    }

    async function loadImpulseResponse(url) {
        try {
            await initAudioContext();
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            impulseResponseBuffer = await audioContext.decodeAudioData(arrayBuffer);
            convolverNode = audioContext.createConvolver();
            convolverNode.buffer = impulseResponseBuffer;
            console.log('Impulse response loaded successfully.');
        } catch (e) {
            console.error('Error loading impulse response:', e);
            impulseResponseBuffer = null;
        }
    }

    function playCrispWoodTak() {
        if (!audioContext || audioContext.state === 'closed') {
            console.error("AudioContext is not initialized or closed.");
            return;
        }
        const now = audioContext.currentTime;
        const fundamentalFreq = 500, overtones = [{ multiplier: 1.6, gain: 0.8, decay: 0.12, type: 'triangle' }, { multiplier: 2.8, gain: 0.6, decay: 0.09, type: 'square' }, { multiplier: 3.5, gain: 0.4, decay: 0.07, type: 'sawtooth' }], noiseAmount = 0.95, noiseDuration = 0.03, oscAttack = 0.0006, oscDecay = 0.15, noiseAttack = 0.0005, noiseDecay = 0.03, pitchBend = 0.06, filterType = 'bandpass', filterFreq = 800, filterQ = 3.0, reverbDry = 0.8, reverbWet = 0.2;
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * noiseDuration, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) noiseData[i] = Math.random() * 2 - 1;
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(noiseAmount, now + noiseAttack);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDecay);
        noiseGain.gain.setValueAtTime(0, now + noiseDecay + 0.005);
        noiseSource.connect(noiseGain);
        const oscSources = [];
        const mainOsc = audioContext.createOscillator();
        mainOsc.type = 'triangle';
        mainOsc.frequency.setValueAtTime(fundamentalFreq, now);
        if (pitchBend > 0) {
            mainOsc.frequency.linearRampToValueAtTime(fundamentalFreq * (1 + pitchBend), now + 0.001);
            mainOsc.frequency.linearRampToValueAtTime(fundamentalFreq * (1 - pitchBend * 0.5), now + 0.003);
            mainOsc.frequency.linearRampToValueAtTime(fundamentalFreq, now + 0.005);
        }
        const mainOscGain = audioContext.createGain();
        mainOscGain.gain.setValueAtTime(0, now);
        mainOscGain.gain.linearRampToValueAtTime(0.8, now + oscAttack);
        mainOscGain.gain.exponentialRampToValueAtTime(0.001, now + oscDecay);
        mainOscGain.gain.setValueAtTime(0, now + oscDecay + 0.005);
        mainOsc.connect(mainOscGain);
        oscSources.push({ osc: mainOsc, gain: mainOscGain, duration: oscDecay + 0.005 });
        overtones.forEach(ot => {
            const o = audioContext.createOscillator();
            o.type = ot.type || 'sine';
            o.frequency.setValueAtTime(fundamentalFreq * ot.multiplier, now);
            const g = audioContext.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(ot.gain, now + oscAttack);
            g.gain.exponentialRampToValueAtTime(0.001, now + ot.decay);
            g.gain.setValueAtTime(0, now + ot.decay + 0.005);
            o.connect(g);
            oscSources.push({ osc: o, gain: g, duration: ot.decay + 0.005 });
        });
        const masterGain = audioContext.createGain();
        noiseGain.connect(masterGain);
        mainOscGain.connect(masterGain);
        oscSources.filter(s => s !== mainOsc).forEach(s => s.gain.connect(masterGain));
        let currentNode = masterGain;
        const filter = audioContext.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(filterQ, now);
        masterGain.connect(filter);
        currentNode = filter;
        if (convolverNode && impulseResponseBuffer) {
            const dryGain = audioContext.createGain();
            const wetGain = audioContext.createGain();
            dryGain.gain.value = reverbDry;
            wetGain.gain.value = reverbWet;
            currentNode.connect(dryGain);
            currentNode.connect(convolverNode);
            dryGain.connect(audioContext.destination);
            convolverNode.connect(wetGain);
            wetGain.connect(audioContext.destination);
        } else {
            currentNode.connect(audioContext.destination);
        }
        noiseSource.start(now);
        noiseSource.stop(now + noiseDuration + 0.005);
        mainOsc.start(now);
        mainOsc.stop(now + oscDecay + 0.005);
        oscSources.forEach(s => {
            if (s.osc !== mainOsc) {
                s.osc.start(now);
                s.osc.stop(now + s.duration);
            }
        });
    }

    async function playBeats(count) {
        await initAudioContext();
        for (let i = 0; i < count; i++) {
            playCrispWoodTak();
            await new Promise(resolve => setTimeout(resolve, beatInterval));
        }
    }

    // ===================================================================
    // --- 공용 기능 (비밀번호 변경 등) ---
    // ===================================================================
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('password-modal');
    const closeModalBtn = document.querySelector('.modal .close-btn');
    const submitPasswordChangeBtn = document.getElementById('submit-password-change');

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalError = document.getElementById('modal-error');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            if (modalError) modalError.textContent = '';
            passwordModal.style.display = 'block';
        });
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            passwordModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target == passwordModal) {
            passwordModal.style.display = 'none';
        }
    });

    if (submitPasswordChangeBtn) {
        submitPasswordChangeBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const modalError = document.getElementById('modal-error');

            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                passwordModal.style.display = 'none';
            } else {
                modalError.textContent = result.message;
            }
        });
    }

    // ===================================================================
    // --- 참가자 대시보드 기능 ---
    // ===================================================================
    const playBtn = document.getElementById('play-btn');
    const gameControls = document.getElementById('game-controls');
    const guessInput = document.getElementById('guess-input');
    const submitGuessBtn = document.getElementById('submit-guess-btn');
    const resultMessage = document.getElementById('result-message');

    if (playBtn) {
        playBtn.addEventListener('click', async () => {
            playBtn.disabled = true;
            playBtn.textContent = '재생 중...';
            if (resultMessage) resultMessage.textContent = '';

            try {
                const response = await fetch('/api/play', { method: 'POST' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '게임을 시작할 수 없습니다.');
                }
                const data = await response.json();
                await playBeats(data.beatCount);
                playBtn.textContent = '박자 듣기 완료!';
                gameControls.classList.add('visible');
                guessInput.focus();
            } catch (error) {
                console.error('Error:', error);
                if (resultMessage) {
                    resultMessage.textContent = error.message || '오류가 발생했습니다. 다시 시도해주세요.';
                    resultMessage.className = 'result-message incorrect';
                }
                playBtn.disabled = false;
                playBtn.textContent = '박자 듣기';
            }
        });
    }

    if (submitGuessBtn) {
        submitGuessBtn.addEventListener('click', async () => {
            const guess = guessInput.value;
            if (!guess) {
                alert('추측한 숫자를 입력하세요.');
                return;
            }
            submitGuessBtn.disabled = true;
            const response = await fetch('/api/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guess })
            });
            const result = await response.json();
            if (result.success) {
                let message = `결과: 내가 추측한 답은 ${result.guess}, 정답은 ${result.correctAnswer} 입니다. `;
                if (result.guess == result.correctAnswer) {
                    message += '🎉 정답입니다!';
                    resultMessage.className = 'result-message correct';
                } else {
                    message += '😢 아쉽네요. 다음 기회에!';
                    resultMessage.className = 'result-message incorrect';
                }
                resultMessage.innerHTML = message;
                const gameSection = document.getElementById('game-section');
                if (gameSection) gameSection.innerHTML += '<p>결과가 기록되었습니다. 페이지를 새로고침하여 다음 도전을 확인하세요.</p>';
            } else {
                resultMessage.textContent = result.message || '오류가 발생했습니다.';
                resultMessage.className = 'result-message incorrect';
                submitGuessBtn.disabled = false;
            }
        });
    }

    // ===================================================================
    // --- 관리자 대시보드 기능 ---
    // ===================================================================
    if (document.body.contains(document.getElementById('auto-register-toggle'))) {
        window.adminActions = {
            toggleAutoReg: async () => {
                await fetch('/api/admin/toggle-autoreg', { method: 'POST' });
            },
            setBeatRange: async (range) => {
                await fetch('/api/admin/set-range', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ range })
                });
            },
            fetchHistory: async (date) => {
                const response = await fetch(`/api/admin/history?date=${date}`);
                const logs = await response.json();
                document.querySelectorAll('.history-log').forEach(el => {
                    el.textContent = '기록 없음';
                    el.style.color = 'inherit';
                });
                logs.forEach(log => {
                    const el = document.querySelector(`.history-log[data-username="${log.username}"]`);
                    if (el) {
                        el.textContent = `추측: ${log.guess}, 정답: ${log.answer}`;
                        el.style.color = log.guess === log.answer ? 'var(--success-color)' : 'var(--error-color)';
                    }
                });
            },
            changeUsername: async (currentUsername) => {
                const newUsername = prompt(`'${currentUsername}'의 새 사용자 이름을 입력하세요:`);
                if (newUsername && newUsername.trim() !== '') {
                    await fetch('/api/admin/update-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentUsername, newUsername: newUsername.trim() })
                    });
                    location.reload();
                }
            },
            changePassword: async (username) => {
                const newPassword = prompt(`'${username}'의 새 비밀번호를 입력하세요:`);
                if (newPassword && newPassword.trim() !== '') {
                    await fetch('/api/admin/update-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentUsername: username, newPassword: newPassword.trim() })
                    });
                    alert(`'${username}'의 비밀번호가 변경되었습니다.`);
                }
            },
            grantAttempt: async (username) => {
                const res = await fetch('/api/admin/grant-attempt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                if (res.ok) alert(`'${username}'에게 추가 도전 기회 1회를 부여했습니다.`);
            },
            togglePasswordLock: async (username) => {
                await fetch('/api/admin/toggle-password-lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
            },
            deleteUser: async (username) => {
                if (confirm(`정말로 '${username}' 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                    try {
                        const response = await fetch('/api/admin/delete-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username })
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert(result.message);
                            location.reload();
                        } else {
                            throw new Error(result.message);
                        }
                    } catch (error) {
                        alert('오류가 발생했습니다: ' + error.message);
                    }
                }
            },
        };

        const autoRegisterToggle = document.getElementById('auto-register-toggle');
        const beatRangeSelect = document.getElementById('beat-range-select');
        const historyDateInput = document.getElementById('history-date');
        
        if(autoRegisterToggle) autoRegisterToggle.addEventListener('change', () => adminActions.toggleAutoReg());
        if(beatRangeSelect) beatRangeSelect.addEventListener('change', (e) => adminActions.setBeatRange(e.target.value));
        if(historyDateInput) {
            historyDateInput.addEventListener('change', (e) => adminActions.fetchHistory(e.target.value));
            adminActions.fetchHistory(historyDateInput.value);
        }
    }

    // ===================================================================
    // --- 페이지 로드 시 오디오 초기화 ---
    // ===================================================================
    loadImpulseResponse(impulseResponseUrl);
});
