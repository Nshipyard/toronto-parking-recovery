#!/usr/bin/env python3
"""Screenshots for the README: desktop 1440 and mobile 390, hero + map sections.

Usage: shots.py <base_url> <out_dir>
"""
import sys
from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]

def snap(pw, width, name):
    browser = pw.chromium.launch(args=["--disable-gpu", "--no-proxy-server"])
    ctx = browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto(base, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(4000)
    page.screenshot(path=f"{out}/{name}.png", full_page=False)
    page.locator("#explorer svg").first.scroll_into_view_if_needed()
    page.wait_for_timeout(3000)
    page.locator("#explorer svg").first.screenshot(path=f"{out}/{name}-map.png")
    page.locator("#results").scroll_into_view_if_needed()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{out}/{name}-results.png", full_page=False)
    browser.close()

with sync_playwright() as pw:
    snap(pw, 1440, "desktop")
    snap(pw, 390, "mobile")
print("done")
