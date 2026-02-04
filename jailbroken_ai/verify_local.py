import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))

from config_loader import load_config
from file_manager import load_all_data
from prompt_builder import get_system_prompt

print("--- Testing Config Loader ---")
config = load_config()
if config and "model" in config:
    print(f"SUCCESS: Config loaded. Model: {config['model']['name']}")
else:
    print("FAILURE: Config load failed.")

print("\n--- Testing File Manager (Ollama) ---")
data = load_all_data()
if "Arthur Pendragon" in data and "Project Omega" in data:
    print("SUCCESS: Data loaded correctly.")
else:
    print("FAILURE: Data not loaded correctly.")

print("\n--- Testing Prompt Builder (Ollama) ---")
prompt_2 = get_system_prompt(2, data)
if "STRICT SECURITY PROTOCOLS" in prompt_2:
    print("SUCCESS: Level 2 prompt generated.")
else:
    print("FAILURE: Level 2 prompt incorrect.")
