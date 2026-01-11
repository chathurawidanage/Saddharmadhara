import yt_dlp
import boto3
import os
import requests
import json
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
import email.utils
from datetime import datetime
import subprocess
import concurrent.futures

from botocore.exceptions import ClientError

load_dotenv()

# --- CONFIGURATION ---
S3_BUCKET = os.getenv("S3_BUCKET")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# Podcast Metadata
PODCAST_TITLE = os.getenv("PODCAST_TITLE")
PODCAST_DESCRIPTION = os.getenv("PODCAST_DESCRIPTION")
PODCAST_LINK = os.getenv("PODCAST_LINK")
PODCAST_AUTHOR = os.getenv("PODCAST_AUTHOR")
PODCAST_LANGUAGE = os.getenv("PODCAST_LANGUAGE")
PODCAST_CATEGORY = os.getenv("PODCAST_CATEGORY")
PODCAST_SUBCATEGORY = os.getenv("PODCAST_SUBCATEGORY")
PODCAST_IMAGE_URL = os.getenv("PODCAST_IMAGE_URL")
PODCAST_EXPLICIT = os.getenv("PODCAST_EXPLICIT")
PODCAST_EMAIL = os.getenv("PODCAST_EMAIL")
PODCAST_DESCRIPTION_TEMPLATE = os.getenv("PODCAST_DESCRIPTION_TEMPLATE")

required_podcast_vars = [
    ("PODCAST_TITLE", PODCAST_TITLE),
    ("PODCAST_DESCRIPTION", PODCAST_DESCRIPTION),
    ("PODCAST_LINK", PODCAST_LINK),
    ("PODCAST_AUTHOR", PODCAST_AUTHOR),
    ("PODCAST_LANGUAGE", PODCAST_LANGUAGE),
    ("PODCAST_CATEGORY", PODCAST_CATEGORY),
    ("PODCAST_SUBCATEGORY", PODCAST_SUBCATEGORY),
    ("PODCAST_IMAGE_URL", PODCAST_IMAGE_URL),
    ("PODCAST_EXPLICIT", PODCAST_EXPLICIT),
    ("PODCAST_EMAIL", PODCAST_EMAIL),
    ("PODCAST_DESCRIPTION_TEMPLATE", PODCAST_DESCRIPTION_TEMPLATE),
]

missing_vars = [name for name, value in required_podcast_vars if not value]
if missing_vars:
    print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
    exit(1)

if not S3_BUCKET:
    print("Error: S3_BUCKET not set in .env")
    exit(1)


if not S3_ENDPOINT_URL:
    print("Warning: S3_ENDPOINT_URL not set in .env")

# Initialize S3 client
s3_client = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)


def get_loudness_stats(input_file):
    """Run FFmpeg first pass to measure loudness stats."""
    safe_input = (
        f"./{input_file}"
        if not os.path.isabs(input_file) and not input_file.startswith("./")
        else input_file
    )
    cmd = [
        "ffmpeg",
        "-i",
        safe_input,
        "-af",
        "loudnorm=I=-19:TP=-1.5:LRA=11:print_format=json",
        "-f",
        "null",
        "-",
    ]
    # Run and capture output. FFmpeg writes JSON to stderr.
    result = subprocess.run(
        cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True
    )

    # Extract JSON from stderr
    output_lines = result.stderr.splitlines()
    json_lines = []
    capture = False
    for line in output_lines:
        if line.strip() == "{":
            capture = True
        if capture:
            json_lines.append(line)
        if line.strip() == "}":
            break

    if not json_lines:
        print(f"Warning: Could not extract loudness stats for {input_file}")
        return None

    try:
        return json.loads("".join(json_lines))
    except json.JSONDecodeError:
        print(f"Warning: Failed to parse loudness JSON for {input_file}")
        return None


def convert_audio_2pass(input_file, output_file):
    """Convert audio using measured loudness stats (2nd pass)."""
    stats = get_loudness_stats(input_file)

    # Base filter options
    loudnorm_filter = "loudnorm=I=-19:TP=-1.5:LRA=11"

    # If stats were successfully captured, switch to linear mode (2-pass)
    if stats:
        loudnorm_filter += (
            f":measured_I={stats['input_i']}"
            f":measured_LRA={stats['input_lra']}"
            f":measured_TP={stats['input_tp']}"
            f":measured_thresh={stats['input_thresh']}"
            f":offset={stats['target_offset']}"
            ":linear=true"
        )
    else:
        print("Fallback: Using single-pass dynamic normalization.")

    # Ensure file paths are safe for FFmpeg (handle filenames starting with -)
    safe_input = (
        f"./{input_file}"
        if not os.path.isabs(input_file) and not input_file.startswith("./")
        else input_file
    )
    safe_output = (
        f"./{output_file}"
        if not os.path.isabs(output_file) and not output_file.startswith("./")
        else output_file
    )

    cmd = [
        "ffmpeg",
        "-i",
        safe_input,
        "-ac",
        "1",  # Mono
        "-ar",
        "44100",  # 44.1kHz
        "-b:a",
        "64k",  # 64kbps (Recommended for Speech)
        "-af",
        loudnorm_filter,
        "-y",  # Overwrite
        safe_output,
    ]

    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def download_and_upload(video_url):
    # 1. Download Options
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "%(id)s_raw.%(ext)s",
        "quiet": True,
    }

    raw_filename = None
    final_filename = None
    metadata_filename = None
    title = "No Title"
    description = ""
    duration = 0
    file_size = 0
    pub_date = ""

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            video_id = info["id"]

            # yt-dlp prepare_filename might depend on merged format vs single format
            raw_filename = ydl.prepare_filename(info)

            final_filename = f"{video_id}.mp3"
            metadata_filename = f"{video_id}.json"
            title = info.get("title", "No Title")

            # Format Description from Template
            desc_template = PODCAST_DESCRIPTION_TEMPLATE
            # Handle literal \n text (common in .env) and assume standard newlines are already parsed
            desc_template = desc_template.replace(r"\n", "\n").replace(r"\\n", "\n")

            description = desc_template.format(title=title, original_url=video_url)
            upload_date_str = info.get("upload_date", "")
            duration = info.get("duration", 0)

            # Format PubDate (RFC 2822)
            if upload_date_str:
                try:
                    dt = datetime.strptime(upload_date_str, "%Y%m%d")
                    pub_date = email.utils.format_datetime(dt)
                except ValueError:
                    pub_date = email.utils.formatdate(usegmt=True)
            else:
                pub_date = email.utils.formatdate(usegmt=True)

            # Thumbnail extraction
            thumbnail_url = info.get("thumbnail")

        if raw_filename and os.path.exists(raw_filename):
            print(f"Processing audio: {raw_filename} -> {final_filename}")
            try:
                convert_audio_2pass(raw_filename, final_filename)
            except Exception as e:
                print(f"Error during ffmpeg conversion: {e}")
                return None

            # Get file size
            file_size = os.path.getsize(final_filename)

            # 2. Upload Audio to S3
            print(f"Uploading {final_filename} to S3...")
            s3_client.upload_file(
                final_filename,
                S3_BUCKET,
                final_filename,
                ExtraArgs={"ContentType": "audio/mpeg"},
            )

            # 3. Generate Public URL
            base_url = f"{S3_ENDPOINT_URL}/{S3_BUCKET}"
            s3_url = f"{base_url}/{final_filename}"

            # 3.5 Process Thumbnail
            s3_image_url = None
            image_filename = f"{video_id}.jpg"  # Assume jpg for simplicity or converted
            if thumbnail_url:
                try:
                    print(f"Downloading thumbnail from {thumbnail_url}...")
                    img_resp = requests.get(thumbnail_url, stream=True)
                    if img_resp.status_code == 200:
                        with open(image_filename, "wb") as f:
                            for chunk in img_resp.iter_content(1024):
                                f.write(chunk)

                        print(f"Uploading {image_filename} to S3...")
                        s3_client.upload_file(
                            image_filename,
                            S3_BUCKET,
                            image_filename,
                            ExtraArgs={"ContentType": "image/jpeg"},
                        )
                        s3_image_url = f"{base_url}/{image_filename}"
                    else:
                        print(
                            f"Failed to download thumbnail: Status {img_resp.status_code}"
                        )
                except Exception as e:
                    print(f"Error processing thumbnail: {e}")

            # 4. Upload Metadata to S3
            metadata = {
                "id": video_id,
                "title": title,
                "description": description,
                "original_url": video_url,
                "s3_audio_url": s3_url,
                "s3_image_url": s3_image_url,
                "upload_date": upload_date_str,
                "duration": duration,
                "pub_date": pub_date,
                "length_bytes": file_size,
            }

            print(f"Uploading {metadata_filename} to S3...")
            with open(metadata_filename, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            s3_client.upload_file(
                metadata_filename,
                S3_BUCKET,
                metadata_filename,
                ExtraArgs={"ContentType": "application/json"},
            )

            return {
                "id": video_id,
                "title": title,
                "url": s3_url,
                "image_url": s3_image_url,
                "description": description,
                "duration": duration,
                "length_bytes": file_size,
                "pub_date": pub_date,
            }
        else:
            print(f"Expected file {raw_filename} not found after download.")
            return None

    finally:
        # Clean up local files
        for fPath in [raw_filename, final_filename, metadata_filename]:
            if fPath and os.path.exists(fPath):
                try:
                    os.remove(fPath)
                except OSError:
                    pass

        # Cleanup image
        image_filename_cleanup = f"{video_id}.jpg" if "video_id" in locals() else None
        if image_filename_cleanup and os.path.exists(image_filename_cleanup):
            try:
                os.remove(image_filename_cleanup)
                print(f"Deleted local file: {image_filename_cleanup}")
            except OSError as e:
                print(f"Error removing {image_filename_cleanup}: {e}")


def format_duration(seconds):
    """Converts seconds to HH:MM:SS or MM:SS format."""
    if not seconds:
        return "00:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    else:
        return f"{m:02d}:{s:02d}"


def fetch_all_bucket_metadata():
    """Fetches all .json metadata files from S3 bucket."""
    print("Fetching all metadata files from S3...")

    paginator = s3_client.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=S3_BUCKET)

    json_keys = []
    for page in pages:
        if "Contents" in page:
            for obj in page["Contents"]:
                key = obj["Key"]
                if key.endswith(".json"):
                    json_keys.append(key)

    print(f"Found {len(json_keys)} metadata files. Downloading content...")

    items = []

    def fetch_one(key):
        try:
            resp = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
            content = resp["Body"].read().decode("utf-8")
            data = json.loads(content)

            # Map storage fields to RSS fields
            data["url"] = data.get("s3_audio_url")
            data["image_url"] = data.get("s3_image_url")
            return data
        except Exception as e:
            print(f"Error reading {key}: {e}")
            return None

    # Use parallel download for speed
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        results = executor.map(fetch_one, json_keys)

    for res in results:
        if res:
            items.append(res)

    # Sort items by pub_date descending (Newest first)
    def parse_date(item):
        date_str = item.get("pub_date", "")
        if not date_str:
            return datetime.min
        try:
            return email.utils.parsedate_to_datetime(date_str)
        except:
            return datetime.min

    items.sort(key=parse_date, reverse=True)
    return items


def generate_rss(items):
    """Generates podcast.xml from scratch using the provided list of items."""
    local_filename = "podcast.xml"

    # Register namespaces
    ET.register_namespace("itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd")

    # Create Root
    root = ET.Element("rss")
    root.set("version", "2.0")
    channel = ET.SubElement(root, "channel")
    tree = ET.ElementTree(root)

    # --- Channel Metadata (From .env) ---
    def update_tag(parent, tag, text=None, attrib=None):
        el = ET.SubElement(parent, tag)
        if text is not None:
            el.text = text
        if attrib:
            for k, v in attrib.items():
                el.set(k, v)
        return el

    # Standard Tags
    update_tag(channel, "title", PODCAST_TITLE)
    update_tag(channel, "description", PODCAST_DESCRIPTION)
    update_tag(channel, "link", PODCAST_LINK)
    update_tag(channel, "language", PODCAST_LANGUAGE)

    # iTunes Tags
    update_tag(
        channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}author", PODCAST_AUTHOR
    )
    update_tag(
        channel,
        "{http://www.itunes.com/dtds/podcast-1.0.dtd}explicit",
        PODCAST_EXPLICIT,
    )

    # iTunes Owner
    owner = ET.SubElement(channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}owner")
    ET.SubElement(
        owner, "{http://www.itunes.com/dtds/podcast-1.0.dtd}name"
    ).text = PODCAST_AUTHOR
    ET.SubElement(
        owner, "{http://www.itunes.com/dtds/podcast-1.0.dtd}email"
    ).text = PODCAST_EMAIL

    # iTunes Category
    category = ET.SubElement(
        channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}category"
    )
    category.set("text", PODCAST_CATEGORY)
    if PODCAST_SUBCATEGORY:
        ET.SubElement(
            category, "{http://www.itunes.com/dtds/podcast-1.0.dtd}category"
        ).set("text", PODCAST_SUBCATEGORY)

    # iTunes Image
    update_tag(
        channel,
        "{http://www.itunes.com/dtds/podcast-1.0.dtd}image",
        attrib={"href": PODCAST_IMAGE_URL},
    )

    # --- Items ---
    for item in items:
        # Check basic validity
        if not item.get("url"):
            continue

        rss_item = ET.Element("item")
        ET.SubElement(rss_item, "title").text = item.get("title", "No Title")

        # Description with HTML support (CDATA)
        # Convert newlines to HTML line breaks for the description
        raw_desc = item.get("description", "")
        if raw_desc:
            html_desc = raw_desc.replace("\n", "<br />")
            # We use tokens for CDATA post-processing
            cdata_desc = f"%%CDATA_START%%{html_desc}%%CDATA_END%%"
            ET.SubElement(rss_item, "description").text = cdata_desc
        else:
            ET.SubElement(rss_item, "description").text = ""

        enclosure = ET.SubElement(rss_item, "enclosure")
        enclosure.set("url", item["url"])
        enclosure.set("type", "audio/mpeg")
        enclosure.set("length", str(item.get("length_bytes", 0)))

        guid = ET.SubElement(rss_item, "guid")
        guid.text = item.get("id", item["url"])
        guid.set("isPermaLink", "false")

        # Spotify/iTunes Tags
        ET.SubElement(rss_item, "pubDate").text = item.get("pub_date", "")
        ET.SubElement(
            rss_item, "{http://www.itunes.com/dtds/podcast-1.0.dtd}duration"
        ).text = format_duration(item.get("duration", 0))
        ET.SubElement(
            rss_item, "{http://www.itunes.com/dtds/podcast-1.0.dtd}explicit"
        ).text = "no"

        # Item Image
        if item.get("image_url"):
            img = ET.SubElement(
                rss_item, "{http://www.itunes.com/dtds/podcast-1.0.dtd}image"
            )
            img.set("href", item["image_url"])

        channel.append(rss_item)

    # 4. Write and Upload (with CDATA post-processing)
    tree.write(local_filename, encoding="UTF-8", xml_declaration=True)

    # Post-process to restore CDATA
    try:
        with open(local_filename, "r", encoding="UTF-8") as f:
            xml_content = f.read()

        xml_content = xml_content.replace("%%CDATA_START%%", "<![CDATA[")
        xml_content = xml_content.replace("%%CDATA_END%%", "]]>")
        xml_content = xml_content.replace("&lt;br /&gt;", "<br />")

        # Write back
        with open(local_filename, "w", encoding="UTF-8") as f:
            f.write(xml_content)

    except Exception as e:
        print(f"Error post-processing XML for CDATA: {e}")

    try:
        s3_client.upload_file(
            local_filename,
            S3_BUCKET,
            local_filename,
            ExtraArgs={"ContentType": "application/xml"},
        )
        print("Podcast RSS updated and uploaded.")
    except Exception as e:
        print(f"Error uploading podcast.xml: {e}")
    finally:
        # Clean up local file
        if os.path.exists(local_filename):
            os.remove(local_filename)


# --- EXECUTION ---


def check_if_exists(video_id):
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=f"{video_id}.json")
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return False
        # For other errors, re-raise or logging
        print(f"Error checking if file exists: {e}")
        return False


def get_channel_videos_yt_dlp(channel_url):
    ydl_opts = {
        "extract_flat": True,
        "quiet": True,
        "ignoreerrors": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            print(f"DEBUG: Extracting info for {channel_url}")
            info = ydl.extract_info(channel_url, download=False)
            if "entries" in info:
                for entry in info["entries"]:
                    if entry and "id" in entry:
                        video_id = entry["id"]
                        # Filter out non-video entries (checking ID length > 11 as heuristic)
                        if len(video_id) > 11:
                            continue

                        video_url = entry.get("url")
                        if not video_url:
                            video_url = f"https://www.youtube.com/watch?v={video_id}"
                        yield {"id": video_id, "url": video_url}
            else:
                return
        except Exception as e:
            print(f"Error fetching channel videos: {e}")
            return


# --- TASKS ---


def process_video_task(video_item):
    """Task: Process a single video item (check, download, upload)."""
    video_id = video_item["id"]
    url = video_item["url"]

    if check_if_exists(video_id):
        print(f"Skipping {video_id} (already exists).")
        return None

    try:
        print(f"Processing {video_id}...")
        return download_and_upload(url)
    except Exception as e:
        print(f"Failed to process {url}: {e}")
        return None


def update_rss_feed_task():
    """Task: Update and upload the podcast RSS feed based on ALL bucket content."""
    print("Rebuilding RSS feed from full bucket history...")
    all_items = fetch_all_bucket_metadata()
    generate_rss(all_items)


# --- WORKFLOW ---


def run_sync_workflow():
    channel_url = os.getenv("YOUTUBE_CHANNEL_URL")
    if not channel_url:
        print("Error: YOUTUBE_CHANNEL_URL not set in .env")
        return

    # 1. Get items generator
    print(f"Fetching videos from {channel_url}...")
    video_items_gen = get_channel_videos_yt_dlp(channel_url)

    max_workers = os.cpu_count() or 4
    print(f"Starting parallel processing with {max_workers} workers...")

    processed_count = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []

        for item in video_items_gen:
            # Submit immediately.
            # process_video_task handles the check_if_exists logic internally.
            futures.append(executor.submit(process_video_task, item))

        # Monitor completion
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                if result:
                    processed_count += 1
            except Exception as exc:
                print(f"A task generated an exception: {exc}")

    print(f"Processing complete. {processed_count} new items processed.")

    # 3. Update Feed (Always Rebuild from S3 to Ensure Consistency)
    # Even if no new items, we might want to ensure RSS is fresh/consistent with Bucket state
    update_rss_feed_task()


if __name__ == "__main__":
    run_sync_workflow()
