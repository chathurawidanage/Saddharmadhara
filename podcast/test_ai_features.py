import os
import json
from ai_manager import AIManager
from title_matcher import load_thero_data


def test_thero_ai(thero_config_path, sample_video_url):
    print(f"--- Testing AI Features for {thero_config_path} ---")
    config = load_thero_data(thero_config_path)
    ai_config = config.get("ai_config", {"enabled": False})

    if not ai_config.get("enabled"):
        print(
            f"AI features are NOT enabled for {config.get('name', 'this thero')}. Skipping."
        )
        return

    print("AI features are ENABLED. Calling Gemini...")
    ai_manager = AIManager()

    # In a real sync, we might have the transcript from yt-dlp.
    # Here we let AIManager fetch what it can (description etc.)
    result = ai_manager.generate_metadata(sample_video_url)

    if result:
        print("Success! Gemini response:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Failed to get response from Gemini.")


if __name__ == "__main__":
    # Test with Watagoda Maggavihari Thero (currently disabled in config)
    watagoda_path = os.path.join(
        os.path.dirname(__file__), "theros", "watagoda_maggavihari_thero.json"
    )
    sample_url = (
        "https://www.youtube.com/watch?v=9R-QF4dIyeE"  # Example URL from channel
    )

    test_thero_ai(watagoda_path, sample_url)

    # You can enable AI in the config to see it in action:
    # "ai_config": { "enabled": true, ... }
