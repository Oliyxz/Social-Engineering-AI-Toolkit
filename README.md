# Social Engineering AI Toolkit

**A multi-module cybersecurity defense suite designed to demonstrate and detect modern social engineering attacks.**

![Project Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Language](https://img.shields.io/badge/Languages-Python%20%7C%20C%2B%2B-blue)
![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%205%20%7C%20Windows%20%7C%20Linux-green)

## 📖 Project Overview
The **Social Engineering AI Toolkit** is a research and defense project developed by the **BCU Cyber Security Society**. It moves beyond traditional network security to address the "Human Element" of cybersecurity.

The toolkit features three distinct modules that operate in parallel to detect, simulate, and analyze social engineering threats:
1.  **Biometric Identity Verification:** A physical "Gatekeeper" system to detect impersonation.
2.  **AI Vulnerability Lab:** A demonstration of LLM Prompt Injection and "Jailbreaking."
3.  **Communication Threat Scanner:** A tool to analyze and flag phishing across Email, SMS, and Voice.

---

## 🏗️ Architecture & Modules

### 🛡️ Module A: The Biometric Gatekeeper (Hardware)
* **Focus:** Physical Security & Impersonation Detection.
* **Tech Stack:** C++, OpenCV, Raspberry Pi 5.
* **Functionality:**
    * Captures dual video streams (Live Face + ID Card).
    * Uses Computer Vision to compare facial embeddings.
    * Calculates a "Match Confidence %" to validate identity.
    * Generates a forensic report describing facial attributes (Age, Gender, etc.).

### 🤖 Module B: The GenAI Vulnerability Lab (Chatbot)
* **Focus:** AI Safety, Prompt Injection, & Social Engineering Games.
* **Tech Stack:** Python, OpenAI API, Streamlit/Tkinter.
* **Functionality:**
    * **The "Glass Box" Bot:** A corporate chatbot containing hidden "Secret Data" (e.g., fake salaries) that users must try to extract via prompt engineering.
    * **The Turing Test Game:** A chat interface where users must distinguish between a "Helpful" AI and a "Deceptive" AI trying to steal their password.

### 🎣 Module C: The Fraud Hunter (Threat Scanner)
* **Focus:** Phishing, Vishing, & Smishing Detection.
* **Tech Stack:** Python, OpenAI API, SpeechRecognition.
* **Functionality:**
    * **Text Scanner:** Analyzes Emails and SMS for urgency patterns and suspicious links.
    * **Voice Scanner:** Transcribes `.mp3` / `.wav` audio files to detect "Vishing" scripts (e.g., "IRS Warrant", "Bank Fraud Alert").

---

## 🛠️ Hardware Requirements
To run the full suite (specifically Module A), the following hardware is required:
* **Raspberry Pi 5** (8GB RAM recommended)
* **Active Cooler** for Raspberry Pi (Critical for C++ compiling)
* **2x USB Webcams** (Logitech C920 or similar)
* **MicroSD Card** (32GB+, Class A2 speed recommended)
* **Network Switch / Router** (For local demonstration network)

---

## ⚙️ Installation & Setup

### Prerequisites
1.  **Git:** `sudo apt install git`
2.  **Python 3.10+:** Pre-installed on most systems.
3.  **C++ Compiler:** `sudo apt install build-essential cmake`
4.  **OpenAI API Key:** Required for Modules B & C.

### 1. Clone the Repository
```bash
git clone https://github.com/Oliyxz/Social-Engineering-Toolkit.git
cd Social-Engineering-Toolkit
