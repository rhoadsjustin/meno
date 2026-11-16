#!/usr/bin/env python3
"""
Cover image for the Facebook Page (docs/11 §4.1).

    python3 scripts/social-cover.py   # -> store/social/facebook-cover.png

1640x924 (16:9). Facebook shows a cover at about 820x312 on desktop, which
crops the top and bottom, and about 640x360 on phones, which crops the sides.
Everything that must be read sits in the middle 1280x560, inside both crops,
and clear of the profile picture that overlaps the lower left on desktop.
`--guides` also writes facebook-cover-guides.png with the two crops drawn in.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "store", "social")
W, H = 1640, 924
# src/theme/palette.ts ("Lapis & vellum")
VELLUM = (251, 250, 247)
LAPIS_WASH = (233, 238, 250)
LAPIS = (34, 68, 170)
INK = (26, 29, 38)
INK_FAINT = (110, 114, 128)


def font(path, size, axes=None):
    f = ImageFont.truetype(path, size)
    if axes:
        try:
            f.set_variation_by_axes(axes)
        except Exception:
            pass
    return f


def serif(size, weight):
    return font("/System/Library/Fonts/NewYork.ttf", size, [min(size, 256), weight, 0])


def centered(draw, y, text, f, fill):
    """Draw `text` centred on the canvas with its top at `y`; returns its bottom."""
    left, top, right, bottom = draw.textbbox((0, 0), text, font=f)
    draw.text(((W - (right - left)) / 2 - left, y - top), text, font=f, fill=fill)
    return y + (bottom - top)


def cover():
    img = Image.new("RGB", (W, H), VELLUM)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        row = tuple(round(a + (b - a) * t) for a, b in zip(VELLUM, LAPIS_WASH))
        for x in range(W):
            px[x, y] = row
    draw = ImageDraw.Draw(img)
    sans = font("/System/Library/Fonts/SFNS.ttf", 36)
    y = 232
    y = centered(draw, y, "μένω", serif(170, 500), LAPIS)
    y = centered(draw, y + 64, "Let the Word remain in you.", serif(88, 600), INK)
    centered(draw, y + 46, "Scripture memory for iPhone  ·  meno-scripture.org", sans, INK_FAINT)
    return img


def guides(img):
    g = img.copy()
    d = ImageDraw.Draw(g)
    dh = round(W * 312 / 820)  # desktop: full width, this tall
    d.rectangle((0, (H - dh) // 2, W - 1, (H + dh) // 2), outline=(200, 40, 40), width=4)
    mw = round(H * 640 / 360)  # phone: full height, this wide (wider than the canvas -> full)
    if mw < W:
        d.rectangle(((W - mw) // 2, 0, (W + mw) // 2, H - 1), outline=(40, 140, 60), width=4)
    d.rectangle(((W - 1280) // 2, (H - 560) // 2, (W + 1280) // 2, (H + 560) // 2),
                outline=(40, 90, 200), width=2)
    return g


def main():
    os.makedirs(OUT, exist_ok=True)
    img = cover()
    img.save(os.path.join(OUT, "facebook-cover.png"))
    print("wrote store/social/facebook-cover.png")
    if "--guides" in sys.argv:
        guides(img).save(os.path.join(OUT, "facebook-cover-guides.png"))


if __name__ == "__main__":
    main()
