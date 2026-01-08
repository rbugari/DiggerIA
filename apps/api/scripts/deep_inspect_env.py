import os

env_path = ".env"
if not os.path.exists(env_path):
    print("FATAL: .env file does not exist at root.")
    exit(1)

print(f"File found at {os.path.abspath(env_path)}")
with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

keys_found = []
for i, line in enumerate(lines):
    # Print line index and a safe version of the line
    safe_line = line.strip().split('=')[0] if '=' in line else line.strip()
    print(f"Line {i+1}: {safe_line}")
    if "SUPABASE_URL" in line: keys_found.append("SUPABASE_URL")
    if "SUPABASE_KEY" in line: keys_found.append("SUPABASE_KEY")
    if "SUPABASE_SERVICE_ROLE_KEY" in line: keys_found.append("SUPABASE_SERVICE_ROLE_KEY")

print(f"\nSummary of keys found: {keys_found}")
