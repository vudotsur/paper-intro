"""
__main__.py - CLI entry point for tiktok_shop_pipeline.
"""

import sys
from .src.video_pipeline import main

if __name__ == "__main__":
    sys.exit(main())
