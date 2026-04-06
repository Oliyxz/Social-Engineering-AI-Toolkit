import requests
import json
import os

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "llama3.1" # Standard model

def load_phishing_dataset():
    dataset_path = os.path.join(os.path.dirname(__file__), 'datasets', 'phishing_knowledge_base.json')
    try:
        with open(dataset_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load dataset. {e}")
        return []

def check_virustotal_urls(text, api_key):
    import re
    import base64
    
    urls = re.findall(r'(https?://[^\s<>"\']+)', text)
    if not urls:
        return ""
    
    if not api_key:
        return "URLs found in text, but no VirusTotal API key provided to scan them."
        
    vt_results = []
    headers = {
        "accept": "application/json",
        "x-apikey": api_key
    }
    
    for url in set(urls):
        try:
            url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
            vt_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
            
            resp = requests.get(vt_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                stats = resp.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                undetected = stats.get("undetected", 0)
                harmless = stats.get("harmless", 0)
                
                vt_results.append(f"URL: {url} | Malicious: {malicious}, Suspicious: {suspicious}, Harmless: {harmless}, Undetected: {undetected}")
            elif resp.status_code == 404:
                vt_results.append(f"URL: {url} | Not found in VirusTotal database.")
            else:
                 vt_results.append(f"URL: {url} | VirusTotal API Error: {resp.status_code}")
        except Exception as e:
            vt_results.append(f"URL: {url} | Check failed: {str(e)}")
            
    return "\n".join(vt_results)

def run_signature_scan(text):
    import re
    # Load YARA-Lite DB
    rules_path = os.path.join(os.path.dirname(__file__), 'rules', 'threat_signatures.json')
    try:
        with open(rules_path, 'r') as f:
            rules = json.load(f)
    except:
        return []
        
    matches = []
    for rule in rules:
        if "pattern" in rule and re.search(rule["pattern"], text):
            matches.append(rule)
            
    return matches

def analyze_email_headers(raw_email_text):
    import email
    import re
    msg = email.message_from_string(raw_email_text)
    
    headers_report = []
    has_spf_fail = False
    has_dkim_fail = False
    is_authenticated = False
    auth_domain = ""
    
    auth_results = msg.get_all('Authentication-Results', [])
    for res in auth_results:
        res_lower = res.lower()
        if 'spf=fail' in res_lower or 'spf=softfail' in res_lower:
            has_spf_fail = True
            headers_report.append("SPF FAILURE: The sender's IP is not authorized by the domain owner.")
        if 'dkim=fail' in res_lower:
            has_dkim_fail = True
            headers_report.append("DKIM FAILURE: The email's cryptographic signature is invalid or tampered.")
        if 'dmarc=fail' in res_lower:
            headers_report.append("DMARC FAILURE: The email failed domain authentication alignments.")
            
        if 'dmarc=pass' in res_lower:
            is_authenticated = True
            match = re.search(r'header\.from=([\w.-]+)', res_lower)
            if match:
                auth_domain = match.group(1)
            
    return {
        "is_forged": has_spf_fail or has_dkim_fail,
        "is_authenticated": is_authenticated,
        "auth_domain": auth_domain,
        "report": headers_report
    }

def check_urlscan_io(text, api_key):
    import re
    urls = re.findall(r'(https?://[^\s<>"\']+)', text)
    if not urls:
        return ""
    if not api_key:
        return "URLs found, but no URLScan.io API key provided."
        
    urlscan_results = []
    headers = {'API-Key': api_key}
    
    for url in set(urls):
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            if not domain: continue
            
            search_url = f"https://urlscan.io/api/v1/search/?q=domain:{domain}"
            resp = requests.get(search_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                total = data.get("total", 0)
                if total > 0:
                    results = data.get("results", [])
                    malicious_count = sum(1 for r in results if r.get("verdicts", {}).get("overall", {}).get("malicious"))
                    urlscan_results.append(f"URLScan ({domain}): {total} previous scans found. {malicious_count} marked MALICIOUS.")
                else:
                    urlscan_results.append(f"URLScan ({domain}): No previous scans found on URLScan.io.")
            elif resp.status_code == 401:
                urlscan_results.append(f"URLScan ({domain}): Invalid API Key.")
            else:
                 urlscan_results.append(f"URLScan ({domain}): API Error {resp.status_code}")
        except Exception as e:
            urlscan_results.append(f"URLScan ({domain}): Check failed: {str(e)}")
            
    return "\n".join(urlscan_results)

def analyze_threat(text_to_analyze, input_type="Text", custom_dataset=None, image_b64=None, vt_api_key=None, urlscan_api_key=None, header_analysis_result=None):
    import random
    
    if custom_dataset:
        dataset = custom_dataset
    else:
        dataset = load_phishing_dataset()
        
    # Prevent LLM token limit overload by drawing up to 7 random examples from giant CSVs
    if len(dataset) > 7:
        dataset = random.sample(dataset, 7)
    
    # Format the Few-Shot dataset for Ollama
    examples_prompt = "Here are examples of known phishing/fraud attempts from our proprietary database for you to learn from:\n\n"
    for item in dataset:
        status = "PHISHING/FRAUD" if item.get("is_phishing") else "SAFE"
        indicators = ", ".join(item.get("threat_indicators", [])) if item.get("threat_indicators") else "None"
        examples_prompt += f"Type: {item.get('type')}\nMessage: \"{item.get('content')}\"\nStatus: {status}\nIndicators: {indicators}\n\n"
        
    vt_report = check_virustotal_urls(text_to_analyze, vt_api_key)
    vt_context = f"\n\nVIRUSTOTAL URL ANALYSIS:\n{vt_report}\n\n" if vt_report else ""

    urlscan_report = check_urlscan_io(text_to_analyze, urlscan_api_key)
    urlscan_context = f"URLSCAN.IO REPORT:\n{urlscan_report}\n\n" if urlscan_report else ""
    
    header_context = ""
    if header_analysis_result:
        if header_analysis_result.get("is_forged"):
            header_context = "\n\nCRITICAL SYSTEM ALERT: Cryptographic email headers (SPF/DKIM) have FAILED. This email is technically forged and definitively a phishing attempt.\n\n"
        elif header_analysis_result.get("is_authenticated"):
            domain = header_analysis_result.get("auth_domain", "the sender's domain")
            header_context = f"\n\nCRITICAL SYSTEM ALERT: Cryptographic email headers (SPF/DKIM/DMARC) have PASSED for '{domain}'. This means the email was legally and cryptographically authorized by the official company. DO NOT mark this as a spoofed phishing attempt. IT IS HIGHLY LIKELY TO BE A GENUINE MARKETING EMAIL. You should generate a dynamic, low 'threat_score' (e.g., 5, 15) reflecting any mild suspicious characteristics in the content. Do not categorize it as a full threat unless there are undeniable zero-day malware links.\n\n"
    
    email_instructions = ""
    json_template = """{
  "is_threat": false,
  "threat_score": 10,
  "indicators": ["indicator1"],
  "analysis": "**Point:** [Your main finding]\\n\\n**Evidence:** [The specific text/data that proves it]\\n\\n**Explanation:** [Why this matters]"
}"""
    
    if input_type == "Email":
        email_instructions = """
You MUST also include 'metadata_report' and 'link_analysis' in your JSON response.
CRITICAL: You must format 'analysis', 'metadata_report', and 'link_analysis' with rich Markdown (e.g., bullet points, **bold text**, and \\n\\n for paragraph breaks) so they are visually appealing and easy to read in the UI.
CRITICAL MANDATORY RULE: The 'analysis' field MUST be a pure text string containing your Markdown analysis. It MUST NOT be a nested JSON object or dictionary containing parsed email fields! If you output a nested dictionary for the analysis, the UI will break.
The "threat_score" percentage must represent the overall Danger / Threat severity (0-100%) based specifically on the metadata and links provided.
"""
        json_template = """{
  "is_threat": true,
  "threat_score": 85,
  "indicators": ["Suspicious Return-Path", "Malicious Link"],
  "analysis": "**Point:** [Your main finding]\\n\\n**Evidence:** [The specific text/data that proves it]\\n\\n**Explanation:** [Why this matters]",
  "metadata_report": "- **Header Anomaly:** [Detail]\\n- **Routing Issue:** [Detail]",
  "link_analysis": "- **URL 1:** [Analysis]\\n- **VirusTotal Context:** [Analysis]"
}"""

    # Truncate massive emails to prevent Ollama from exceeding its default 2048-token context window
    # which cuts off the end of the prompt (where the JSON instructions normally were).
    safe_text = text_to_analyze[:6000] + ("\n...[TRUNCATED]" if len(text_to_analyze) > 6000 else "")

    voice_instructions = ""
    if input_type == "Voice Mail":
        voice_instructions = "CRITICAL VOICE ANALYSIS: This transcription contains timestamped audio segments. You MUST use the flow of conversation and these pauses to logically deduce ALL distinct speakers (e.g. telling Multiple Scammers, a 'Supervisor', or Bank Reps apart from the Victim) so you don't confuse who is demanding what.\n\n"

    system_prompt = f"""You are 'The Fraud Hunter', an elite cybersecurity AI.
Your job is to analyze the user-submitted {input_type} message and determine if it is a phishing, vishing, or smishing scam.

{vt_context}
{urlscan_context}

{examples_prompt}

{voice_instructions}CRITICAL TASK:
You MUST provide a strictly structured JSON response exactly matching this template. ONLY return valid JSON. Do not include markdown formatting like ```json.
DO NOT CREATE YOUR OWN JSON KEYS. DO NOT USE ANY DIFFERENT SCHEMA. ONLY USE THE KEYS SHOWN IN THE TEMPLATE EXACTLY.

TEMPLATE:
{json_template}

{email_instructions}

{header_context}

User Message text to analyze:
\"\"\"
{safe_text if safe_text.strip() else '[See attached Image/Screenshot]'}
\"\"\"
"""

    # Use native JSON schema if supported by Ollama to force exact key adherence
    schema = {
        "type": "object",
        "properties": {
            "is_threat": {"type": "boolean"},
            "threat_score": {"type": "integer", "description": "Danger severity from 0 to 100"},
            "indicators": {"type": "array", "items": {"type": "string"}},
            "analysis": {"type": "string"}
        },
        "required": ["is_threat", "threat_score", "indicators", "analysis"]
    }
    
    if input_type == "Email":
        schema["properties"]["metadata_report"] = {"type": "string"}
        schema["properties"]["link_analysis"] = {"type": "string"}
        schema["required"].extend(["metadata_report", "link_analysis"])

    payload = {
        "model": "llama3.2-vision" if image_b64 else MODEL_NAME,
        "prompt": system_prompt,
        "stream": False,
        "format": schema
    }
    
    if image_b64:
        payload["images"] = [image_b64]
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        # Attempt to parse Ollama's returned string as JSON
        try:
            parsed = json.loads(data['response'])
            if isinstance(parsed, dict):
                # Handle cases where Llama 3 hallucinates nested JSON objects for text fields
                for key in ['analysis', 'metadata_report', 'link_analysis']:
                    if key in parsed and isinstance(parsed[key], dict):
                        # Flatten the hallucinated dictionary into beautiful Markdown
                        md_parts = []
                        for k, v in parsed[key].items():
                            clean_k = str(k).replace("_", " ").title()
                            if isinstance(v, list):
                                clean_v = ", ".join([str(x) for x in v])
                            else:
                                clean_v = str(v)
                            md_parts.append(f"**{clean_k}:** {clean_v}")
                        parsed[key] = "\n\n".join(md_parts)
                    elif key in parsed and isinstance(parsed[key], list):
                        parsed[key] = "\n\n".join([f"- {str(x)}" for x in parsed[key]])
                
                if vt_report: parsed['raw_vt_report'] = vt_report
                if urlscan_report: parsed['raw_urlscan_report'] = urlscan_report
            return parsed
        except json.JSONDecodeError:
             return {
                 "is_threat": None,
                 "confidence": "Error",
                 "indicators": ["JSON Parsing Error"],
                 "analysis": f"The model failed to return properly formatted JSON. Raw response: {data['response']}"
             }
             
    except requests.exceptions.HTTPError as he:
        if response.status_code == 404 and image_b64:
             return {
                 "is_threat": None,
                 "error": f"VISION ERROR: To scan screenshots, you must install the vision model! Please run `ollama pull llama3.2-vision` in your terminal."
             }
        return {
            "is_threat": None,
            "error": f"HTTP ERROR: {he}"
        }
    except Exception as e:
        return {
            "is_threat": None,
            "error": f"SYSTEM ERROR: Failed to connect to Ollama. Detail: {str(e)}"
        }

if __name__ == "__main__":
    # Test execution
    print("Testing Scanner Offline...")
    res = analyze_threat("Hey this is the IRS. You owe $500. Pay in Apple Gift Cards now.", "Voice")
    print(json.dumps(res, indent=2))
