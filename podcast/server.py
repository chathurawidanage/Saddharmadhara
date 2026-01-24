from flask import Flask, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import threading
from sync import run_sync_workflow
import os

app = Flask(__name__)

# Lock to prevent concurrent executions
sync_lock = threading.Lock()


@app.route("/sync", methods=["POST", "GET"])
def trigger_sync():
    """Triggers the podcast synchronization workflow asynchronously."""
    if not sync_lock.acquire(blocking=False):
        return jsonify({"status": "error", "message": "Sync already in progress"}), 429

    def background_sync():
        try:
            print("Starting scheduled sync...")
            run_sync_workflow()
            print("Scheduled sync completed.")
        except Exception as e:
            print(f"Error during sync: {e}")
        finally:
            sync_lock.release()

    thread = threading.Thread(target=background_sync)
    thread.start()

    return (
        jsonify({"status": "accepted", "message": "Sync started in background"}),
        202,
    )


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


@app.route("/metrics", methods=["GET"])
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
