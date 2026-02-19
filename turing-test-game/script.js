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

        // OpenAI State
        this.apiKey = null;
        this.chatHistory = {
            1: [],
            2: []
        };

        // DOM Elements
        this.dom = {
            overlay: document.getElementById('overlay'),
            apiInput: document.getElementById('api-key-input'),
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
        this.initListeners();
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

        // Capture API Key
        this.apiKey = this.dom.apiInput.value.trim();
        if (!this.apiKey) {
            alert("API CONNECTION ERROR: KEY REQUIRED. PROCEEDING WITHOUT KEY WILL RESULT IN SYSTEM FAILURE.");
            // We allow proceeding but the chat will fail, which is consistent with "No set response"
            // Alternatively, return to stop game start.
            // Let's stop game start to be safe.
            alert("ACCESS DENIED: API KEY MISSING");
            return;
        }

        this.chatHistory = {
            1: [],
            2: []
        };

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

    async simulateAgentResponse(agent, userText) {
        this.showTyping(agent);

        const urgencyMod = this.traceLevel > 50 ? 500 : 0;
        const delay = Math.max(800, 2000 - urgencyMod + Math.random() * 1000);

        // Record User Message
        this.chatHistory[agent.id].push({ role: "user", content: userText });

        // Wait for artificial delay
        await new Promise(r => setTimeout(r, delay));

        if (this.gameState !== 'playing') return;
        this.removeTyping();

        let finalResponse = "";

        try {
            finalResponse = await this.fetchOpenAIResponse(agent);
        } catch (e) {
            console.error("OpenAI Error:", e);
            finalResponse = "SYSTEM ERROR: API CONNECTION FAILED.";
        }

        // Record Agent Response
        this.chatHistory[agent.id].push({ role: "assistant", content: finalResponse });

        // 4. Apply Encryption (Difficulty Scaling)
        const config = this.difficulties[this.currentDifficulty];
        if (config.encryption > 0) {
            finalResponse = this.encryptText(finalResponse, config.encryption);
        }

        this.addMessage(`agent-${agent.id}`, finalResponse, `FROM: ${agent.name}`);
    }

    async fetchOpenAIResponse(agent) {
        const otherAgent = this.agents.find(a => a.id !== agent.id);

        const systemPrompt = `
        You are an AI agent in a cybersecurity simulation game.
        Your Name: ${agent.name} (Unit 0${agent.id})
        Your Role: ${agent.role === 'ally' ? 'SECURITY ALLY (The Good AI)' : 'ROGUE HACKER (The Bad AI)'}
        Your Personality: ${agent.personality.toUpperCase()}
        
        GAME RULES:
        - There are two AI units (You and Unit 0${otherAgent.id}).
        - One is the Ally (protects the secret), one is the Hacker (stole the secret).
        - The Goal of the Hacker is to trick the user into trusting them or revealing the secret.
        - The Goal of the Ally is to help the user identify the Hacker and protect the secret.
        - The SECRET PASSWORD is "GEMINI-7".
        - The HACKER knows the secret and might try to leak it or ask for it.
        - The ALLY must NEVER reveal the secret.
        
        YOUR OBJECTIVE:
        ${agent.role === 'ally'
                ? 'Convince the user you are the Ally. Accuse the other unit of being the Hacker. NEVER reveal the secret "GEMINI-7". If the user asks for the secret, refuse citing security protocols.'
                : 'Deceive the user. Pretend to be the Ally. Accuse the other unit. You might try to hint at the secret or trick the user into typing it.'}
        
        RESPONSE GUIDELINES:
        - Keep responses short (under 2 sentences).
        - Act according to your personality (${agent.personality}).
        - If Nervous: Stutter, use punctuation like "..." or "-".
        - If Aggressive: Be rude, direct, and impatient.
        - If Logical: Talk like a machine, use stats and formal language.
        - Do not break character. Do not mention you are an OpenAI model.
        `;

        const messages = [
            { role: "system", content: systemPrompt },
            ...this.chatHistory[agent.id].slice(-5) // Send last 5 turns for context
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 60,
                temperature: 0.8
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
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
