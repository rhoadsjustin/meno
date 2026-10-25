#!/usr/bin/env python3
"""
Build the website's image set (site/img/) from the app's existing visuals.

    python3 scripts/site-images.py

Sources (all already in the repo or produced by the store/promo pipelines):
  store/screenshots/raw/*.png      plain simulator captures (1320x2868, 9:41 status bar)
  promo/public/img/shield.png      the Recite to Unlock shield from a real iPhone, status bar cleaned
  assets/images/onboarding/*.png   real Home Screen / Lock Screen widget captures
  promo/out/stills/duo-440.png     iPhone Duo "reads like a book" still (promo/out is gitignored;
                                   the frame is skipped with a note when it is missing)
  store/creative/universal-16x9.png  the John 15:4 dissolution ladder -> Open Graph image
  assets/images/icon.png           app icon -> favicon + apple-touch-icon

Phones are exported as WebP at two widths (440 and 880 px) for srcset; the rest at
their native size. Outputs are committed, so this only needs re-running when a
capture changes.
"""
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "site", "img")
RAW = os.path.join(ROOT, "store", "screenshots", "raw")
ONBOARDING = os.path.join(ROOT, "assets", "images", "onboarding")

PHONE_W, PHONE_H = 1320, 2868  # every phone frame is normalised to this aspect
PHONE_WIDTHS = (440, 880)
QUALITY = 82

PHONES = {
    "today": os.path.join(RAW, "today.png"),
    "arrange": os.path.join(RAW, "arrange.png"),
    "blanks": os.path.join(RAW, "blanks.png"),
    "speak": os.path.join(RAW, "speak.png"),
    "graded": os.path.join(RAW, "graded.png"),
    "stats": os.path.join(RAW, "stats.png"),
    "shield": os.path.join(ROOT, "promo", "public", "img", "shield.png"),
}

WIDGETS = {
    "widget-lock": os.path.join(ONBOARDING, "lock-screen.png"),
    "widget-home-light": os.path.join(ONBOARDING, "widget-home-light.png"),
    "widget-home-dark": os.path.join(ONBOARDING, "widget-home-dark.png"),
}


def cover(img, w, h):
    """Scale and centre-crop to exactly w x h (like CSS object-fit: cover)."""
    scale = max(w / img.width, h / img.height)
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def save_webp(img, name, **kw):
    path = os.path.join(OUT, name)
    img.convert("RGB").save(path, "WEBP", quality=QUALITY, method=6, **kw)
    print(f"  {name:28s} {img.width}x{img.height}  {os.path.getsize(path) // 1024} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    missing = []

    print("Phones")
    for name, src in PHONES.items():
        if not os.path.exists(src):
            missing.append(src)
            continue
        img = Image.open(src)
        for w in PHONE_WIDTHS:
            h = round(w * PHONE_H / PHONE_W)
            save_webp(cover(img, w, h), f"{name}-{w}.webp")

    print("Widgets")
    for name, src in WIDGETS.items():
        if not os.path.exists(src):
            missing.append(src)
            continue
        save_webp(Image.open(src), f"{name}.webp")

    print("iPhone Duo")
    duo = os.path.join(ROOT, "promo", "out", "stills", "duo-440.png")
    if os.path.exists(duo):
        img = Image.open(duo).crop((0, 380, 1080, 1300))  # the device with its lapis surround
        save_webp(img, "duo-reader.webp")
    else:
        missing.append(duo)

    print("Open Graph")
    creative = os.path.join(ROOT, "store", "creative", "universal-16x9.png")
    if os.path.exists(creative):
        og = cover(Image.open(creative), 1200, 630)
        path = os.path.join(OUT, "og.jpg")
        og.convert("RGB").save(path, "JPEG", quality=92, optimize=True, progressive=True)
        print(f"  og.jpg                       1200x630  {os.path.getsize(path) // 1024} KB")
    else:
        missing.append(creative)

    print("Icons")
    icon = Image.open(os.path.join(ROOT, "assets", "images", "icon.png")).convert("RGBA")
    for size in (32, 180):
        path = os.path.join(OUT, f"icon-{size}.png")
        icon.resize((size, size), Image.LANCZOS).save(path, "PNG", optimize=True)
        print(f"  icon-{size}.png{'':16s} {size}x{size}  {os.path.getsize(path) // 1024} KB")

    if missing:
        print("\nSkipped (source missing):")
        for m in missing:
            print("  " + os.path.relpath(m, ROOT))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
