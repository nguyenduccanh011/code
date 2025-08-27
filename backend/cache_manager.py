from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Optional


class CacheManager:
    """File-based JSON cache with expiration."""

    def __init__(self, cache_dir: Optional[str] = None) -> None:
        base = Path(__file__).resolve().parent
        self.cache_dir = base / (cache_dir or "cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        safe_key = key.replace("/", "_")
        return self.cache_dir / f"{safe_key}.json"

    def get(self, key: str) -> Optional[Any]:
        path = self._path(key)
        if not path.exists():
            return None
        try:
            with path.open("r", encoding="utf-8") as f:
                payload = json.load(f)
            if payload.get("expiry", 0) < time.time():
                return None
            return payload.get("value")
        except Exception:
            return None

    def set(self, key: str, value: Any, ttl: int = 86400) -> None:
        payload = {"expiry": time.time() + ttl, "value": value}
        path = self._path(key)
        with path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
