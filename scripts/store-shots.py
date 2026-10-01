#!/usr/bin/env python3
"""
Compose the App Store marketing screenshots from the plain simulator captures.

    python3 scripts/seed-screenshots.py     # demo data on the screenshot sim
    # ...capture raw screens into store/screenshots/raw/ (see FRAMES for names)
    python3 scripts/store-shots.py          # -> store/screenshots/6.9/NN-*.png
    python3 scripts/asc_screenshots.py --replace

Each frame is a headline in New York over a "Lapis & vellum" background with the
capture set in a phone frame that runs off the bottom edge. The widget frame uses
the real widget captures from assets/images/onboarding instead of a phone. Frames
whose raw capture is missing are skipped with a note, so the set can be rebuilt
while one capture (e.g. the Recite to Unlock shield, which only renders on a real
iPhone) is still outstanding.

Colors follow docs/07-design-system.md: gold is reserved for the Memorized state,
so it never appears here as decoration.
"""
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "store", "screenshots", "raw")
OUT = os.path.join(ROOT, "store", "screenshots", "6.9")
ONBOARDING = os.path.join(ROOT, "assets", "images", "onboarding")

W, H = 1320, 2868  # APP_IPHONE_67

# src/theme/palette.ts
VELLUM = "#FBFAF7"
LAPIS_WASH = "#E9EEFA"
LAPIS = "#2244AA"
LAPIS_DEEP = "#132A6E"
INK = "#1A1D26"
INK_FAINT = "#6E7280"
WHITE = "#FFFFFF"

SERIF = "/System/Library/Fonts/NewYork.ttf"
SANS = "/System/Library/Fonts/SFNS.ttf"

# Zoomed "feature cards" for screens whose content sits in the top third of the phone,
# where a full phone would be mostly empty: (raw capture, crop box as fractions of the
# capture, card width in px, small-caps label).
CARDS = {
    "dissolve": [
        ("today.png", (0.07, 0.21, 0.93, 0.40), 1160, "FIRST LETTERS"),
        ("blanks.png", (0.03, 0.155, 0.97, 0.47), 1160, "FILL IN THE BLANKS"),
    ],
    "checked": [
        ("speak.png", (0.33, 0.625, 0.67, 0.775), 720, "RECITE ALOUD"),
        ("graded.png", (0.03, 0.135, 0.97, 0.335), 1160, "SEE WHAT SLIPPED"),
    ],
}

# (output name, raw capture or CARDS key, theme, headline, subhead). Order = product-page order.
FRAMES = [
    ("01-today", "today.png", "vellum",
     "Let the Word\nremain in you.",
     "Memorize Scripture a few minutes a day —\nand keep it for good."),
    ("02-dissolve", "dissolve", "lapis",
     "Watch it fade\nas it takes root.",
     "Words disappear from the screen\nas they settle into memory."),
    ("03-practice", "arrange.png", "vellum",
     "Six ways\nto practice.",
     "Read, first letters, blanks, arrange,\ntype, and recite aloud."),
    ("04-unlock", "recite-to-unlock.png", "lapis",
     "Recite before\nyou scroll.",
     "Open distracting apps with a verse.\nThe override always works."),
    ("05-widgets", None, "vellum",
     "Keep it in\nfront of you.",
     "Home and Lock Screen widgets that\ndissolve as you learn."),
    ("06-checked", "checked", "lapis",
     "Checked word\nby word.",
     "Speak or type from memory. Meno shows\nexactly what slipped — on your device."),
    ("07-progress", "stats.png", "vellum",
     "Faithful,\nday by day.",
     "Streaks, spaced reviews, and badges\nkeep every verse fresh."),
]


def font(path, size, weight):
    f = ImageFont.truetype(path, size)
    f.set_variation_by_name(weight)
    return f


def background(theme):
    """A soft vertical gradient; lapis frames deepen toward the bottom."""
    top, bottom = (VELLUM, LAPIS_WASH) if theme == "vellum" else (LAPIS, LAPIS_DEEP)
    grad = Image.linear_gradient("L").resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), bottom), Image.new("RGB", (W, H), top), grad)


def headline(img, theme, title, sub, top=190):
    """Centered serif headline and sans subhead; returns the y just below them."""
    d = ImageDraw.Draw(img)
    title_color, sub_color = (INK, INK_FAINT) if theme == "vellum" else (WHITE, "#C9D3F2")
    tf = font(SERIF, 124, "Semibold")
    sf = font(SANS, 50, "Regular")
    y = top
    for line in title.split("\n"):
        w = d.textlength(line, font=tf)
        d.text(((W - w) / 2, y), line, font=tf, fill=title_color)
        y += 148
    y += 26
    for line in sub.split("\n"):
        w = d.textlength(line, font=sf)
        d.text(((W - w) / 2, y), line, font=sf, fill=sub_color)
        y += 68
    return y


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(ImageChops.multiply(out.getchannel("A"), mask))
    return out


def shadow(size, radius, blur, opacity):
    """A blurred rounded-rect shadow layer, padded so the blur isn't clipped."""
    pad = blur * 3
    layer = Image.new("RGBA", (size[0] + pad * 2, size[1] + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        (pad, pad, pad + size[0], pad + size[1]), radius, fill=(10, 15, 40, int(255 * opacity))
    )
    return layer.filter(ImageFilter.GaussianBlur(blur)), pad


# Captures from a physical iPhone (the shield can't render in the simulator) carry a
# real status bar; it's swapped for the simulator's pinned 9:41 / full-battery one.
DEVICE_CAPTURES = {"recite-to-unlock.png"}


def clean_status_bar(shot):
    """Paint over the status bar, then redraw the time and icons lifted from a simulator
    capture: their darkness becomes the alpha of white glyphs, so they read on any
    dark background."""
    ref = Image.open(os.path.join(RAW, "today.png")).convert("L")
    k = shot.width / ref.width
    bg = shot.getpixel((20, 20))
    ImageDraw.Draw(shot).rectangle((0, 0, shot.width, round(170 * k)), fill=bg)
    for box in ((170, 55, 330, 140), (920, 60, 1215, 135)):  # time, then signal/wifi/battery
        glyphs = ref.crop(box)
        glyphs = glyphs.resize((round(glyphs.width * k), round(glyphs.height * k)), Image.LANCZOS)
        # the sim background is vellum (~250), not white: treat anything that light as empty
        alpha = glyphs.point(lambda v: 0 if v > 235 else min(255, (235 - v) * 255 // 200))
        shot.paste(Image.new("RGB", glyphs.size, WHITE), (round(box[0] * k), round(box[1] * k)), alpha)
    return shot


def phone(img, capture, y, theme):
    """The capture in a black bezel, 80% of the canvas wide, bleeding off the bottom."""
    shot = Image.open(capture).convert("RGB")
    if os.path.basename(capture) in DEVICE_CAPTURES:
        shot = clean_status_bar(shot)
    inner_w = int(W * 0.80)
    shot = shot.resize((inner_w, round(shot.height * inner_w / shot.width)), Image.LANCZOS)
    bezel = 22
    body = Image.new("RGB", (inner_w + bezel * 2, shot.height + bezel * 2), "#0B0C10")
    body.paste(rounded(shot, 104), (bezel, bezel), rounded(shot, 104))
    body = rounded(body, 126)
    x = (W - body.width) // 2
    sh, pad = shadow(body.size, 126, 40, 0.28 if theme == "vellum" else 0.45)
    img.paste(sh, (x - pad, y + 30 - pad), sh)
    img.paste(body, (x, y), body)


def cards(img, specs, top, theme):
    """Crops of the capture, enlarged into floating cards with a label above each,
    centered as a stack in the space below the headline."""
    label_color = INK_FAINT if theme == "vellum" else "#C9D3F2"
    lf = font(SANS, 38, "Semibold")
    d = ImageDraw.Draw(img)
    built = []
    for raw, (x0, y0, x1, y1), width, label in specs:
        shot = Image.open(os.path.join(RAW, raw)).convert("RGB")
        box = (round(x0 * shot.width), round(y0 * shot.height), round(x1 * shot.width), round(y1 * shot.height))
        crop = shot.crop(box)
        inner = width - 2 * 56
        crop = crop.resize((inner, round(crop.height * inner / crop.width)), Image.LANCZOS)
        card = Image.new("RGB", (width, crop.height + 2 * 56), crop.getpixel((2, 2)))
        card.paste(crop, (56, 56))
        built.append((rounded(card, 56), label))
    label_h, gap = 76, 110
    total = sum(label_h + c.height for c, _ in built) + gap * (len(built) - 1)
    y = top + max(0, (H - 60 - top - total) // 2)
    for card, label in built:
        tw = d.textlength(label, font=lf)
        d.text(((W - tw) / 2, y), label, font=lf, fill=label_color)
        y += label_h
        x = (W - card.width) // 2
        sh, pad = shadow(card.size, 56, 36, 0.28 if theme == "vellum" else 0.45)
        img.paste(sh, (x - pad, y + 24 - pad), sh)
        img.paste(card, (x, y), card)
        y += card.height + gap


def widgets(img, y):
    """The real widget captures, stacked and tilted slightly like cards on a table."""
    home = Image.open(os.path.join(ONBOARDING, "widget-home-light.png")).convert("RGBA")
    lock = Image.open(os.path.join(ONBOARDING, "lock-screen.png")).convert("RGBA")
    cards = [(lock, 1120, 2.5, 0), (home, 1120, -2.5, 760)]
    # center the pair in the space below the headline (home card height ~ lock's)
    stack = 760 + round(lock.height * 1120 / lock.width)
    y += max(0, (H - 60 - y - stack) // 2)
    for card, width, angle, dy in cards:
        card = card.resize((width, round(card.height * width / card.width)), Image.LANCZOS)
        card = rounded(card, 64)
        sh, pad = shadow(card.size, 64, 34, 0.30)
        layer = Image.new("RGBA", (card.width + pad * 2, card.height + pad * 2), (0, 0, 0, 0))
        layer.paste(sh, (0, 24), sh)
        layer.paste(card, (pad, pad), card)
        layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
        img.paste(layer, ((W - layer.width) // 2, y + dy), layer)


def main():
    os.makedirs(OUT, exist_ok=True)
    made, skipped = [], []
    for name, raw, theme, title, sub in FRAMES:
        needs = [c[0] for c in CARDS[raw]] if raw in CARDS else [raw] if raw else []
        missing = [n for n in needs if not os.path.isfile(os.path.join(RAW, n))]
        if missing:
            skipped.append(f"{name} (needs raw/{', raw/'.join(missing)})")
            continue
        img = background(theme).convert("RGBA")
        below = headline(img, theme, title, sub)
        if raw in CARDS:
            cards(img, CARDS[raw], below + 60, theme)
        elif raw:
            phone(img, os.path.join(RAW, raw), below + 70, theme)
        else:
            widgets(img, below + 60)
        path = os.path.join(OUT, f"{name}.png")
        img.convert("RGB").save(path, optimize=True)
        made.append(path)
    for p in made:
        print(f"  wrote {os.path.relpath(p, ROOT)}")
    for s in skipped:
        print(f"  skipped {s}")
    if not made:
        sys.exit("nothing written")


if __name__ == "__main__":
    main()
