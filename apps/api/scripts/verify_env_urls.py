import os

def check_file(path, label):
    print(f"\n--- {label} ({path}) ---")
    if not os.path.exists(path):
        print("File not found.")
        return
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if "SUPABASE_URL" in line:
                print(f"DEBUG: {line.strip()}")

check_file(".env", "Backend")
check_file("apps/web/.env.local", "Frontend")
