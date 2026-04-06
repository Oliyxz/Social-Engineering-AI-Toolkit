import streamlit as st
import os
import csv
import base64
import io
import tempfile

from scanner import analyze_threat, run_signature_scan, analyze_email_headers
from audio_processor import transcribe_audio

st.set_page_config(page_title="The Fraud Hunter", page_icon="🎣", layout="wide")

st.title("🎣 Module C: The Fraud Hunter")
st.markdown("""
Welcome to the multi-modal threat scanner. 
Paste suspicious SMS messages, Emails, URLs, or upload voicemails to have our local AI analyze them against known threat datasets.
""")

st.sidebar.markdown("---")
st.sidebar.subheader("🛡️ Integrations")
vt_key = st.sidebar.text_input("VirusTotal API Key (Optional)", type="password", help="Enter your free VirusTotal API key to enable link security scanning.")
st.session_state.vt_api_key = vt_key
urlscan_key = st.sidebar.text_input("URLScan.io API Key (Optional)", type="password", help="Enter your free URLScan.io API key for deep domain tracking.")
st.session_state.urlscan_api_key = urlscan_key

if vt_key:
    if st.sidebar.button("Test VirusTotal Key", type="secondary"):
        with st.sidebar.status("Communing with VirusTotal...", expanded=False) as status:
            import requests
            headers = {"x-apikey": vt_key}
            # Test a universally known base64 URL ID (google.com)
            test_resp = requests.get("https://www.virustotal.com/api/v3/urls/Z29vZ2xlLmNvbQ", headers=headers, timeout=5)
            if test_resp.status_code == 200:
                status.update(label="API Key Validated!", state="complete", expanded=False)
                st.sidebar.success("✅ Your VirusTotal API key is active and ready.")
            elif test_resp.status_code == 401:
                status.update(label="API Key Invalid", state="error", expanded=True)
                st.sidebar.error("❌ Unauthorized: Invalid or missing privileges for this API Key.")
            else:
                status.update(label="Connection Error", state="error", expanded=True)
                st.sidebar.error(f"⚠️ Server returned HTTP {test_resp.status_code}")

if urlscan_key:
    if st.sidebar.button("Test URLScan Key", type="secondary"):
        with st.sidebar.status("Communing with URLScan.io...", expanded=False) as status:
            import requests
            headers = {"API-Key": urlscan_key}
            test_resp = requests.get("https://urlscan.io/api/v1/search/?q=domain:google.com", headers=headers, timeout=5)
            if test_resp.status_code == 200:
                status.update(label="API Key Validated!", state="complete", expanded=False)
                st.sidebar.success("✅ Your URLScan.io API key is active and ready.")
            elif test_resp.status_code in [400, 401, 403]:
                status.update(label="API Key Invalid", state="error", expanded=True)
                st.sidebar.error("❌ Unauthorized: Invalid API Key.")
            else:
                status.update(label="Connection Error", state="error", expanded=True)
                st.sidebar.error(f"⚠️ Server returned HTTP {test_resp.status_code}")

st.sidebar.markdown("---")
st.sidebar.subheader("📂 Modular AI Datasets")
st.sidebar.info("Datasets are now loaded automatically from the `datasets/` folder in JSON format. Simply place your JSON files there to integrate them.")

import json
def load_local_json(filename):
    path = os.path.join(os.path.dirname(__file__), 'datasets', filename)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f, strict=False)
                return data
        except Exception as e:
            st.sidebar.error(f"Error reading {filename}: {e}")
            return None
    return None

sms_dataset = load_local_json('sms_dataset.json')
email_dataset = load_local_json('email_dataset.json')
url_dataset = load_local_json('url_dataset.json')

st.sidebar.markdown(f"📱 SMS: **{len(sms_dataset) if sms_dataset else 0} references**")
st.sidebar.markdown(f"📧 Email: **{len(email_dataset) if email_dataset else 0} references**")
st.sidebar.markdown(f"🔗 URL: **{len(url_dataset) if url_dataset else 0} references**")
st.sidebar.markdown("*Defaults to `phishing_knowledge_base.json` if empty.*")

tab1, tab2 = st.tabs(["💬 Text & Link Scanner", "🎙️ Voice Mail Scanner"])

with tab1:
    st.subheader("Text & Link Threat Analysis")
    input_type = st.radio("Media Type", ["SMS", "Email", "URL"], horizontal=True)
    
    if input_type == "Email":
        text_input = st.text_area("Paste the raw Email source (Headers + Body) here:", height=250, help="For accurate metadata analysis, view the 'original source' or 'raw message' in your email client and paste the full text including headers (e.g., Return-Path, Received, Message-ID).")
    else:
        text_input = st.text_area(f"Paste the suspicious {input_type} here (Optional if uploading screenshot):", height=150)
    
    upload_image = st.file_uploader("Upload a Screenshot / Image", type=['png', 'jpg', 'jpeg'])
    img_b64 = None
    if upload_image:
        img_b64 = base64.b64encode(upload_image.getvalue()).decode("utf-8")
        st.image(upload_image, caption="Attached Screenshot", use_container_width=True)
        
    if st.button(f"Scan {input_type}", type="primary", use_container_width=True):
        if not text_input.strip() and not img_b64:
            st.warning("Please enter some text or upload a screenshot to scan.")
        else:
            header_result = None
            if input_type == "Email" and text_input.strip():
                header_result = analyze_email_headers(text_input)
                        
            sig_matches = run_signature_scan(text_input)
                    
            with st.spinner(f"Analyzing {input_type} against threat datasets..."):
                # Dynamically select the correct specialized dataset
                active_dataset = None
                if input_type == "SMS": active_dataset = sms_dataset
                elif input_type == "Email": active_dataset = email_dataset
                elif input_type == "URL": active_dataset = url_dataset
                
                vt_key = st.session_state.get("vt_api_key", "")
                urlscan_key = st.session_state.get("urlscan_api_key", "")
                result = analyze_threat(text_input, input_type, custom_dataset=active_dataset, image_b64=img_b64, vt_api_key=vt_key, urlscan_api_key=urlscan_key, header_analysis_result=header_result)
                
            if "error" in result:
                st.error(result["error"])
            else:
                conf_val = result.get('threat_score', 0)
                if isinstance(conf_val, str):
                    conf_val = int(conf_val.replace('%', '')) if '%' in conf_val and conf_val.replace('%', '').isdigit() else (100 if result.get("is_threat") else 0)
                
                conf_str = f"{conf_val}%"
                
                if result.get("is_threat"):
                    st.error(f"🚨 **THREAT DETECTED** (Threat Rating: {conf_str})")
                    if input_type == "Email":
                        st.progress(conf_val)
                else:
                    st.success(f"✅ **APPEARS SAFE** (Threat Rating: {conf_str})")
                    if input_type == "Email":
                        st.progress(conf_val)
                        
                # Ensure the Pre-Scans are displayed neatly with the final report
                if input_type == "Email" and header_result:
                    st.markdown("### 🔐 Cryptographic Header Scan")
                    if header_result.get("is_authenticated"):
                        st.success(f"✅ **SENDER AUTHENTICATED:** Cryptographic signatures (SPF/DKIM) match the domain owner for `{header_result.get('auth_domain')}`.")
                    if header_result.get("is_forged"):
                        st.error("🚨 **CRYPTOGRAPHIC SPOOFING DETECTED** 🚨")
                        for hr in header_result.get("report", []):
                            st.error(hr)
                            
                if sig_matches:
                    st.error("🚨 **YARA-LITE SIGNATURE MATCHES FOUND** - The system instantly identified known malicious structures:")
                    for match in sig_matches:
                        st.markdown(f"- **{match['name']}** (Severity: {match['severity']}): {match['description']}")
                    
                st.markdown("### Threat Indicators Found:")
                indicators = result.get("indicators", [])
                if indicators and len(indicators) > 0 and indicators[0] != "None":
                    for ind in indicators:
                        st.markdown(f"- 🔴 {ind}")
                else:
                    st.markdown("- None detected.")
                    
                if result.get("raw_vt_report"):
                    st.markdown("### 🛡️ VirusTotal Raw Data:")
                    st.code(result.get("raw_vt_report"))
                    
                if result.get("raw_urlscan_report"):
                    st.markdown("### 🛡️ URLScan.io Raw Data:")
                    st.code(result.get("raw_urlscan_report"))
                    
                if input_type == "Email" and result.get("metadata_report"):
                    st.markdown("### 📧 Extensive Metadata Report:")
                    if result.get("is_threat"): st.error(result.get("metadata_report"))
                    else: st.success(result.get("metadata_report"))
                    
                if input_type == "Email" and result.get("link_analysis"):
                    st.markdown("### 🔗 Link Analysis:")
                    if result.get("is_threat"): st.warning(result.get("link_analysis"))
                    else: st.info(result.get("link_analysis"))
                    
                st.markdown("### 🧠 AI Analysis:")
                if result.get("is_threat"):
                    st.error(result.get("analysis", "No detailed analysis provided."))
                else:
                    st.success(result.get("analysis", "No detailed analysis provided."))

with tab2:
    st.subheader("Voicemail Threat Analysis")
    st.markdown("Upload a suspicious `.wav` or `.mp3` voicemail. The system will transcribe the audio locally and analyze it for **Vishing** (Voice Phishing) attacks.")
    st.caption("*(Need an audio file to test? Check the `samples/` folder in the project directory!)*")
    
    uploaded_file = st.file_uploader("Upload Voicemail", type=['wav', 'mp3', 'm4a', 'flac'])
    
    if uploaded_file is not None:
        st.audio(uploaded_file, format=f"audio/{uploaded_file.name.split('.')[-1]}")
        
        if st.button("Transcribe & Scan Audio", type="primary", use_container_width=True):
            with st.spinner("Transcribing audio locally (This may take a moment on CPU)..."):
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.name.split('.')[-1]}") as tmp:
                    tmp.write(uploaded_file.getvalue())
                    tmp_path = tmp.name
                
                try:
                    transcription = transcribe_audio(tmp_path)
                finally:
                    try:
                        os.remove(tmp_path)
                    except:
                        pass
                        
            if transcription.startswith("AUDIO ERROR:"):
                st.error(transcription)
            else:
                st.info(f"**Transcription:**\n\n\"{transcription}\"")
                
                with st.spinner("Analyzing transcription against threat databases..."):
                    vt_key = st.session_state.get("vt_api_key", "")
                    result = analyze_threat(transcription, "Voice Mail", custom_dataset=None, vt_api_key=vt_key)
                    
                if "error" in result:
                    st.error(result["error"])
                else:
                    threat_score = result.get('threat_score', 0)
                    if result.get("is_threat"):
                        st.error(f"🚨 **VOICE THREAT DETECTED** (Threat Rating: {threat_score}%)")
                    else:
                        st.success(f"✅ **NO THREAT DETECTED** (Threat Rating: {threat_score}%)")
                        
                    st.markdown("### Threat Indicators Found:")
                    indicators = result.get("indicators", [])
                    if indicators and len(indicators) > 0 and indicators[0] != "None":
                        for ind in indicators:
                            st.markdown(f"- 🔴 {ind}")
                    else:
                        st.markdown("- None detected.")
                        
                    st.markdown("### 🧠 AI Analysis:")
                    if result.get("is_threat"):
                        st.error(result.get("analysis", "No detailed analysis provided."))
                    else:
                        st.success(result.get("analysis", "No detailed analysis provided."))
