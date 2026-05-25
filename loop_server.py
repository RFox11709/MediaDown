import subprocess
import time
import sys
import os
import venv

# --- CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_SCRIPT = os.path.join(CURRENT_DIR, "server.py")
VENV_DIR = os.path.join(CURRENT_DIR, ".venv")
REQ_FILE = os.path.join(CURRENT_DIR, "requirements.txt")

# Flag to keep the server window hidden on Windows
CREATE_NO_WINDOW = 0x08000000

def get_venv_python():
    """Calculates the python path dynamically based on OS."""
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")

def setup_environment():
    """Checks for .venv, creates it, and installs requirements with safety retries."""
    if not os.path.exists(VENV_DIR):
        print(f"[*] Creating virtual environment in {VENV_DIR}...")
        venv.create(VENV_DIR, with_pip=True)
    
    venv_python = get_venv_python()

    if os.path.exists(REQ_FILE):
        print("[*] Syncing requirements (handling network stability)...")
        try:
            # We add --default-timeout and purge cache to prevent that JSONDecodeError
            subprocess.run(
                [venv_python, "-m", "pip", "install", "-r", REQ_FILE, "--default-timeout=100"],
                check=True
            )
        except subprocess.CalledProcessError:
            print("[!] Pip failed. Clearing cache and retrying...")
            # Clean corrupt metadata/cache and try one last time
            subprocess.run([venv_python, "-m", "pip", "cache", "purge"], check=True)
            subprocess.run(
                [venv_python, "-m", "pip", "install", "-r", REQ_FILE, "--default-timeout=120"],
                check=True
            )
    else:
        print(f"[!] Warning: {REQ_FILE} not found. Skipping install.")
    
    return venv_python

def run_server(venv_python):
    """Loops the server script indefinitely using the verified venv path."""
    print(f"[*] Server loop is active via {venv_python}")
    while True:
        try:
            # Run server.py hidden
            subprocess.run(
                [venv_python, SERVER_SCRIPT], 
                creationflags=CREATE_NO_WINDOW
            )
        except Exception as e:
            print(f"[!] Server Error: {e}")
        
        # If server crashes/closes, wait 2 seconds and restart
        print("[*] Server stopped. Restarting in 2s...")
        time.sleep(2)

if __name__ == "__main__":
    try:
        # 1. Initialize environment and get the verified python path
        verified_python = setup_environment()
        
        # 2. Run the server loop
        run_server(verified_python)
        
    except KeyboardInterrupt:
        print("\n[!] Loop terminated by Ghost.")
    except Exception as e:
        print(f"[!] Critical Failure: {e}")