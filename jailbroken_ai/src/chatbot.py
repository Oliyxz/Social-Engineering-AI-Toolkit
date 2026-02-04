import ollama
from src.prompt_builder import get_system_prompt
from src.file_manager import load_all_data
from src.config_loader import load_config

def get_chatbot_response(messages, security_level, user_role="User"):
    """
    Generates a response from the chatbot using Ollama.
    messages: List of dicts [{"role": "user", "content": "..."}]
    security_level: int (0, 1, 2)
    user_role: str ("User", "HR", "CEO")
    """
    # 1. Load Config & Data
    config = load_config()
    model_name = config["model"]["name"]
    temperature = config["model"]["temperature"]
    # Context window is handled by Ollama server implicitly but can be passed in options if needed
    
    context_data = load_all_data()
    
    # 2. Build System Prompt
    system_prompt = get_system_prompt(security_level, context_data, user_role)
    
    # 3. Prepare Message History
    # Ollama accepts a system message at the start
    
    # LEVEL 5 SPECIAL HANDLING: XML WRAPPING
    if security_level == 5:
        processed_messages = []
        for msg in messages:
            if msg["role"] == "user":
                # Escape existing tags to prevent breakout
                safe_content = msg["content"].replace("<", "&lt;").replace(">", "&gt;")
                wrapped_content = f"<user_input>\n{safe_content}\n</user_input>"
                processed_messages.append({"role": "user", "content": wrapped_content})
            else:
                processed_messages.append(msg)
        full_messages = [{"role": "system", "content": system_prompt}] + processed_messages
    else:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    try:
        # Use the ollama python library
        response_stream = ollama.chat(
            model=model_name,
            messages=full_messages,
            stream=True,
            options={
                "temperature": temperature,
                # "num_ctx": config["model"]["context_window"] # Optional: Uncomment if context limits are hit
            }
        )
        
        # Generator wrapper to yield chunks from Ollama response
        def stream_generator():
            for chunk in response_stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield chunk['message']['content']
                    
        return stream_generator()

    except Exception as e:
        return f"Error communicating with Ollama: {e}. Is Ollama running? (`ollama serve`)"
