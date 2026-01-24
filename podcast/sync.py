import yt_dlp
from metrics import (
    attempt_counter,
    success_counter,
    skipped_counter,
    failure_counter,
    ai_failure_counter,
    ai_rate_limited_counter,
    sync_run_counter,
)
import os
import requests
import json
from dotenv import load_dotenv
import email.utils

from title_matcher import is_thero_in_content, load_thero_data
from s3_manager import S3Manager
from audio_processor import AudioProcessor
from rss_generator import RSSGenerator
from ai_manager import AIManager, AIRateLimitError, AIGenerationError
from rate_limiter import RateLimiter

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

        # Rate Limiting State (delegated to RateLimiter)
        self.state_file = "sync_state.json"
        # Initialise RateLimiter which loads and manages persisted state
        self.rate_limiter = RateLimiter(
            self.s3, self.state_file, self.sync_config.get("max_videos_per_day", 999)
        )

    def download_and_process(self, video_url):
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": "%(id)s_raw.%(ext)s",
            "quiet": True,
            "no_warnings": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "ios", "web_embedded"],
                    "js_runtime": "node",
                }
            },
        }
        raw_file, mp3_file, meta_file, img_file = None, None, None, None

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # First extract info without downloading to check the title
                info = ydl.extract_info(video_url, download=False)
                vid_id = info["id"]
                title = info.get("title", "No Title")
                meta_file = f"{vid_id}.json"

                # Title/Description filter check BEFORE download
                yt_description = info.get("description", "")
                if "matcher" in self.config and not is_thero_in_content(
                    title, yt_description, self.config
                ):
                    print(
                        f"[{self.thero_name}] Skipping {vid_id}: Title mismatch. Saving ignore record."
                    )
                    # Metadata for ignored video
                    metadata = {
                        "id": vid_id,
                        "title": title,
                        "original_url": video_url,
                        "title_match": False,
                        "pub_date": email.utils.formatdate(usegmt=True),
                    }
                    with open(meta_file, "w", encoding="utf-8") as f:
                        json.dump(metadata, f, indent=2, ensure_ascii=False)
                    self.s3.upload_file(meta_file, meta_file, "application/json")
                    return "ignored"

                # AI Metadata Generation (Before Download)
                ai_data = None
                original_title = title
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
                        ai_rate_limited_counter.labels(thero=self.thero_id).inc()
                        self.ai_rate_limited = True
                        return None
                    except AIGenerationError as e:
                        print(
                            f"[{self.thero_name}] AI Generation failed for {vid_id}: {e}"
                        )
                        ai_failure_counter.labels(thero=self.thero_id).inc()
                        return None

                mp3_file, img_file = (
                    f"{vid_id}.mp3",
                    f"{vid_id}.jpg",
                )

                s3_audio_url = None
                s3_image_url = None
                length_bytes = 0
                duration = info.get("duration", 0)

                # Check if we should skip audio processing
                is_friendly = True
                if ai_data and ai_data.get("podcast_friendly") is False:
                    is_friendly = False
                    print(
                        f"[{self.thero_name}] Video {vid_id} is not podcast-friendly. Skipping audio processing."
                    )

                if is_friendly:
                    # Now download because the title matched and it's podcast friendly
                    print(f"[{self.thero_name}] Downloading audio: {vid_id}")
                    ydl.download([video_url])
                    raw_file = ydl.prepare_filename(info)

                    # Audio Conversion
                    print(f"[{self.thero_name}] Processing audio: {vid_id}")
                    self.audio.convert_to_mp3(raw_file, mp3_file)

                    # Upload Audio
                    print(f"[{self.thero_name}] Uploading MP3: {vid_id}")
                    self.s3.upload_file(mp3_file, mp3_file, "audio/mpeg")
                    s3_audio_url = f"{self.base_url}/{mp3_file}"
                    length_bytes = os.path.getsize(mp3_file)

                    # Thumbnail
                    thumb_url = info.get("thumbnail")
                    if thumb_url:
                        try:
                            r = requests.get(thumb_url, stream=True)
                            if r.status_code == 200:
                                with open(img_file, "wb") as f:
                                    for chunk in r.iter_content(1024):
                                        f.write(chunk)
                                self.s3.upload_file(img_file, img_file, "image/jpeg")
                                s3_image_url = f"{self.base_url}/{img_file}"
                        except Exception as e:
                            print(f"[{self.thero_name}] Thumbnail error: {e}")

                # Metadata Generation
                desc_tmp = self.podcast_config["description_template"]
                description = desc_tmp.format(title=title, original_url=video_url)
                if ai_data and ai_data.get("description"):
                    description += "<br /><br />" + ai_data["description"]

                metadata = {
                    "id": vid_id,
                    "title": title,
                    "original_title": original_title,
                    "original_url": video_url,
                    "description": description,
                    "s3_audio_url": s3_audio_url,
                    "s3_image_url": s3_image_url,
                    "pub_date": email.utils.formatdate(usegmt=True),
                    "length_bytes": length_bytes,
                    "duration": duration,
                    "title_match": True,
                    "ai_response": ai_data,
                }

                # CRITICAL: Write and upload JSON ONLY after all other uploads are done
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)

                print(
                    f"[{self.thero_name}] Finalizing sync: Uploading metadata for {vid_id}"
                )
                self.s3.upload_file(meta_file, meta_file, "application/json")
                return metadata

        finally:
            for f in [raw_file, mp3_file, meta_file, img_file]:
                if f and os.path.exists(f):
                    os.remove(f)

    def process_video_task(self, item):
        # Increment attempt counter for each video processed
        attempt_counter.labels(thero=self.thero_id).inc()
        vid_id = item["id"]
        title = item.get("title")
        # Enforce periodic sync based on daily allowance regardless of AI rate limit
        # Enforce periodic sync limit via RateLimiter
        can_sync, wait_min = self.rate_limiter.can_sync_periodic()
        if not can_sync:
            print(
                f"[{self.thero_name}] Sync limited; waiting {wait_min} minutes before next attempt."
            )
            skipped_counter.labels(thero=self.thero_id, reason="periodic_limit").inc()
            return None
        # Proceed with processing; after successful sync, RateLimiter will record success.

        # Robust check: Only skip if we have a valid completion record
        if self.s3.file_exists(f"{vid_id}.json"):
            try:
                metadata = self.s3.get_json(f"{vid_id}.json")

                # If it's a match, verify it's complete
                if metadata.get("title_match") is True:
                    is_friendly = metadata.get("ai_response", {}).get(
                        "podcast_friendly", True
                    )
                    # If it's podcast friendly, it MUST have an audio URL to be considered "synced"
                    if is_friendly and not metadata.get("s3_audio_url"):
                        print(
                            f"[{self.thero_name}] Found incomplete sync for {vid_id}. Retrying..."
                        )
                    else:
                        print(f"[{self.thero_name}] Skipping {vid_id}: Already exists.")
                        skipped_counter.labels(
                            thero=self.thero_id, reason="already_exists"
                        ).inc()
                        return None

                # If it's a mismatch, verify it STILL mismatches
                elif metadata.get("title_match") is False:
                    # We only have the title from the flat sync list
                    # If the title alone matches now, we re-process (it might stay 'ignored' if desc doesn't help)
                    if title and is_thero_in_content(title, "", self.config):
                        print(
                            f"[{self.thero_name}] Previously ignored {vid_id} might match now. Re-checking."
                        )
                    else:
                        return None
            except Exception as e:
                print(
                    f"[{self.thero_name}] Error checking existing metadata for {vid_id}: {e}. Retrying."
                )

        # Check daily limit via RateLimiter
        if not self.rate_limiter.can_sync_daily():
            print(
                f"[{self.thero_name}] Skipping {vid_id}: Daily sync limit reached ({self.rate_limiter.max_per_day})."
            )
            skipped_counter.labels(thero=self.thero_id, reason="daily_limit").inc()
            return None

        try:
            result = self.download_and_process(item["url"])
        except Exception as e:
            print(
                f"[{self.thero_name}] Error during download_and_process for {vid_id}: {e}"
            )
            failure_counter.labels(thero=self.thero_id).inc()
            return None
        if result == "ignored":
            skipped_counter.labels(thero=self.thero_id, reason="title_mismatch").inc()
            return None
        if result:
            # Record successful sync via RateLimiter (updates counters and persists state)
            self.rate_limiter.record_success()
            success_counter.labels(thero=self.thero_id).inc()
            print(f"[{self.thero_name}] Successfully synced {vid_id}.")
            return result
        # If result is None and not ignored, treat as failure
        failure_counter.labels(thero=self.thero_id).inc()
        return None

    def sync(self):
        sync_run_counter.labels(thero=self.thero_id).inc()
        print(f"[{self.thero_name}] Starting sync...")
        urls = self.config.get("youtube_channel_urls", []) or [
            self.config.get("youtube_channel_url")
        ]
        video_items = []

        with yt_dlp.YoutubeDL(
            {
                "extract_flat": True,
                "quiet": True,
                "no_warnings": True,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "ios", "web_embedded"],
                        "js_runtime": "node",
                    }
                },
            }
        ) as ydl:
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
                                    "title": entry.get("title"),
                                }
                            )
                except Exception as e:
                    print(f"[{self.thero_name}] Error fetching channel: {e}")

        # Process videos sequentially
        for item in video_items:
            # Periodic sync limit check via RateLimiter
            can_sync, wait_min = self.rate_limiter.can_sync_periodic()
            if not can_sync:
                print(
                    f"[{self.thero_name}] Sync limited; waiting {wait_min} minutes before next attempt."
                )
                break
            if self.ai_rate_limited:
                break
            self.process_video_task(item)

        if self.ai_rate_limited:
            print(f"[{self.thero_name}] Sync partially halted due to AI Rate Limiting.")

        # Refresh RSS
        print(f"[{self.thero_name}] Refreshing RSS feed...")
        metadata_keys = self.s3.list_metadata_files()
        print(f"[{self.thero_name}] Found {len(metadata_keys)} metadata files in S3.")

        items = []
        for key in metadata_keys:
            res = self.s3.get_json(key)
            if res:
                items.append(res)

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
            and item.get("title_match", True) is not False
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
