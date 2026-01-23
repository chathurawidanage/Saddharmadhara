import subprocess
import json
import os


class AudioProcessor:
    def __init__(self, thero_name):
        self.thero_name = thero_name

    def _get_loudness_stats(self, input_file):
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
        result = subprocess.run(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True
        )

        output = result.stderr
        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        if json_start != -1 and json_end != -1:
            try:
                return json.loads(output[json_start:json_end])
            except json.JSONDecodeError:
                pass
        return None

    def convert_to_mp3(self, input_file, output_file):
        stats = self._get_loudness_stats(input_file)
        loudnorm_filter = "loudnorm=I=-19:TP=-1.5:LRA=11"

        if stats:
            loudnorm_filter += (
                f":measured_I={stats['input_i']}:measured_LRA={stats['input_lra']}"
                f":measured_TP={stats['input_tp']}:measured_thresh={stats['input_thresh']}"
                f":offset={stats['target_offset']}:linear=true"
            )
        else:
            print(f"[{self.thero_name}] Warn: Using single-pass normalization.")

        safe_input = (
            f"./{input_file}"
            if not os.path.isabs(input_file) and not input_file.startswith("./")
            else input_file
        )
        cmd = [
            "ffmpeg",
            "-i",
            safe_input,
            "-ac",
            "1",
            "-ar",
            "44100",
            "-b:a",
            "64k",
            "-af",
            loudnorm_filter,
            "-y",
            output_file,
        ]
        subprocess.run(
            cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
        )
