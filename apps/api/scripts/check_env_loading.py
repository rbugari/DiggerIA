from app.config import settings
import os

print("--- Backend Settings Diagnostic ---")
print(f"LLM_PROVIDER: {settings.LLM_PROVIDER}")
print(f"GROQ_API_KEY set: {bool(settings.GROQ_API_KEY)}")
print(f"OPENAI_API_KEY set: {bool(settings.OPENAI_API_KEY)}")
print(f"OPENROUTER_API_KEY set: {bool(settings.OPENROUTER_API_KEY)}")
print(f"SUPABASE_URL: {settings.SUPABASE_URL}")

# Check raw environment variables
print("\n--- Raw Environment Variables ---")
print(f"ENV LLM_PROVIDER: {os.environ.get('LLM_PROVIDER')}")
print(f"ENV GROQ_API_KEY starts with gsk: {str(os.environ.get('GROQ_API_KEY')).startswith('gsk') if os.environ.get('GROQ_API_KEY') else False}")

print("\n--- .env Content Check ---")
if os.path.exists(".env"):
    with open(".env", "r") as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if "LLM_PROVIDER" in line:
                print(f"Line {i+1}: {line.strip()}")
            if "GROQ_API_KEY" in line:
                # Mask key but show start
                key = line.split('=')[1].strip() if '=' in line else ""
                print(f"Line {i+1}: GROQ_API_KEY={key[:10]}...")
else:
    print(".env file not found in current directory.")
