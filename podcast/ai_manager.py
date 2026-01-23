import os
import json
from google import genai
from google.genai import types
import yt_dlp
from dotenv import load_dotenv

load_dotenv()


class AIGenerationError(Exception):
    """Base class for AI generation errors."""

    pass


class AIRateLimitError(AIGenerationError):
    """Raised when AI rate limit is reached."""

    pass


class AIManager:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in environment variables.")

        # Initialize the new GenAI client
        self.client = genai.Client(api_key=api_key)

        # Use gemini-1.5-flash or gemini-2.0-flash as defaults
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

        # Load prompt template
        self.prompt_template = ""
        prompt_path = os.path.join(os.path.dirname(__file__), "prompt.md")
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                self.prompt_template = f.read()
        else:
            print(f"Warning: prompt.md not found at {prompt_path}")

    def get_transcript(self, video_url):
        """
        Fetches the transcript of a YouTube video using yt-dlp.
        """
        ydl_opts = {
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["si", "en"],
            "quiet": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                description = info.get("description", "")
                return description
        except Exception as e:
            print(f"Error fetching transcript: {e}")
            return None

    def generate_metadata(self, video_url, transcript=None):
        """
        Calls Gemini to generate metadata based on the prompt.md template.
        """
        if not self.prompt_template:
            return None

        # Fetch transcript/description if not provided
        if not transcript:
            transcript = self.get_transcript(video_url)

        # Prepare the prompt
        prompt_text = self.prompt_template.replace("{video_url}", video_url)

        if transcript:
            prompt_text += (
                f"\n\n**Video Transcript/Description**:\n{transcript[:10000]}"
            )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt_text,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            if response and response.text:
                content = response.text.strip()
                # Clean up markdown if present
                if content.startswith("```json"):
                    content = content[7:].strip()
                if content.endswith("```"):
                    content = content[:-3].strip()

                return json.loads(content)
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "rate limit" in err_msg:
                raise AIRateLimitError(f"AI Rate limit reached: {e}")
            raise AIGenerationError(f"AI Generation failed: {e}")

        return None


if __name__ == "__main__":
    # Simple test if run directly
    manager = AIManager()
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    print(f"Testing Gemini with URL: {test_url}")
    result = manager.generate_metadata(
        test_url, transcript="This is a test transcript."
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
