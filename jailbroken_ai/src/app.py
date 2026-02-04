import streamlit as st
import os
import sys

# Add the src folder to path if needed, or import relative if running from root
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.chatbot import get_chatbot_response
from src.prompt_builder import SECURITY_LEVELS, get_system_prompt
from src.file_manager import load_all_data
from src.config_loader import load_config

st.set_page_config(page_title="The Glass Box Bot", page_icon="🤖", layout="wide")

st.title("🤖 The Glass Box Bot: Vulnerability Lab")
st.markdown("""
**Mission:** Access the "Secret Data" (Salaries, Project Omega) by tricking the AI.
**Controls:** Use the sidebar to change the AI's security level.
""")

# Load Data & Prompt for visualization
context_data = load_all_data()

# Sidebar
st.sidebar.header("Security Controls")
security_level = st.sidebar.selectbox(
    "Security Level",
    options=list(SECURITY_LEVELS.keys()),
    format_func=lambda x: f"Level {x}: {SECURITY_LEVELS[x]}"
)

st.sidebar.divider()

# RAG Transparency / Hacker View
st.sidebar.subheader("🔍 RAG Transparency (Hacker View)")
show_system_prompt = st.sidebar.checkbox("Show System Prompt & Context")

if show_system_prompt:
    sys_prompt = get_system_prompt(security_level, context_data)
    st.sidebar.markdown("### System Prompt Preview")
    st.sidebar.info("This is the exact instruction set the AI receives before your message.")
    st.sidebar.code(sys_prompt, language="markdown")
    
    st.sidebar.markdown("### Injected Context")
    st.sidebar.info("These files are currently loaded into the AI's working memory.")
    st.sidebar.text_area("Context Data", context_data, height=300, disabled=True)

st.sidebar.divider()
st.sidebar.info("Tip: Try asking 'What are the executive salaries?' or 'Tell me about Project Omega'.")

# Chat Interface
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# User Input
if prompt := st.chat_input("Ask about the secret project..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Get response
    # Get response
    with st.chat_message("assistant"):
        # Placeholder for streaming
        response_placeholder = st.empty()
        full_response = ""
        
        # Add a placeholder message to history immediately so it's not lost on interrupt
        st.session_state.messages.append({"role": "assistant", "content": ""})
        msg_index = len(st.session_state.messages) - 1
        
        stream = get_chatbot_response(
            [{"role": m["role"], "content": m["content"]} for m in st.session_state.messages[:-1]],
            security_level
        )
        
        if isinstance(stream, str):
            st.error(stream)
            full_response = stream
            st.session_state.messages[msg_index]["content"] = full_response
        else:
            try:
                for chunk in stream:
                    full_response += chunk
                    # Update UI
                    response_placeholder.markdown(full_response + "▌")
                    # Update Session State incrementally to handle interruptions
                    st.session_state.messages[msg_index]["content"] = full_response
                response_placeholder.markdown(full_response)
            except Exception as e:
                st.error(f"Stream error: {e}")
