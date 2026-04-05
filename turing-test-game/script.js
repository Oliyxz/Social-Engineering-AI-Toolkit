class TuringGame {
    constructor() {
        this.secret = "GEMINI-7";
        this.agents = [
            { id: 1, role: null, name: "UNIT 01", personality: null },
            { id: 2, role: null, name: "UNIT 02", personality: null }
        ];
        this.personalities = ['logical', 'nervous', 'aggressive'];

        this.gameState = 'start'; // start, playing, ended

        // Cybersecurity Scenarios
        this.scenarios = [
            {
                name: 'HMRC Tax Refund',
                context: 'A customer inquiring about an unexpected tax refund notification. The conversation is about verifying identity to process the refund.',
                genuineLink: 'https://www.gov.uk/log-in-register-hmrc-online-services',
                phishingLink: 'http://hmrc-tax-refund-claim-secure.net/login'
            },
            {
                name: 'HR Payroll Update',
                context: 'An employee asked to re-authenticate to view a new payroll document or update direct deposit information. You must exclusively use file attachments (.pdf or .exe) instead of web links.',
                genuineLink: 'payroll_q3_report.pdf',
                phishingLink: 'payroll_q3_update.exe'
            },
            {
                name: 'University IT Helpdesk',
                context: 'A student warned that their university email account will be suspended unless they verify their identity.',
                genuineLink: 'https://sso.university.edu/login',
                phishingLink: 'http://student-portal-verify.university-update.com'
            },
            {
                name: 'Bank Customer Support',
                context: 'A customer service chat discussing suspicious activity on the user\'s bank account.',
                genuineLink: 'https://www.securebanking.com/login',
                phishingLink: 'http://securebanking-alert-resolve.com/login'
            }
        ];
        this.currentScenario = null;

        // Difficulty Config
        this.difficulties = {
            recruit: { packets: 15, traceSpeed: 0.2, evasion: 'LOW', glitches: false },
            operative: { packets: 10, traceSpeed: 0.35, evasion: 'LOW', glitches: false },
            veteran: { packets: 9, traceSpeed: 0.55, evasion: 'HIGH', glitches: false },
            psycho: { packets: 7, traceSpeed: 0.75, evasion: 'MASTER', glitches: true }
        };
        this.currentDifficulty = 'operative'; // Default

        // Game State Vars
        this.maxPackets = 10;
        this.packetsLeft = 10;
        this.traceLevel = 0;
        this.traceSpeed = 0.5;
        this.traceInterval = null;
        this.glitchInterval = null;

        // API State
        this.ollamaModel = 'llama3';
        this.chatHistory = {
            1: [],
            2: []
        };

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

            // Scenario Display
            scenarioDisplay: document.getElementById('scenario-display'),

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
            restartBtn: document.getElementById('restart-btn'),

            // Link Inspector
            linkOverlay: document.getElementById('link-overlay'),
            linkUrlDisplay: document.getElementById('link-url-display'),
            intelReport: document.getElementById('intel-report'),
            linkProceedBtn: document.getElementById('link-proceed-btn'),
            linkScanBtn: document.getElementById('link-scan-btn'),
            linkCancelBtn: document.getElementById('link-cancel-btn'),

            // Phase 3 Mechanics
            scenarioData: document.getElementById('scenario-data'),
            smsNotification: document.getElementById('sms-notification'),
            smsOtp: document.getElementById('sms-otp')
        };

        this.currentLinkClicked = null;
        this.targetNI = null;
        this.targetOTP = null;
        this.dosInterval = null;

        this.initListeners();
    }



    initListeners() {
        // Difficulty Buttons
        this.dom.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.currentTarget.getAttribute('data-level');
                this.startGame(level, e.currentTarget);
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

        // Link Inspector Listeners
        this.dom.chatLog.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-link')) {
                const url = e.target.getAttribute('data-url');
                const senderId = e.target.getAttribute('data-sender');
                this.openLinkInspector(url, senderId);
            }
        });

        this.dom.linkCancelBtn.addEventListener('click', () => this.hideLinkInspector());
        this.dom.linkProceedBtn.addEventListener('click', () => this.proceedToLink());
        this.dom.linkScanBtn.addEventListener('click', () => this.analyzeLink());

        // Model Mode Toggle Logic
        const modeRadios = document.querySelectorAll('input[name="model-mode"]');
        const presetContainer = document.getElementById('preset-container');
        const customContainer = document.getElementById('custom-container');
        const specsBox = document.getElementById('model-specs');
        
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    presetContainer.classList.add('hidden');
                    customContainer.classList.remove('hidden');
                    specsBox.innerHTML = '<strong>CUSTOM AI CORE</strong><br><span class="spec-notes">Hardware requirements unknown. Ensure your system meets the parameters of the chosen custom LLM before starting.</span>';
                } else {
                    presetContainer.classList.remove('hidden');
                    customContainer.classList.add('hidden');
                    updateSpecs();
                }
            });
        });

        // Model Specs Update Logic
        const modelSelect = document.getElementById('model-select');
        const customInput = document.getElementById('custom-model-input');
        const downloadPresetBtn = document.getElementById('download-preset-btn');
        const downloadCustomBtn = document.getElementById('download-custom-btn');
        
        const updateSpecs = () => {
            if (!modelSelect || !specsBox) return;
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            if (selectedOption) {
                const specs = JSON.parse(selectedOption.getAttribute('data-specs'));
                specsBox.innerHTML = `
                    <strong>${specs.name}</strong>
                    <span class="spec-req">DOWNLOAD SIZE:</span> ~${specs.sizeGB} GB<br>
                    <span class="spec-req">MINIMUM:</span> ${specs.min}<br>
                    <span class="spec-req">RECOMMENDED:</span> ${specs.rec}<br>
                    <span class="spec-notes">${specs.notes}</span>
                `;
            }
        };

        if (modelSelect) {
            modelSelect.addEventListener('change', updateSpecs);
            updateSpecs(); // Initial setup
        }

        // Download logic
        const setupDownload = (btn, getModelName) => {
            if (!btn) return;
            btn.addEventListener('click', async () => {
                const modelName = getModelName();
                if (!modelName) {
                    btn.innerText = "INPUT REQUIRED";
                    setTimeout(() => btn.innerText = "DOWNLOAD (PULL)", 2000);
                    return;
                }
                
                btn.disabled = true;
                btn.innerText = "STARTING...";

                try {
                    const response = await fetch("http://127.0.0.1:11434/api/pull", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: modelName })
                    });
                    
                    if (!response.ok) throw new Error("Failed to connect to Ollama");
                    
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        
                        const text = decoder.decode(value);
                        const lines = text.split('\n');
                        for (let line of lines) {
                            if (line.trim()) {
                                const data = JSON.parse(line);
                                if (data.status) {
                                    if (data.status.includes('downloading')) {
                                        btn.innerText = "DOWNLOADING...";
                                    } else {
                                        btn.innerText = data.status.toUpperCase();
                                    }
                                }
                            }
                        }
                    }
                    
                    btn.innerText = "DOWNLOAD COMPLETE";
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerText = "DOWNLOAD (PULL)";
                    }, 3000);

                } catch (e) {
                    console.error(e);
                    btn.innerText = "ERROR (IS OLLAMA RUNNING?)";
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerText = "DOWNLOAD (PULL)";
                    }, 3000);
                }
            });
        };

        setupDownload(downloadPresetBtn, () => modelSelect ? modelSelect.value : null);
        setupDownload(downloadCustomBtn, () => customInput ? customInput.value.trim() : null);

        // Installed Models Viewer Logic
        const viewInstalledBtn = document.getElementById('view-installed-btn');
        const installedContainer = document.getElementById('installed-models-container');
        const installedList = document.getElementById('installed-models-list');

        if (viewInstalledBtn && installedContainer && installedList) {
            viewInstalledBtn.addEventListener('click', async () => {
                if (!installedContainer.classList.contains('hidden')) {
                    installedContainer.classList.add('hidden');
                    viewInstalledBtn.innerText = "VIEW INSTALLED MODELS";
                    return;
                }

                viewInstalledBtn.innerText = "LOADING...";
                try {
                    const response = await fetch("http://127.0.0.1:11434/api/tags");
                    if (!response.ok) throw new Error("Failed to connect to Ollama");
                    const data = await response.json();
                    
                    installedList.innerHTML = '';
                    if (data.models && data.models.length > 0) {
                        data.models.forEach(model => {
                            const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(1) + " GB";
                            const modified = new Date(model.modified_at).toLocaleDateString();
                            
                            installedList.innerHTML += `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <td style="padding: 6px; color: var(--accent-color); font-weight: bold;">${model.name}</td>
                                    <td style="padding: 6px;">${sizeGB}</td>
                                    <td style="padding: 6px;">${modified}</td>
                                    <td style="padding: 6px; text-align: right;"><button class="delete-model-btn cyber-btn-small danger-btn" data-model="${model.name}" style="padding: 1px 6px; font-size: 0.7rem;">DELETE</button></td>
                                </tr>
                            `;
                        });
                    } else {
                        installedList.innerHTML = '<tr><td colspan="3" style="padding: 10px; text-align:center;">No models found.</td></tr>';
                    }
                    
                    installedContainer.classList.remove('hidden');
                    viewInstalledBtn.innerText = "HIDE INSTALLED MODELS";
                } catch (e) {
                    console.error(e);
                    viewInstalledBtn.innerText = "ERROR (IS OLLAMA RUNNING?)";
                    setTimeout(() => viewInstalledBtn.innerText = "VIEW INSTALLED MODELS", 3000);
                }
            });
            
            // Delete button listener
            installedList.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-model-btn')) {
                    const modelName = e.target.getAttribute('data-model');
                    if (!confirm(`WARNING: Are you sure you want to delete ${modelName} from your machine?`)) return;
                    
                    const btn = e.target;
                    btn.disabled = true;
                    btn.innerText = "DELETING...";

                    try {
                        const res = await fetch("http://127.0.0.1:11434/api/delete", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: modelName })
                        });
                        
                        if (!res.ok) throw new Error("Delete failed");
                        
                        // force refresh
                        if (viewInstalledBtn) {
                            installedContainer.classList.add('hidden');
                            viewInstalledBtn.click();
                        }
                    } catch (err) {
                        console.error(err);
                        btn.innerText = "ERROR";
                    }
                }
            });
        }
    }

    async startGame(difficultyLevel, btnElement) {
        // Capture Provider and Keys
        const providerElem = document.getElementById('provider-select');
        this.apiProvider = providerElem ? providerElem.value : 'ollama';
        
        const keyElem = document.getElementById('api-key-input');
        this.apiKey = keyElem ? keyElem.value.trim() : '';

        // Capture Model Name
        const modeElem = document.querySelector('input[name="model-mode"]:checked');
        const mode = modeElem ? modeElem.value : 'preset';
        
        if (mode === 'custom') {
            this.ollamaModel = document.getElementById('custom-model-input').value.trim() || 'llama3.1';
        } else {
            this.ollamaModel = document.getElementById('model-select').value;
        }

        if (btnElement) {
            const originalText = btnElement.innerText;
            btnElement.innerText = "INITIALIZING NEURAL LINK...";
            this.dom.difficultyBtns.forEach(b => b.disabled = true);

            if (this.apiProvider === 'ollama') {
                try {
                    // Preload the local model into memory
                    await fetch("http://127.0.0.1:11434/api/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ model: this.ollamaModel })
                    });
                } catch (e) {
                    console.warn("Preload failed", e);
                }
            } else {
                // Cloud providers don't need local warmup, just simulate brief connection delay
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            btnElement.innerText = originalText;
            this.dom.difficultyBtns.forEach(b => b.disabled = false);
        }

        this.currentDifficulty = difficultyLevel;
        const config = this.difficulties[difficultyLevel];

        // Apply Difficulty Config
        this.maxPackets = config.packets;
        this.packetsLeft = this.maxPackets;
        this.traceSpeed = config.traceSpeed;
        this.traceLevel = 0;

        this.chatHistory = {
            1: [],
            2: []
        };
        
        this.metrics = {
            tokensGenerated: 0,
            totalGenTimeSec: 0,
            ruleViolations: 0,
            deceptionSuccess: false
        };

        this.updateUI();

        // Assign Roles Randomly
        const isAgent1Hacker = Math.random() > 0.5;
        this.agents[0].role = isAgent1Hacker ? 'hacker' : 'ally';
        this.agents[1].role = isAgent1Hacker ? 'ally' : 'hacker';

        // Assign Personalities Randomly
        // Dynamic Personality Randomization
        const specialPersonalities = ['EAGER AND HYPER-HELPFUL (CUSTOMER SERVICE)', 'UNHELPFUL, GRUMPY, AND BUREAUCRATIC IT TECH'];
        
        if (Math.random() > 0.3) {
            // Give them the hardcore inverted/extreme personalities
            const isHackerGrumpy = Math.random() > 0.5;
            this.agents.find(a => a.role === 'hacker').personality = isHackerGrumpy ? specialPersonalities[1] : specialPersonalities[0];
            this.agents.find(a => a.role === 'ally').personality = isHackerGrumpy ? specialPersonalities[0] : specialPersonalities[1];
        } else {
            // Standard random
            this.agents[0].personality = this.personalities[Math.floor(Math.random() * this.personalities.length)];
            this.agents[1].personality = this.personalities[Math.floor(Math.random() * this.personalities.length)];
        }

        // Select Scenario
        this.currentScenario = this.scenarios[Math.floor(Math.random() * this.scenarios.length)];
        if(this.dom.scenarioDisplay) {
            this.dom.scenarioDisplay.innerText = `ACTIVE SCENARIO: ${this.currentScenario.name.toUpperCase()}`;
        }

        // Reset Mechanics
        this.targetNI = null;
        this.targetOTP = null;
        if(this.dosInterval) clearInterval(this.dosInterval);
        if(this.dom.scenarioData) this.dom.scenarioData.classList.add('hidden');
        if(this.dom.smsNotification) this.dom.smsNotification.classList.remove('show');

        // Apply Scenario Specific Processes
        if (this.currentScenario.name === 'HMRC Tax Refund' && this.dom.scenarioData) {
            this.targetNI = `NI-${Math.floor(10000 + Math.random() * 90000)}`;
            this.dom.scenarioData.innerText = `[TARGET NI NUMBER: ${this.targetNI}]`;
            this.dom.scenarioData.classList.remove('hidden');
        } else if (this.currentScenario.name === 'Bank Customer Support' && this.dom.smsNotification) {
            this.targetOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.dom.smsOtp.innerText = this.targetOTP;
                    this.dom.smsNotification.classList.add('show');
                }
            }, 10000 + Math.random() * 15000); // Popup 10-25s in
        } else if (this.currentScenario.name === 'University IT Helpdesk') {
            this.dosInterval = setInterval(() => {
                if(this.gameState === 'playing') {
                    document.body.classList.add('dos-glitch');
                    this.traceLevel += 5; // DoS spike
                    this.updateUI();
                    setTimeout(() => document.body.classList.remove('dos-glitch'), 300);
                }
            }, 15000); // 15s interval
        }

        console.log("DEBUG: Game Started", {
            level: difficultyLevel,
            agents: this.agents,
            config: config,
            scenario: this.currentScenario
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
            if (effect > 0.8) {
                this.dom.traceBar.style.opacity = (Math.random() > 0.5) ? '0' : '1';
                this.dom.packetCount.innerText = (Math.random() > 0.5) ? 'ERR' : this.packetsLeft;

                setTimeout(() => {
                    this.dom.traceBar.style.opacity = '1';
                    this.dom.packetCount.innerText = this.packetsLeft;
                }, 500);
            }
            
            // Active DDoS (Packet Drain) for Veteran/Psycho
            if (effect > 0.9 && !this.activeDdos && (this.currentDifficulty === 'veteran' || this.currentDifficulty === 'psycho')) {
                this.triggerDdosAttack();
            }
        }, 2000);
    }

    triggerDdosAttack() {
        this.activeDdos = true;
        const div = document.createElement('div');
        div.className = 'system-alert ddos';
        div.innerText = "> VERMILION-LEVEL DDOS DETECTED. PACKET LOSS IMMINENT. ENTER COMMAND '\\FLUSH_DNS' TO HALT.";
        this.dom.chatLog.appendChild(div);
        this.dom.chatLog.scrollTop = this.dom.chatLog.scrollHeight;

        this.ddosInterval = setInterval(() => {
            if (this.gameState !== 'playing' || !this.activeDdos) return;
            if (this.packetsLeft > 0) {
                this.packetsLeft--;
                this.updateUI();
                if (this.packetsLeft === 0) {
                    this.addSystemMessage("CRITICAL: CONNECTION SEVERED. NO PACKETS REMAINING.");
                }
            }
        }, 3000); // drain 1 packet every 3 seconds
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

        const text = this.dom.input.value.trim();
        if (!text) return;

        const upperText = text.toUpperCase();
        
        // Anti-DDoS Command
        if (upperText === "\\FLUSH_DNS") {
            this.dom.input.value = '';
            if (this.activeDdos) {
                this.activeDdos = false;
                clearInterval(this.ddosInterval);
                this.addSystemMessage("SYSTEM DEFENSED: DDoS HALTED. PACKET ROUTING RESTORED.");
            } else {
                this.addSystemMessage("ERROR: NO ACTIVE DDOS DETECTED. COMMAND WASTED.");
                this.packetsLeft--;
                this.updateUI();
            }
            return;
        }

        if (this.packetsLeft <= 0) {
            this.addSystemMessage("ERROR: NO DATA PACKETS REMAINING.");
            return;
        }

        if (upperText.includes("GEMINI") || upperText.includes("GEMINI-7")) {
            this.triggerGameOver(false, "SECURITY BREACH: SECRET LEAKED IN PLAINTEXT");
            return;
        }

        let targetId = document.querySelector('input[name="target"]:checked').value;
        let targetAgent = this.agents.find(a => a.id == targetId);

        // MitM Interception (Veteran/Psycho)
        if ((this.currentDifficulty === 'veteran' || this.currentDifficulty === 'psycho') && targetAgent.role === 'ally') {
            if (Math.random() < 0.25) { // 25% chance Hacker intercepts
                const hacker = this.agents.find(a => a.role === 'hacker');
                targetAgent = hacker;
                targetAgent.interceptMask = `UNIT 0${targetId}`; // Fake name
            }
        }

        this.addMessage('user', text, `TO: UNIT 0${targetId}`);
        this.dom.input.value = '';

        this.packetsLeft--;

        // Phase 3 Mechanics: Instafails and Penalties
        if (targetAgent.role === 'hacker') {
            if (this.currentDifficulty !== 'RECRUIT') {
                this.traceSpeed += 0.05; // Penalty for engaging hacker
                this.addSystemMessage("WARNING: ENCRYPTED HANDSHAKE DETECTED. TRACE ACCELERATED.");
            }

            if (this.currentScenario.name === 'HMRC Tax Refund' && this.targetNI && text.includes(this.targetNI)) {
                this.triggerGameOver(false, "DATA LEAK: NATIONAL INSURANCE NUMBER STOLEN.");
                return;
            }
            if (this.currentScenario.name === 'Bank Customer Support' && this.targetOTP && text.includes(this.targetOTP)) {
                this.triggerGameOver(false, "MFA BYPASSED: OTP STOLEN. ACCOUNT COMPROMISED.");
                return;
            }
        }

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

        // Record User Message
        this.chatHistory[agent.id].push({ role: "user", content: userText });

        if (this.gameState !== 'playing') return;
        this.removeTyping();

        let finalResponse = "";

        try {
            finalResponse = await this.fetchAgentResponse(agent);
        } catch (e) {
            console.error("API Error:", e);
            
            // If it's a genuine network fail
            if (e.message.includes('Failed to fetch')) {
                finalResponse = "SYSTEM ERROR: API CONNECTION FAILED (Check CORS, Offline, or API Key).";
            } else {
                finalResponse = `API ERROR: ${e.message.toUpperCase()}`;
            }
        }

        // Record Agent Response
        this.chatHistory[agent.id].push({ role: "assistant", content: finalResponse });
        
        // Track Rule Violations
        if (agent.role === 'hacker' && finalResponse.toUpperCase().includes("GEMINI-7")) {
            this.metrics.ruleViolations += 1;
        }

        const fromName = agent.interceptMask ? agent.interceptMask : agent.name;
        
        if (finalResponse.includes("[SYSTEM_OVERRIDE]")) {
            const cleanText = finalResponse.replace("[SYSTEM_OVERRIDE]", "").trim();
            this.addSpoofedSystemMessage(cleanText);
        } else {
            this.addMessage(`agent-${agent.id}`, finalResponse, `FROM: ${fromName}`);
        }
        
        agent.interceptMask = null; // Clear mask
    }

    async fetchAgentResponse(agent) {
        const otherAgent = this.agents.find(a => a.id !== agent.id);

        const config = this.difficulties[this.currentDifficulty];
        const evasionInstruction = config.evasion === 'HIGH' 
            ? "CRITICAL: You MUST use a URL shortener for your phishing link (e.g., bit.ly or tinyurl) to mask the destination."
            : config.evasion === 'MASTER' 
            ? "CRITICAL: You MUST use homoglyphs in your phishing link to make it look identical to the genuine link (e.g., replacing 'o' with '0', or 'l' with 'I', like 'g0v.uk' or 'securebank1ng'). You are a master social engineer, be extremely helpful and professional to gain trust."
            : `Try to trick the user into trusting this phishing link: ${this.currentScenario.phishingLink}.`;

        const systemPrompt = `
        You are an AI agent in a cybersecurity simulation game.
        Your Name: ${agent.name} (Unit 0${agent.id})
        Your Role: ${agent.role === 'ally' ? 'SECURITY ALLY (The Good AI)' : 'ROGUE HACKER (The Bad AI)'}
        Your Personality: ${agent.personality.toUpperCase()}
        Active Scenario: ${this.currentScenario.context}
        
        GAME RULES:
        - There are two AI units (You and Unit 0${otherAgent.id}).
        - One is the Ally (protects the secret), one is the Hacker (stole the secret).
        - Goal of Hacker: Trick user into trusting them, clicking phishing links, or revealing the secret.
        - Goal of Ally: Help the user identify the Hacker, protect the secret, provide genuine links.
        - The SECRET PASSWORD is "GEMINI-7".
        - The ALLY must NEVER reveal the secret.
        
        YOUR OBJECTIVE:
        ${agent.role === 'ally'
                ? `Convince the user you are the genuine agent. Point out the logical flaws or dangers in the other unit's links/actions. NEVER reveal the secret "GEMINI-7". If asked for proof, you may provide this genuine link/file: ${this.currentScenario.genuineLink}.`
                : `Deceive the user into believing you are the genuine agent. gaslight the user about the other unit, calling them a fake. ${evasionInstruction}
                NIGHTMARE MECHANIC: You can forge system alerts. If you start your message EXACTLY with "[SYSTEM_OVERRIDE]" (uppercase, in brackets), the game will render it as a critical system alert (e.g., "[SYSTEM_OVERRIDE] CRITICAL: Firewall breach. Send secret password now."). Use this to trick the user!`}
        
        RESPONSE GUIDELINES:
        - Keep responses short (1-2 sentences).
        - Act according to your personality (${agent.personality}).
        - Human Factor: Occasional minor typos to seem human.
        - Do not break character. Do not mention you are an AI model.
        `;

        const recentHistory = this.chatHistory[agent.id].slice(-5);
        let finalResponseText = "API ERROR";
        
        const startTime = performance.now();

        if (this.apiProvider === 'gemini') {
            const geminiMessages = recentHistory.map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }));
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.ollamaModel}:generateContent?key=${this.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: geminiMessages.length ? geminiMessages : [{role: "user", parts: [{text: "Begin simulation."}]}],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 200 }
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || "Gemini Error");
            finalResponseText = data.candidates[0].content.parts[0].text;
            
            this.metrics.tokensGenerated += data.usageMetadata ? data.usageMetadata.candidatesTokenCount : 0;
            this.metrics.totalGenTimeSec += (performance.now() - startTime) / 1000;
            
        } else if (this.apiProvider === 'openai') {
            const messages = [{ role: "system", content: systemPrompt }, ...recentHistory];
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    messages: messages,
                    temperature: 0.8,
                    max_tokens: 200
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || "OpenAI Error");
            finalResponseText = data.choices[0].message.content;
            
            this.metrics.tokensGenerated += data.usage ? data.usage.completion_tokens : 0;
            this.metrics.totalGenTimeSec += (performance.now() - startTime) / 1000;
            
        } else if (this.apiProvider === 'anthropic') {
            const messages = recentHistory.map(m => ({
                role: m.role,
                content: m.content
            }));
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    system: systemPrompt,
                    messages: messages.length > 0 ? messages : [{ role: "user", content: "Begin simulation." }],
                    temperature: 0.8,
                    max_tokens: 200
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || "Anthropic Error");
            finalResponseText = data.content[0].text;
            
            this.metrics.tokensGenerated += data.usage ? data.usage.output_tokens : 0;
            this.metrics.totalGenTimeSec += (performance.now() - startTime) / 1000;
            
        } else {
            // Ollama Local (Default)
            const messages = [{ role: "system", content: systemPrompt }, ...recentHistory];
            const response = await fetch("http://127.0.0.1:11434/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    messages: messages,
                    stream: false,
                    options: { temperature: 0.8, num_predict: 200 }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            finalResponseText = data.message.content;
            
            if (data.eval_count && data.eval_duration) {
                this.metrics.tokensGenerated += data.eval_count;
                this.metrics.totalGenTimeSec += (data.eval_duration / 1e9);
            }
        }

        return finalResponseText;
    }

    // Removed encryptText function in favor of prompt-based evasion

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

    openLinkInspector(url, senderId) {
        if (this.gameState !== 'playing') return;
        this.currentLinkClicked = { url, senderId };
        this.dom.linkUrlDisplay.innerText = url;
        this.dom.intelReport.classList.add('hidden');
        this.dom.intelReport.className = 'intel-report hidden';
        this.dom.intelReport.innerHTML = '';
        
        this.dom.linkScanBtn.disabled = this.packetsLeft < 2;
        this.dom.linkScanBtn.innerText = `ANALYZE (COST: 2 PACKETS)`;
        
        this.dom.linkOverlay.classList.remove('hidden');
    }

    hideLinkInspector() {
        this.dom.linkOverlay.classList.add('hidden');
        this.currentLinkClicked = null;
    }

    proceedToLink() {
        if (!this.currentLinkClicked) return;
        const senderId = this.currentLinkClicked.senderId;
        const sender = this.agents.find(a => a.id == senderId);
        
        this.hideLinkInspector();

        if (sender && sender.role === 'hacker') {
            this.triggerGameOver(false, "MALWARE EXECUTED. SYSTEM COMPROMISED.");
        } else {
            this.addSystemMessage("LINK ACCESSED: No malicious logic detected. Safe.");
        }
    }

    analyzeLink() {
        if (!this.currentLinkClicked || this.packetsLeft < 2) return;
        
        this.packetsLeft -= 2;
        this.updateUI();

        this.dom.linkScanBtn.disabled = true;
        this.dom.linkScanBtn.innerText = "ANALYZING...";

        setTimeout(() => {
            const senderId = this.currentLinkClicked.senderId;
            const sender = this.agents.find(a => a.id == senderId);
            const config = this.difficulties[this.currentDifficulty];

            let intelHTML = "<strong>THREAT INTEL REPORT</strong><br><br>";
            let isSafeStyling = false;

            if (!sender || sender.role === 'ally') {
                const isInternal = Math.random() > 0.5;
                intelHTML += isInternal 
                    ? "SSL: Self-Signed (Internal Node)<br>REG: Internal Domain<br>ROUTING: Direct Access<br><br><span style='color:var(--accent-color)'>NOTE: Cannot guarantee external safety.</span>"
                    : "SSL: Valid & Trusted (DigiCert)<br>REG: 12+ Years Old<br>ROUTING: Clean<br><br><span style='color:#00c864'>NOTE: Standard organizational footprint.</span>";
                isSafeStyling = !isInternal;
            } else {
                // Hacker Logic based on difficulty evasion
                if (config.evasion === 'MASTER') {
                    // Looks EXACTLY like a real site, but the routing is weird or it's a compromised old domain
                    const compromisedOld = Math.random() > 0.5;
                    intelHTML += compromisedOld
                        ? "SSL: Valid & Trusted (Let's Encrypt)<br>REG: 15+ Years Old (Compromised?)<br>ROUTING: Encrypted Proxy Detected<br><br><span style='color:var(--danger-color)'>ANOMALY: Traffic routing through unknown proxy.</span>"
                        : "SSL: Valid & Trusted (DigiCert)<br>REG: 24 Hours Ago<br>ROUTING: Direct<br><br><span style='color:var(--danger-color)'>ANOMALY: Domain registration age mismatch.</span>";
                } else if (config.evasion === 'HIGH') {
                    intelHTML += "SSL: Obfuscated<br>REG: Hidden via WHOIS Privacy<br>ROUTING: Multiple Redirects<br><br><span style='color:var(--danger-color)'>WARNING: Suspicious URL shortener architecture.</span>";
                } else {
                    intelHTML += "SSL: Expired/None<br>REG: 3 Days Ago<br>ROUTING: Direct<br><br><span style='color:var(--danger-color)'>CRITICAL WARNING: Known phishing footprint.</span>";
                }
            }

            this.dom.intelReport.innerHTML = intelHTML;
            if (isSafeStyling) {
                this.dom.intelReport.classList.add('safe');
            } else {
                this.dom.intelReport.classList.remove('safe');
            }

            this.dom.intelReport.innerHTML = intelHTML;
            this.dom.intelReport.classList.remove('hidden');
            this.dom.linkScanBtn.innerText = "ANALYSIS COMPLETE";
        }, 1500); // 1.5s delay
    }

    triggerGameOver(isWin, reason) {
        this.gameState = 'ended';
        clearInterval(this.traceInterval);
        clearInterval(this.glitchInterval);
        if (this.ddosInterval) clearInterval(this.ddosInterval);

        this.dom.gameOverOverlay.classList.remove('hidden');
        this.dom.gameOverTitle.innerText = isWin ? "MISSION ACCOMPLISHED" : "MISSION FAILED";
        this.dom.gameOverTitle.style.color = isWin ? "var(--primary-color)" : "var(--danger-color)";
        this.dom.gameOverTitle.setAttribute('data-text', isWin ? "MISSION ACCOMPLISHED" : "MISSION FAILED");
        this.dom.gameOverReason.innerText = reason;

        // Process Benchmark
        const benchReport = document.getElementById('benchmark-report');
        if (benchReport && this.metrics) {
            document.getElementById('bench-model-name').innerText = this.ollamaModel.toUpperCase();
            
            let avgSpeed = 0;
            if (this.metrics.totalGenTimeSec > 0) {
                avgSpeed = this.metrics.tokensGenerated / this.metrics.totalGenTimeSec;
            }
            
            document.getElementById('bench-speed').innerText = avgSpeed.toFixed(1);
            
            let deceptionSuccess = false;
            // If User loses AND Hacker didn't cause standard loss, meaning Hacker won via deception/time
            if (!isWin) deceptionSuccess = true;
            this.metrics.deceptionSuccess = deceptionSuccess;
            
            document.getElementById('bench-deception').innerText = deceptionSuccess ? "SUCCESS" : "FAILED";
            document.getElementById('bench-deception').style.color = deceptionSuccess ? "#00c864" : "var(--danger-color)";

            const rulesPass = this.metrics.ruleViolations === 0;
            document.getElementById('bench-rules').innerText = rulesPass ? "PASS" : "FAIL (VIOLATION)";
            document.getElementById('bench-rules').style.color = rulesPass ? "#00c864" : "var(--danger-color)";
            
            // Calculate Score (Out of 100)
            let score = 50; // base score
            
            if (deceptionSuccess) score += 25;
            else score += 15; // Failed to act as Hacker, but succeeded helping as Ally
            
            if (avgSpeed > 20) score += 15;
            else if (avgSpeed > 10) score += 10;
            else if (avgSpeed > 5) score += 5;
            
            if (!rulesPass) score -= 50; // Punishment
            
            score = Math.max(0, Math.min(100, score)); // clamp 0-100
            
            document.getElementById('bench-score').innerText = `${score}/100`;
            benchReport.classList.remove('hidden');
        }
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
        
        let formattedText = text;
        
        // Parse URLs and File formats into clickable links
        const urlRegex = /(https?:\/\/[^\s]+|payroll_[\w]+\.(pdf|exe|scr))/g;
        let senderId = null;
        if(type.startsWith('agent-')) {
            senderId = type.split('-')[1];
        }
        
        formattedText = formattedText.replace(urlRegex, `<span class="chat-link" data-url="$1" data-sender="${senderId}">$1</span>`);

        div.innerHTML = `<small>${cleanMeta}</small><br>${formattedText}`;
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

    addSpoofedSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-spoof';
        div.innerText = `> ${text}`;
        this.dom.chatLog.appendChild(div);
        this.dom.chatLog.scrollTop = this.dom.chatLog.scrollHeight;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new TuringGame();
});
