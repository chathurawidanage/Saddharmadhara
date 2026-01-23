import yt_dlp
import os
import requests
import json
from dotenv import load_dotenv
import email.utils
import concurrent.futures
import threading

from title_matcher import is_thero_in_title, load_thero_data
from s3_manager import S3Manager
from audio_processor import AudioProcessor
from rss_generator import RSSGenerator
from ai_manager import AIManager, AIRateLimitError, AIGenerationError

load_dotenv()


class PodcastSync:
    def __init__(self, thero_config):
        self.config = thero_config
        self.thero_id = thero_config["id"]
        self.thero_name = thero_config.get("name", self.thero_id)
        self.podcast_config = thero_config["podcast"]
        self.ai_config = thero_config.get("ai_config", {"enabled": False})
        self.sync_config = thero_config.get("sync_config", {"max_videos_per_day": 999})

        # S3 Setup via Composition
        s3_conf = thero_config["s3"]
        self.s3 = S3Manager(
            endpoint=os.getenv(s3_conf["endpoint_env"]),
            bucket=os.getenv(s3_conf["bucket_env"]),
            access_key=os.getenv(s3_conf["access_key_env"]),
            secret_key=os.getenv(s3_conf["secret_key_env"]),
        )
        self.base_url = self.s3.base_url = f"{self.s3.endpoint}/{self.s3.bucket}"

        # Audio Setup via Composition
        self.audio = AudioProcessor(self.thero_name)

        # AI Manager Setup
        self.ai_manager = AIManager() if self.ai_config.get("enabled") else None
        self.ai_rate_limited = False

        # Rate Limiting State
        self.state_file = "sync_state.json"
        self.state = self.s3.load_state(self.state_file)
        self.state_lock = threading.Lock()

    def download_and_process(self, video_url):
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": "%(id)s_raw.%(ext)s",
            "quiet": True,
        }
        raw_file, mp3_file, meta_file, img_file = None, None, None, None

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)
                vid_id = info["id"]

                # Title filter
                if "matcher" in self.config and not is_thero_in_title(
                    info.get("title", ""), self.config
                ):
                    print(
                        f"[{self.thero_name}] Skipping {vid_id}: Title mismatch. {info.get('title', '')}"
                    )
                    return None

                raw_file = ydl.prepare_filename(info)
                mp3_file, meta_file, img_file = (
                    f"{vid_id}.mp3",
                    f"{vid_id}.json",
                    f"{vid_id}.jpg",
                )
                title = info.get("title", "No Title")

                # AI Metadata Generation
                ai_data = None
                if self.ai_manager:
                    print(f"[{self.thero_name}] Generating AI metadata for {vid_id}...")
                    try:
                        ai_data = self.ai_manager.generate_metadata(video_url)
                        if ai_data:
                            print(
                                f"[{self.thero_name}] AI metadata generated for {vid_id}."
                            )
                            # Override title if provided
                            if ai_data.get("title"):
                                title = ai_data["title"]
                    except AIRateLimitError as e:
                        print(f"[{self.thero_name}] AI Rate Limit reached: {e}")
                        self.ai_rate_limited = True
                        return None
                    except AIGenerationError as e:
                        print(
                            f"[{self.thero_name}] AI Generation failed for {vid_id}: {e}"
                        )
                        return None

                # Audio Conversion
                print(f"[{self.thero_name}] Processing audio: {vid_id}")
                self.audio.convert_to_mp3(raw_file, mp3_file)

                # Uploads
                self.s3.upload_file(mp3_file, mp3_file, "audio/mpeg")

                # Thumbnail
                s3_img_url = None
                thumb_url = info.get("thumbnail")
                if thumb_url:
                    try:
                        r = requests.get(thumb_url, stream=True)
                        if r.status_code == 200:
                            with open(img_file, "wb") as f:
                                for chunk in r.iter_content(1024):
                                    f.write(chunk)
                            self.s3.upload_file(img_file, img_file, "image/jpeg")
                            s3_img_url = f"{self.base_url}/{img_file}"
                    except Exception as e:
                        print(f"[{self.thero_name}] Thumbnail error: {e}")

                # Metadata
                desc_tmp = self.podcast_config["description_template"]

                description = desc_tmp.format(title=title, original_url=video_url)
                if ai_data and ai_data.get("description"):
                    description += "\n\n" + ai_data["description"]

                metadata = {
                    "id": vid_id,
                    "title": title,
                    "original_url": video_url,
                    "description": description,
                    "s3_audio_url": f"{self.base_url}/{mp3_file}",
                    "s3_image_url": s3_img_url,
                    "pub_date": email.utils.formatdate(usegmt=True),
                    "length_bytes": os.path.getsize(mp3_file),
                    "duration": info.get("duration", 0),
                    "ai_response": ai_data,
                }

                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
                self.s3.upload_file(meta_file, meta_file, "application/json")
                return metadata

        finally:
            for f in [raw_file, mp3_file, meta_file, img_file]:
                if f and os.path.exists(f):
                    os.remove(f)

    def process_video_task(self, item):
        vid_id = item["id"]
        if self.ai_rate_limited:
            return None

        if self.s3.file_exists(f"{vid_id}.json"):
            print(f"[{self.thero_name}] Skipping {vid_id}: Already exists in S3.")
            return None

        with self.state_lock:
            if (
                self.state["videos_synced_today"]
                >= self.sync_config["max_videos_per_day"]
            ):
                print(
                    f"[{self.thero_name}] Skipping {vid_id}: Daily sync limit reached ({self.sync_config['max_videos_per_day']})."
                )
                return None

        result = self.download_and_process(item["url"])
        if result:
            with self.state_lock:
                self.state["videos_synced_today"] += 1
                self.s3.save_state(self.state_file, self.state)
            print(f"[{self.thero_name}] Successfully synced {vid_id}.")
        return result

    def sync(self):
        print(f"[{self.thero_name}] Starting sync...")
        urls = self.config.get("youtube_channel_urls", []) or [
            self.config.get("youtube_channel_url")
        ]
        video_items = []

        with yt_dlp.YoutubeDL({"extract_flat": True, "quiet": True}) as ydl:
            for url in urls:
                if not url:
                    continue
                print(f"[{self.thero_name}] Fetching videos from: {url}")
                try:
                    info = ydl.extract_info(url, download=False)
                    entries = info.get("entries", [])
                    print(f"[{self.thero_name}] Found {len(entries)} videos.")
                    for entry in entries:
                        if entry and "id" in entry:
                            video_items.append(
                                {
                                    "id": entry["id"],
                                    "url": entry.get("url")
                                    or f"https://www.youtube.com/watch?v={entry['id']}",
                                }
                            )
                except Exception as e:
                    print(f"[{self.thero_name}] Error fetching channel: {e}")

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=os.cpu_count() or 4
        ) as executor:
            list(executor.map(self.process_video_task, video_items))

        if self.ai_rate_limited:
            print(f"[{self.thero_name}] Sync partially halted due to AI Rate Limiting.")

        # Refresh RSS
        print(f"[{self.thero_name}] Refreshing RSS feed...")
        metadata_keys = self.s3.list_metadata_files()
        print(f"[{self.thero_name}] Found {len(metadata_keys)} metadata files in S3.")
        items = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            items = [
                res for res in executor.map(self.s3.get_json, metadata_keys) if res
            ]

        print(f"[{self.thero_name}] Sorting {len(items)} items by date...")
        items.sort(
            key=lambda x: email.utils.parsedate_to_datetime(x.get("pub_date", "")),
            reverse=True,
        )

        # Filter out non-podcast friendly items if AI is enabled and flagged
        original_count = len(items)
        items = [
            item
            for item in items
            if item.get("ai_response", {}).get("podcast_friendly", True) is not False
        ]
        if len(items) < original_count:
            print(
                f"[{self.thero_name}] Filtered out {original_count - len(items)} non-podcast friendly items."
            )

        rss_file = self.config.get("rss_filename", "podcast.xml")
        RSSGenerator.generate(self.config, items, self.base_url, rss_file)
        self.s3.upload_file(rss_file, rss_file, "application/xml")
        if os.path.exists(rss_file):
            os.remove(rss_file)
        print(f"[{self.thero_name}] Sync complete.")


def run_sync_workflow():
    theros_dir = os.path.join(os.path.dirname(__file__), "theros")
    for filename in os.listdir(theros_dir):
        if filename.endswith(".json") and "_thero" in filename:
            try:
                config = load_thero_data(os.path.join(theros_dir, filename))
                if not config.get("enabled", True):
                    print(f"Skipping {filename}: Disabled in config.")
                    continue
                PodcastSync(config).sync()
            except Exception as e:
                print(f"Error syncing {filename}: {e}")


if __name__ == "__main__":
    run_sync_workflow()
