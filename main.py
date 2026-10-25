"""
Himalayan Flood Prediction - Main Application Launcher
Runs the FastAPI backend and serves the interactive frontend dashboard.
"""

import uvicorn
import webbrowser
import threading
import time

def open_browser(url: str):
    time.sleep(1.5)
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == "__main__":
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    print("=" * 70)
    print("  HIMALAYAN FLOOD PREDICTION & EARLY WARNING SYSTEM (HimAlert AI)")
    print("  Hydrometeorological Machine Learning with GloFAS & ERA5 Reanalysis")
    print(f"  Server starting at: {url}")
    print("=" * 70)
    
    # Auto-open browser in background thread
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()
    
    uvicorn.run("backend.app:app", host=host, port=port, reload=False, log_level="info")
