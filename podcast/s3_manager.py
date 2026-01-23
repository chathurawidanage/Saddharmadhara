import boto3
import json
import os
from botocore.exceptions import ClientError
from datetime import datetime


class S3Manager:
    def __init__(self, endpoint, bucket, access_key, secret_key):
        self.bucket = bucket
        self.endpoint = endpoint
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def file_exists(self, key):
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise

    def upload_file(self, local_path, key, content_type):
        self.client.upload_file(
            local_path,
            self.bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )

    def get_json(self, key):
        resp = self.client.get_object(Bucket=self.bucket, Key=key)
        return json.loads(resp["Body"].read().decode("utf-8"))

    def list_metadata_files(self):
        paginator = self.client.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=self.bucket)
        return [
            obj["Key"]
            for page in pages
            if "Contents" in page
            for obj in page["Contents"]
            if obj["Key"].endswith(".json") and obj["Key"] != "sync_state.json"
        ]

    def load_state(self, state_file):
        try:
            state = self.get_json(state_file)
        except ClientError:
            state = {"last_sync_date": "", "videos_synced_today": 0}

        today = datetime.now().strftime("%Y-%m-%d")
        if state.get("last_sync_date") != today:
            state = {"last_sync_date": today, "videos_synced_today": 0}
        return state

    def save_state(self, state_file, state):
        local_temp = f"temp_{state_file}"
        with open(local_temp, "w") as f:
            json.dump(state, f)
        self.upload_file(local_temp, state_file, "application/json")
        if os.path.exists(local_temp):
            os.remove(local_temp)
