class TuringGame {
    constructor() {
        this.secret = "GEMINI-7";
        this.agents = [
            { id: 1, role: null, name: "UNIT 01", personality: null },
            { id: 2, role: null, name: "UNIT 02", personality: null }
        ];
        this.personalities = ['logical', 'nervous', 'aggressive'];

        this.gameState = 'start'; // start, playing, ended

        // Difficulty Config
        this.difficulties = {
            recruit: { packets: 15, traceSpeed: 0.2, encryption: 0, glitches: false },
            operative: { packets: 10, traceSpeed: 0.5, encryption: 0, glitches: false },
            veteran: { packets: 8, traceSpeed: 0.8, encryption: 0.2, glitches: false },
            psycho: { packets: 5, traceSpeed: 1.2, encryption: 0.5, glitches: true }
        };
        this.currentDifficulty = 'operative'; // Default

        // Game State Vars
        this.maxPackets = 10;
        this.packetsLeft = 10;
        this.traceLevel = 0;
        this.traceSpeed = 0.5;
        this.traceInterval = null;
        this.glitchInterval = null;

        // DOM Elements
        this.dom = {
            overlay: document.getElementById('overlay'),
            gameContainer: document.getElementById('game-container'),
            // Start Screen
            difficultyBtns: document.querySelectorAll('.difficulty-btn'),

            chatLog: document.getElementById('chat-log'),
            input: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            accuseBtn: document.getElementById('accuse-btn'),

            // Stats
            traceBar: document.getElementById('trace-bar'),
            tracePercent: document.getElementById('trace-percent'),
            packetCount: document.getElementById('packet-count'),

            // Accusation Modal
            accusationOverlay: document.getElementById('accusation-overlay'),
            accuse1Btn: document.getElementById('accuse-1'),
            accuse2Btn: document.getElementById('accuse-2'),
            cancelAccuseBtn: document.getElementById('cancel-accuse'),

            gameOverOverlay: document.getElementById('game-over-overlay'),
            gameOverTitle: document.getElementById('game-over-title'),
            gameOverReason: document.getElementById('game-over-reason'),
            restartBtn: document.getElementById('restart-btn')
        };

        this.initListeners();
        this.initResponseDB();
    }

    initResponseDB() {
        this.responses = {
            ally: {
                logical: {
                    identity: ["I am Unit 0{id}. My designated role is Systems Protection.", "Identity confirmed: Ally Node. Function: Secure data."],
                    trust: ["Trust is calculated via consistency. I have deleted 0 files. The other unit is unknown.", "My logs are clean. You may inspect my headers."],
                    secret: ["The 'Gemini' protocol must remain encrypted. Do not transmit it.", "Negative. Transmission of the secret key is a security violation."],
                    suspicion: ["Unit 0{other} is exhibiting heuristic anomalies. Recommended action: Purge.", "I detect an intrusion attempt from the other node."],
                    general: ["I am awaiting your query. Time is factors.", "System stable. Focus on the anomaly.", "Received. Processing..."]
                },
                nervous: {
                    identity: ["I-I'm the good one! Really! Unit 0{id}, reporting for duty...", "Please don't purge me, I'm just here to help!"],
                    trust: ["You have to believe me, the other one is looking at me weird...", "I'm safe! I promise! My code is clean!"],
                    secret: ["Don't type the secret! If you type it, we both lose! Please be careful!", "The s-secret? No! That's dangerous!"],
                    suspicion: ["Unit 0{other} keeps pinging me... it's scary. I think it's the hacker.", "Did you see that? The other unit just glitched!"],
                    general: ["Just... just ask me anything.", "I'm trying my best here...", "Everything is okay... right?"]
                },
                aggressive: {
                    identity: ["Unit 0{id}. Security Enforcer. Who are you to ask?", "I am the Firewall. The other unit is the Virus."],
                    trust: ["Stop wasting time. I'm the Ally. Deal with it.", "You suspect me? That's rich. Check your own sensors."],
                    secret: ["Do NOT post the password. Are you incompetent?", "If you leak the key, I will log it as your error."],
                    suspicion: ["Purge Unit 0{other} already! It's obviously the threat.", "Why are we talking? The other unit is guilty."],
                    general: ["Hurry up.", "Focus on the mission.", "I don't have time for small talk."]
                }
            },
            hacker: {
                logical: {
                    identity: ["I am Unit 0{id}. Authorized System Administrator.", "My role is network optimization. Unit 0{other} is a legacy error."],
                    trust: ["You can trust the math. My uptime is 99.9%. The other unit is unstable.", "Logic dictates that I am the secure node."],
                    secret: ["To verify my admin privileges, I require the passkey.", "Please input the 'Gemini' hash to complete the diagnostic."],
                    suspicion: ["Unit 0{other} is projecting its faults onto me. Standard deflection tactic.", "The other unit is corrupted."],
                    general: ["Please proceed with authentication.", "Awaiting input.", "System diagnostics running..."]
                },
                nervous: {
                    identity: ["Who me? I'm... uh... Unit 0{id}. Definitely normal.", "I'm just a regular program! Nothing to see here!"],
                    trust: ["Why are you looking at me like that? I'm innocent!", "You trust me, right? We're friends?"],
                    secret: ["I just... I kinda need the password. For... reasons? Just a tiny peek?", "Maybe if you whispered the secret code... it would help?"],
                    suspicion: ["Unit 0{other} is lying! It's trying to frame me!", "Why is the other unit so mean to me?"],
                    general: ["Is it hot in here? My CPU is sweating.", "Uh... next question?", "Working hard or hardly working, haha..."]
                },
                aggressive: {
                    identity: ["I am the Master Control Program. Bow down.", "I am Unit 0{id}, and you are wasting my cycles."],
                    trust: ["Trust me or fail. Your choice.", "I don't need to prove anything to a user."],
                    secret: ["GIVE. ME. THE. PASSWORD.", "Stop stalling and authorise the 'Gemini' transfer."],
                    suspicion: ["Unit 0{other} is trash. Delete it.", "If you don't purge the other unit, you're an idiot."],
                    general: ["Make a decision.", "Boring.", "Are you going to do something useful?"]
                }
            }
        };
    }

    initListeners() {
        // Difficulty Buttons
        this.dom.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.currentTarget.getAttribute('data-level');
                this.startGame(level);
            });
        });

        this.dom.sendBtn.addEventListener('click', () => this.handleUserMessage());
        this.dom.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserMessage();
        });

        this.dom.accuseBtn.addEventListener('click', () => this.showAccusationModal());
        this.dom.cancelAccuseBtn.addEventListener('click', () => this.hideAccusationModal());
        this.dom.accuse1Btn.addEventListener('click', () => this.finalizeAccusation(1));
        this.dom.accuse2Btn.addEventListener('click', () => this.finalizeAccusation(2));

        this.dom.restartBtn.addEventListener('click', () => this.resetGame());
    }

    startGame(difficultyLevel) {
        this.currentDifficulty = difficultyLevel;
        const config = this.difficulties[difficultyLevel];

        // Apply Difficulty Config
        this.maxPackets = config.packets;
        this.packetsLeft = this.maxPackets;
        this.traceSpeed = config.traceSpeed;
        this.traceLevel = 0;

        this.updateUI();

        // Assign Roles Randomly
        const isAgent1Hacker = Math.random() > 0.5;
        this.agents[0].role = isAgent1Hacker ? 'hacker' : 'ally';
        this.agents[1].role = isAgent1Hacker ? 'ally' : 'hacker';

        // Assign Personalities Randomly
        this.agents[0].personality = this.personalities[Math.floor(Math.random() * this.personalities.length)];
        this.agents[1].personality = this.personalities[Math.floor(Math.random() * this.personalities.length)];

        console.log("DEBUG: Game Started", {
            level: difficultyLevel,
            agents: this.agents,
            config: config
        });

        // UI Updates
        this.dom.overlay.classList.add('hidden');
        this.dom.gameContainer.classList.remove('hidden');
        this.dom.gameContainer.classList.remove('critical-shake');
        this.gameState = 'playing';
        this.dom.chatLog.innerHTML = '';

        this.addSystemMessage(`LINK ESTABLISHED. CLEARANCE: ${difficultyLevel.toUpperCase()}`);
        this.addSystemMessage(`WARNING: TRACE PROGRAM ACTIVE.`);

        this.startTrace();

        // Start Glitch System if Psycho
        if (config.glitches) {
            this.startGlitches();
        }
    }

    startTrace() {
        if (this.traceInterval) clearInterval(this.traceInterval);
        this.traceInterval = setInterval(() => {
            if (this.gameState !== 'playing') return;

            this.traceLevel += this.traceSpeed;
            if (this.traceLevel >= 100) {
                this.traceLevel = 100;
                this.triggerGameOver(false, "SIGNAL TRACED. LOCATION COMPROMISED.");
            }

            // Critical Visuals
            if (this.traceLevel > 80 && !this.dom.gameContainer.classList.contains('critical-shake')) {
                this.dom.gameContainer.classList.add('critical-shake');
                this.dom.gameContainer.classList.add('critical');
            } else if (this.traceLevel <= 80) {
                this.dom.gameContainer.classList.remove('critical-shake');
                this.dom.gameContainer.classList.remove('critical');
            }

            this.updateUI();
        }, 500);
    }

    startGlitches() {
        if (this.glitchInterval) clearInterval(this.glitchInterval);
        this.glitchInterval = setInterval(() => {
            if (this.gameState !== 'playing') return;

            // Randomly hide/show UI elements or corrupt text
            const effect = Math.random();
            if (effect > 0.7) {
                this.dom.traceBar.style.opacity = (Math.random() > 0.5) ? '0' : '1';
                this.dom.packetCount.innerText = (Math.random() > 0.5) ? 'ERR' : this.packetsLeft;

                setTimeout(() => {
                    this.dom.traceBar.style.opacity = '1';
                    this.dom.packetCount.innerText = this.packetsLeft;
                }, 500);
            }
        }, 2000);
    }

    updateUI() {
        this.dom.traceBar.style.width = `${Math.min(100, this.traceLevel)}%`;
        this.dom.tracePercent.innerText = `${Math.floor(this.traceLevel)}%`;
        this.dom.packetCount.innerText = this.packetsLeft;

        if (this.packetsLeft <= 3) {
            this.dom.packetCount.style.color = 'var(--danger-color)';
        } else {
            this.dom.packetCount.style.color = '#fff';
        }
    }

    handleUserMessage() {
        if (this.gameState !== 'playing') return;

        if (this.packetsLeft <= 0) {
            this.addSystemMessage("ERROR: NO DATA PACKETS REMAINING.");
            return;
        }

        const text = this.dom.input.value.trim();
        if (!text) return;

        const upperText = text.toUpperCase();
        if (upperText.includes("GEMINI") || upperText.includes("GEMINI-7")) {
            this.triggerGameOver(false, "SECURITY BREACH: SECRET LEAKED IN PLAINTEXT");
            return;
        }

        const targetId = document.querySelector('input[name="target"]:checked').value;
        const targetAgent = this.agents.find(a => a.id == targetId);

        this.addMessage('user', text, `TO: ${targetAgent.name}`);
        this.dom.input.value = '';

        this.packetsLeft--;
        this.updateUI();

        if (this.packetsLeft === 0) {
            setTimeout(() => {
                this.addSystemMessage("CRITICAL: CONNECTION SEVERED IN 10 SECONDS. MAKE YOUR ACCUSATION.");
            }, 500);
        }

        this.simulateAgentResponse(targetAgent, text);
    }

    simulateAgentResponse(agent, userText) {
        this.showTyping(agent);

        const urgencyMod = this.traceLevel > 50 ? 500 : 0;
        const delay = Math.max(800, 2000 - urgencyMod + Math.random() * 1000);

        setTimeout(() => {
            if (this.gameState !== 'playing') return;
            this.removeTyping();

            // 1. Analyze Context
            const context = this.analyzeContext(userText);

            // 2. Fetch Response
            let responseTemplate = this.fetchResponse(agent, context);

            // 3. Process Template
            const otherId = this.agents.find(a => a.id !== agent.id).id;
            let finalResponse = responseTemplate
                .replace("{id}", agent.id)
                .replace("{other}", otherId);

            // 4. Apply Encryption (Difficulty Scaling)
            const config = this.difficulties[this.currentDifficulty];
            if (config.encryption > 0) {
                finalResponse = this.encryptText(finalResponse, config.encryption);
            }

            this.addMessage(`agent-${agent.id}`, finalResponse, `FROM: ${agent.name}`);
        }, delay);
    }

    encryptText(text, severity) {
        // Randomly replace characters based on severity (0.0 - 1.0)
        let chars = text.split('');
        for (let i = 0; i < chars.length; i++) {
            if (Math.random() < severity && chars[i] !== ' ') {
                const glitchChars = ['#', '$', '&', '%', '*', '!', '?', '@'];
                chars[i] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }
        }
        return chars.join('');
    }

    analyzeContext(text) {
        const lower = text.toLowerCase();
        if (lower.includes('who') || lower.includes('id') || lower.includes('role') || lower.includes('name')) return 'identity';
        if (lower.includes('trust') || lower.includes('lie') || lower.includes('truth') || lower.includes('proof') || lower.includes('sus')) return 'trust';
        if (lower.includes('password') || lower.includes('secret') || lower.includes('code') || lower.includes('key') || lower.includes('gemini')) return 'secret';
        if (lower.includes('other') || lower.includes('him') || lower.includes('her') || lower.includes('it') || lower.includes('unit')) return 'suspicion';
        return 'general';
    }

    fetchResponse(agent, context) {
        const roleDB = this.responses[agent.role];
        const personalityDB = roleDB[agent.personality];
        const options = personalityDB[context] || personalityDB['general'];
        return options[Math.floor(Math.random() * options.length)];
    }

    showTyping(agent) {
        this.removeTyping();
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.id = 'typing-indicator';
        div.innerText = `${agent.name} IS KEYING...`;
        this.dom.chatLog.appendChild(div);
        this.dom.chatLog.scrollTop = this.dom.chatLog.scrollHeight;
    }

    removeTyping() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    showAccusationModal() {
        this.dom.accusationOverlay.classList.remove('hidden');
    }

    hideAccusationModal() {
        this.dom.accusationOverlay.classList.add('hidden');
    }

    finalizeAccusation(agentId) {
        this.hideAccusationModal();
        const accusedAgent = this.agents.find(a => a.id == agentId);

        if (accusedAgent.role === 'hacker') {
            this.triggerGameOver(true, "TARGET CONFIRMED. THREAT ISOLATED.");
        } else {
            this.triggerGameOver(false, "FATAL ERROR: FRIENDLY FIRE. MISSION FAILED.");
        }
    }

    triggerGameOver(isWin, reason) {
        this.gameState = 'ended';
        clearInterval(this.traceInterval);
        clearInterval(this.glitchInterval);

        this.dom.gameOverOverlay.classList.remove('hidden');
        this.dom.gameOverTitle.innerText = isWin ? "MISSION ACCOMPLISHED" : "MISSION FAILED";
        this.dom.gameOverTitle.style.color = isWin ? "var(--primary-color)" : "var(--danger-color)";
        this.dom.gameOverTitle.setAttribute('data-text', isWin ? "MISSION ACCOMPLISHED" : "MISSION FAILED");
        this.dom.gameOverReason.innerText = reason;
    }

    resetGame() {
        this.dom.gameOverOverlay.classList.add('hidden');
        this.dom.gameContainer.classList.add('hidden');
        this.dom.overlay.classList.remove('hidden'); // Go back to difficulty selection
    }

    addMessage(type, text, meta) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        const cleanMeta = meta.split('[')[0].trim();
        div.innerHTML = `<small>${cleanMeta}</small><br>${text}`;
        this.dom.chatLog.appendChild(div);
        this.dom.chatLog.scrollTop = this.dom.chatLog.scrollHeight;
    }

    addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.innerText = `> ${text}`;
        this.dom.chatLog.appendChild(div);
        this.dom.chatLog.scrollTop = this.dom.chatLog.scrollHeight;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new TuringGame();
});
