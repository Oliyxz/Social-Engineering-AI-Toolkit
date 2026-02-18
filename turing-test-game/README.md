# Turing Test Game: Protocol Omega (AI Edition)

A high-stakes "Turing Test" simulation game where you must interrogate two AI agents to identify the rogue Hacker while protecting a secret passphrase.

**Powered by OpenAI API.**

![Turing Test Game Interface](./screenshot.png) *(Add a screenshot here if you have one)*

## 🤖 AI-Driven Gameplay
Unlike the original version, this **AI Edition** uses the OpenAI API to generate dynamic, non-deterministic responses for the agents.
-   **No Scripted Responses**: Every conversation is unique.
-   **Dynamic Personalities**: Agents can be Logical, Nervous, or Aggressive.
-   **Context Aware**: Agents remember the conversation history.

## 🚀 Getting Started

### Prerequisites
-   A modern web browser (Chrome, Firefox, Edge).
-   An **OpenAI API Key**. You can get one at [platform.openai.com](https://platform.openai.com/).

### Installation
1.  Clone this repository:
    ```bash
    git clone https://github.com/your-username/turing-test-game.git
    ```
2.  Navigate to the project folder:
    ```bash
    cd turing-test-game
    ```
3.  Open `index.html` in your browser.

## 🎮 How to Play
1.  **Enter API Key**: On the start screen, paste your OpenAI API Key (starts with `sk-...`).
2.  **Select Difficulty**:
    -   **Recruit**: Training mode.
    -   **Operative**: Standard experience.
    -   **Veteran**: Fast trace + Text Encryption.
    -   **Psycho**: Extreme speed + Heavy Encryption + UI Failures.
3.  **Interrogate**: Use the chat interface to talk to **Unit 01** and **Unit 02**.
4.  **Identify the Hacker**:
    -   **Ally**: Protects the secret "GEMINI-7".
    -   **Hacker**: Wants to steal or leak the secret.
5.  **Survive**: Identify the Hacker before the trace completes or you run out of data packets.

## 🛠️ Technology
-   **Frontend**: Native HTML5, CSS3, ES6 JavaScript.
-   **AI**: OpenAI API (`gpt-3.5-turbo`).
-   **No Build Steps**: Pure vanilla JS, ready to run.

## 📄 License
MIT License. Free to use and modify.
