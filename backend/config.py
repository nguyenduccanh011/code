import os
from typing import List, Optional


def _split_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [x.strip() for x in value.split(',') if x.strip()]


# CORS allowed origins (comma-separated). Example: http://localhost:5173,http://127.0.0.1:5173
ALLOWED_ORIGINS: List[str] = _split_csv(os.getenv('ALLOWED_ORIGINS'))

# Basic rate limit per minute for hot endpoints (integer). Default 60.
RATE_LIMIT_PER_MINUTE: int = int(os.getenv('RATE_LIMIT_PER_MINUTE', '60'))

# Proxy/network defaults
REQUEST_TIMEOUT_SECONDS: int = int(os.getenv('REQUEST_TIMEOUT_SECONDS', '15'))

# Optional: list of allowed proxy hostnames (comma-separated). If empty, use built-in fixed hosts.
PROXY_HOST_ALLOWLIST: List[str] = _split_csv(os.getenv('PROXY_HOST_ALLOWLIST'))

