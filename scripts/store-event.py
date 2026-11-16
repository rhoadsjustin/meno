#!/usr/bin/env python3
"""
Art for the Advent In-App Event on the App Store (docs/11 §3.3).

    python3 scripts/store-event.py   # -> store/events/advent-{card,details}.png

Specs (developer.apple.com/app-store/in-app-events, read 2026-11-15): the event
card image is 16:9, 1920x1080 to 3840x2160; the event details page image is
9:16, 1080x1920 to 2160x3840; .jpg or .png. Apple asks for no text, logos,
borders or overlay gradients in the media: it crops the image and lays the
badge, event name and its own gradient over the lower part. So the picture has
no words. It is the night of Luke 2:8: a field, a lapis sky, and one star,
which sits in the upper half, clear of where the title goes.

Colours follow docs/07-design-system.md: lapis and vellum only, and no gold.
The stars are placed from a fixed seed, so a rebuild gives the same image.
"""
import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "store", "events")

# src/theme/palette.ts, plus two darker steps of lapis for the night.
NIGHT = (9, 20, 58)
LAPIS_DEEP = (19, 42, 110)
LAPIS = (34, 68, 170)
VELLUM = (251, 250, 247)
HILL_FAR = (13, 28, 78)
HILL_NEAR = (7, 15, 44)


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def sky(w, h):
    """Night at the top, lapis toward the horizon."""
    col = Image.new("RGB", (1, h))
    px = col.load()
    for y in range(h):
        t = y / (h - 1)
        px[0, y] = mix(NIGHT, LAPIS_DEEP, t / 0.55) if t < 0.55 else mix(LAPIS_DEEP, LAPIS, (t - 0.55) / 0.45)
    return col.resize((w, h))


def glow(size, radius, strength):
    """A soft round light on black, for adding onto the sky."""
    w, h = size
    layer = Image.new("L", size, 0)
    d = ImageDraw.Draw(layer)
    cx, cy = w // 2, h // 2
    d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=round(255 * strength))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.6))


def star_shape(d, cx, cy, long, short, waist):
    """A four-pointed star: long vertical ray, shorter horizontal one."""
    pts = [
        (cx, cy - long), (cx + waist, cy - waist), (cx + short, cy), (cx + waist, cy + waist),
        (cx, cy + long * 1.25), (cx - waist, cy + waist), (cx - short, cy), (cx - waist, cy - waist),
    ]
    d.polygon(pts, fill=255)


def hills(w, h, base, amp, seed, colour, img):
    """A rolling ridge filled down to the bottom edge."""
    rng = random.Random(seed)
    waves = [(rng.uniform(0.6, 1.6), rng.uniform(0, math.tau), rng.uniform(0.35, 1.0)) for _ in range(4)]
    total = sum(a for _, _, a in waves)
    pts = [(0, h)]
    for x in range(0, w + 8, 8):
        u = x / w
        y = sum(a * math.sin(math.tau * f * u + p) for f, p, a in waves) / total
        pts.append((x, base + y * amp))
    pts.append((w, h))
    ImageDraw.Draw(img).polygon(pts, fill=colour)


def render(w, h, star_at):
    """`star_at` is the star's centre as fractions of the width and height."""
    unit = min(w, h)
    img = sky(w, h)

    # Small stars, denser toward the top, none near the horizon.
    rng = random.Random(2)
    field = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(field)
    for _ in range(round(w * h / 9000)):
        x, y = rng.uniform(0, w), h * 0.62 * rng.random() ** 1.5
        r = unit * rng.choice((0.0009, 0.0012, 0.0012, 0.0017, 0.0024))
        d.ellipse((x - r, y - r, x + r, y + r), fill=round(255 * rng.uniform(0.25, 0.9)))
    field = ImageChops.lighter(field, field.filter(ImageFilter.GaussianBlur(unit * 0.002)))
    img = Image.composite(Image.new("RGB", (w, h), VELLUM), img, field)

    # The star: a wide halo, a tight one, then the shape itself.
    cx, cy = round(w * star_at[0]), round(h * star_at[1])
    light = Image.new("L", (w, h), 0)
    for radius, strength in ((unit * 0.42, 0.20), (unit * 0.16, 0.34), (unit * 0.05, 0.75)):
        g = glow((w, h), round(radius), strength)
        light = ImageChops.add(light, ImageChops.offset(g, cx - w // 2, cy - h // 2))
    shape = Image.new("L", (w, h), 0)
    star_shape(ImageDraw.Draw(shape), cx, cy, unit * 0.105, unit * 0.058, unit * 0.0085)
    light = ImageChops.add(light, shape.filter(ImageFilter.GaussianBlur(unit * 0.0012)))
    img = Image.composite(Image.new("RGB", (w, h), VELLUM), img, light)

    # The field: two ridges, the nearer one darker.
    hills(w, h, h * 0.80, h * 0.035, 5, HILL_FAR, img)
    hills(w, h, h * 0.89, h * 0.03, 11, HILL_NEAR, img)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, size, star_at in (
        ("advent-card", (3840, 2160), (0.5, 0.33)),
        ("advent-details", (2160, 3840), (0.5, 0.30)),
    ):
        img = render(*size, star_at)
        img.save(os.path.join(OUT, f"{name}.png"))
        print(f"wrote store/events/{name}.png  {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
