import datetime


class RateLimiter:
    """Encapsulates sync‑rate‑limiting logic.

    It stores a small JSON state in the configured S3 bucket (via the provided
    ``S3Manager``) and offers helper methods to decide whether a sync attempt
    should be performed and to update the persisted counters.
    """

    def __init__(self, s3_manager, state_file: str, max_videos_per_day: int = 999):
        self.s3 = s3_manager
        self.state_file = state_file
        self.max_per_day = max_videos_per_day
        # Load persisted state or initialise defaults
        self.state = self.s3.load_state(self.state_file)
        self.state.setdefault("videos_synced_today", 0)
        self.state.setdefault("last_sync_time", None)
        self.state.setdefault("last_sync_date", "")

        # Daily Reset Logic (UTC)
        today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        if self.state.get("last_sync_date") != today:
            self.state["videos_synced_today"] = 0
            self.state["last_sync_date"] = today

    # ---------------------------------------------------------------------
    # Periodic (time‑based) sync check
    # ---------------------------------------------------------------------
    def _period_seconds(self) -> float:
        """Calculate the minimum interval between two syncs based on the daily
        allowance.
        """
        if not self.max_per_day:
            return float("inf")
        return 24 * 3600 / self.max_per_day

    def can_sync_periodic(self):
        """Return ``(True, 0)`` if enough time has elapsed since the last
        successful sync, otherwise ``(False, minutes_remaining)``.
        """
        last_iso = self.state.get("last_sync_time")
        if not last_iso:
            return True, 0
        last_time = datetime.datetime.fromisoformat(last_iso)
        if last_time.tzinfo is None:
            last_time = last_time.astimezone(datetime.timezone.utc)
        elapsed = (
            datetime.datetime.now(datetime.timezone.utc) - last_time
        ).total_seconds()
        period = self._period_seconds()
        if elapsed >= period:
            return True, 0
        wait_min = int((period - elapsed) / 60) + 1
        return False, wait_min

    # ---------------------------------------------------------------------
    # Daily‑quota check
    # ---------------------------------------------------------------------
    def can_sync_daily(self) -> bool:
        """True if the daily video quota has not been exhausted."""
        return self.state["videos_synced_today"] < self.max_per_day

    # ---------------------------------------------------------------------
    # State mutation helpers
    # ---------------------------------------------------------------------
    def record_success(self):
        """Increment the daily counter and update the ``last_sync_time``.
        The updated state is persisted to S3.
        """
        self.state["videos_synced_today"] += 1
        self.state["last_sync_time"] = datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()
        self.s3.save_state(self.state_file, self.state)

    def reset_daily_counter(self):
        """Reset the daily counter – useful when the script is started on a new
        day.  This method does **not** write to S3; callers can decide when to
        persist.
        """
        self.state["videos_synced_today"] = 0
