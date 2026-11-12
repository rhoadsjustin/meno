#!/usr/bin/env python3
"""
Compose the iPhone Duo App Store screenshots from plain simulator captures.

    python3 scripts/seed-screenshots.py --udid <Duo UDID>   # demo data
    # ...capture raw screens into store/screenshots/raw/duo/ (see FRAMES for names)
    python3 scripts/store-shots-duo.py                     # -> store/screenshots/duo/NN-*.png
    python3 scripts/asc_screenshots.py --slot duo --replace

Apple takes both Duo panels in one set (APP_IPHONE_DUO, at most 10):
- inner display, opened flat: the UI is landscape, 951 x 669 pt, so a full-scale capture
  is 2853 x 2007 px, which is also the store size. These frames show the whole screen
  under a one-line headline, because the two-pane layouts are the point.
- cover display, closed: 466 x 678 pt -> 1398 x 2034 px portrait, framed like the 6.9 set
  (two-line headline, phone running off the bottom edge).

Captures of the inner panel come out of the simulator turned 90 degrees; this script
turns any portrait capture of an inner frame back to landscape, so raw files can be
saved straight from the simulator. Same look as scripts/store-shots.py (whose helpers it
loads), so the two sets read as one product page.
"""
import importlib.util
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("store_shots", os.path.join(HERE, "store-shots.py"))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

ROOT = os.path.join(HERE, "..")
RAW = os.path.join(ROOT, "store", "screenshots", "raw", "duo")
OUT = os.path.join(ROOT, "store", "screenshots", "duo")

INNER = (2853, 2007)  # APP_IPHONE_DUO, inner display, landscape
COVER = (1398, 2034)  # APP_IPHONE_DUO, cover display, portrait

# (output name, raw capture, panel, theme, headline, subhead). Order = product-page order.
FRAMES = [
    ("01-today", "inner-today.png", "inner", "vellum",
     "Made for iPhone Duo.",
     "Open it, and today's verse and your progress sit side by side."),
    ("02-reader", "inner-reader.png", "inner", "lapis",
     "Read it like a book.",
     "Fold it halfway for facing pages; nothing lands on the crease."),
    ("03-practice", "inner-practice.png", "inner", "vellum",
     "The whole ladder in view.",
     "Practice on one side, where the passage stands on the other."),
    ("04-library", "inner-library.png", "inner", "lapis",
     "Learning and memorized, side by side.",
     "Two shelves: what you're climbing, and what you keep."),
    ("05-progress", "inner-stats.png", "inner", "vellum",
     "Faithful, day by day.",
     "Streaks, reviews, and badges at a glance."),
    ("06-cover", "cover-today.png", "cover", "lapis",
     "Just as good\nclosed.",
     "Every screen fits the cover display,\nfor a verse on the go."),
    ("07-cover-practice", "cover-practice.png", "cover", "vellum",
     "Practice\nanywhere.",
     "Six ways to practice, from reading\nto reciting aloud."),
]


def headline(img, theme, title, sub, top, title_size, sub_size):
    """Centered serif headline and sans subhead; returns the y just below them."""
    d = ImageDraw.Draw(img)
    title_color, sub_color = (base.INK, base.INK_FAINT) if theme == "vellum" else (base.WHITE, "#C9D3F2")
    tf = base.font(base.SERIF, title_size, "Semibold")
    sf = base.font(base.SANS, sub_size, "Regular")
    w = img.width
    y = top
    for line in title.split("\n"):
        d.text(((w - d.textlength(line, font=tf)) / 2, y), line, font=tf, fill=title_color)
        y += round(title_size * 1.19)
    y += round(sub_size * 0.5)
    for line in sub.split("\n"):
        d.text(((w - d.textlength(line, font=sf)) / 2, y), line, font=sf, fill=sub_color)
        y += round(sub_size * 1.36)
    return y


def device(img, shot, y, theme, inner_w, radius, bezel):
    """The capture in a black bezel, centered at y."""
    shot = shot.resize((inner_w, round(shot.height * inner_w / shot.width)), Image.LANCZOS)
    body = Image.new("RGB", (inner_w + bezel * 2, shot.height + bezel * 2), "#0B0C10")
    screen = base.rounded(shot, radius)
    body.paste(screen, (bezel, bezel), screen)
    body = base.rounded(body, radius + bezel)
    x = (img.width - body.width) // 2
    sh, pad = base.shadow(body.size, radius + bezel, 40, 0.28 if theme == "vellum" else 0.45)
    img.paste(sh, (x - pad, y + 30 - pad), sh)
    img.paste(body, (x, y), body)


def background(theme, size):
    top, bottom = (base.VELLUM, base.LAPIS_WASH) if theme == "vellum" else (base.LAPIS, base.LAPIS_DEEP)
    grad = Image.linear_gradient("L").resize(size)
    return Image.composite(Image.new("RGB", size, bottom), Image.new("RGB", size, top), grad).convert("RGBA")


def inner_frame(shot, theme, title, sub):
    if shot.height > shot.width:  # straight from the simulator: turn the landscape UI upright
        shot = shot.rotate(-90, expand=True)  # clockwise, like `sips -r 90`
    img = background(theme, INNER)
    below = headline(img, theme, title, sub, top=120, title_size=112, sub_size=50)
    bezel, margin = 24, 70
    y = below + 60
    # as large as the space below the headline allows, keeping the whole screen in view
    screen_h = INNER[1] - margin - y - bezel * 2
    inner_w = min(round(screen_h * shot.width / shot.height), round(INNER[0] * 0.82))
    device(img, shot, y, theme, inner_w, radius=72, bezel=bezel)
    return img


def cover_frame(shot, theme, title, sub):
    img = background(theme, COVER)
    below = headline(img, theme, title, sub, top=150, title_size=118, sub_size=48)
    device(img, shot, below + 70, theme, round(COVER[0] * 0.80), radius=96, bezel=22)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    made, skipped = [], []
    for name, raw, panel, theme, title, sub in FRAMES:
        path = os.path.join(RAW, raw)
        if not os.path.isfile(path):
            skipped.append(f"{name} (needs raw/duo/{raw})")
            continue
        shot = Image.open(path).convert("RGB")
        img = (inner_frame if panel == "inner" else cover_frame)(shot, theme, title, sub)
        expected = INNER if panel == "inner" else COVER
        assert img.size == expected, (name, img.size)
        out = os.path.join(OUT, f"{name}.png")
        img.convert("RGB").save(out, optimize=True)
        made.append(out)
    for p in made:
        print(f"  wrote {os.path.relpath(p, ROOT)}")
    for s in skipped:
        print(f"  skipped {s}")
    if not made:
        sys.exit("nothing written")


if __name__ == "__main__":
    main()
