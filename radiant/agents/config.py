"""
Radiant Agent Configuration.
API keys loaded from environment variables.
"""
import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 8000
MAX_NEW_NODES = 15
