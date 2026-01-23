import json
import os
from thefuzz import fuzz, process


def load_thero_data(file_path):
    """Loads Thero data from a JSON file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Thero data file not found: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def is_thero_in_title(video_title, thero_config):
    """
    Checks if the video title contains the expected Thero's name using fuzzy matching.
    Expects thero_config to have a 'matcher' key with 'sinhala_tokens' and 'english_tokens'.
    """
    matcher = thero_config.get("matcher", {})
    en_tokens = matcher.get("english_tokens", [])
    si_tokens = matcher.get("sinhala_tokens", [])

    if not en_tokens and not si_tokens:
        return True  # Default to True if no matcher is defined? Or False? Let's say True for now if not defined.

    # Check English Names
    en_matches = (
        [
            process.extractOne(token, [video_title], scorer=fuzz.partial_ratio)[1]
            for token in en_tokens
        ]
        if en_tokens
        else [100]
    )

    # Check Sinhala Names
    si_matches = (
        [
            process.extractOne(token, [video_title], scorer=fuzz.partial_ratio)[1]
            for token in si_tokens
        ]
        if si_tokens
        else [100]
    )

    # Success if ALL parts of either the English OR Sinhala name match well (>85)
    en_ok = all(s > 85 for s in en_matches) if en_tokens else False
    si_ok = all(s > 85 for s in si_matches) if si_tokens else False

    return en_ok or si_ok
