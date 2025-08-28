import time
import tempfile
import unittest

from backend.cache_manager import CacheManager


class CacheManagerTests(unittest.TestCase):
    def test_set_get_roundtrip(self):
        with tempfile.TemporaryDirectory() as td:
            cm = CacheManager(cache_dir=td)
            cm.set('key', {'a': 1}, ttl=5)
            self.assertEqual(cm.get('key'), {'a': 1})

    def test_expiry(self):
        with tempfile.TemporaryDirectory() as td:
            cm = CacheManager(cache_dir=td)
            cm.set('soon', 'gone', ttl=1)
            self.assertEqual(cm.get('soon'), 'gone')
            time.sleep(1.2)
            self.assertIsNone(cm.get('soon'))

