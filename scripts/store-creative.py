#!/usr/bin/env python3
"""
Compose the App Store creative assets (iOS 27+ product page header and search
results asset) from the brand pieces used by scripts/store-shots.py.

    python3 scripts/store-creative.py        # -> store/creative/*.png

One composition is rendered as a 16:9 master — the only image shape App Store
Connect accepts for *both* placements ("Use header asset in search results") —
and then center-cropped to the dedicated header (21:9) and search results (3:2)
sizes, so whichever Apple shows, the focal point survives. The focal content is
kept inside the intersection of the two crops; everything outside it is texture.

Specs (developer.apple.com/help/app-store-connect/reference/app-information/
creative-assets-specifications): no alpha channel; header 21:9 3840x1646 or
16:9 5244x2950 PNG; search results 3:2 1920x1280..3840x2560 or 16:9 5244x2950.

Colors follow docs/07-design-system.md: gold is reserved for the Memorized state,
so it never appears here as decoration. Scripture is quoted from the WEB
(public domain), as in the screenshots.
"""
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "store", "creative")

W, H = 5244, 2950  # 16:9 universal master

# src/theme/palette.ts
LAPIS = "#2244AA"
LAPIS_DEEP = "#132A6E"
WHITE = "#FFFFFF"
ON_LAPIS_FAINT = "#C9D3F2"

SERIF = "/System/Library/Fonts/NewYork.ttf"
SANS = "/System/Library/Fonts/SFNS.ttf"
MONO = "/System/Library/Fonts/SFNSMono.ttf"

# The verse the app is named for (μένω, menō — remain). WEB, John 15:4a.
VERSE = ["Remain in me,", "and I in you."]
FIRST_LETTERS = "R i m, a I i y."  # services/practice firstLetters() of the line above
REFERENCE = "JOHN 15:4"

# Background cipher: first letters of John 15:4–7 (WEB), the app's "first letters" mode.
CIPHER = (
    "R i m, a I i y. A t b c’t b f b i u i r i t v, s n c y, u y r i m. "
    "I a t v. Y a t b. H w r i m a I i h b m f, f a f m y c d n. "
    "I a m d n r i m, h i t o a a b a i w; a t g t, t t i t f, a t a b. "
    "I y r i m, a m w r i y, y w a w y d, a i w b d f y."
)


def font(path, size, weight):
    f = ImageFont.truetype(path, size)
    f.set_variation_by_name(weight)
    return f


def background():
    grad = Image.linear_gradient("L").resize((W, H))
    img = Image.composite(Image.new("RGB", (W, H), LAPIS_DEEP), Image.new("RGB", (W, H), LAPIS), grad)
    # Faint cipher rows across the whole canvas — texture that can be clipped freely.
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    mf = font(MONO, 118, "Regular")
    words = CIPHER.split(" ")
    step = 230
    y, i = -60, 0
    while y < H:
        # vary the start so rows don't line up
        row = " ".join(words[i % len(words):] + words[: i % len(words)])
        d.text((-((i * 137) % 900), y), row, font=mf, fill=(255, 255, 255, 13))
        y += step
        i += 3
    # Clear the cipher behind the focal text with a soft elliptical fade, so the
    # verse sits in calm space and the texture only lives toward the edges.
    mask = Image.new("L", (W // 8, H // 8), 255)
    md = ImageDraw.Draw(mask)
    md.ellipse((W // 8 * 0.12, H // 8 * 0.02, W // 8 * 0.88, H // 8 * 0.98), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(40)).resize((W, H), Image.BILINEAR)
    layer.putalpha(ImageChops.multiply(layer.getchannel("A"), mask))
    return Image.alpha_composite(img.convert("RGBA"), layer)


def centered(d, text, fnt, y, fill, tracking=0):
    if tracking:
        widths = [d.textlength(ch, font=fnt) for ch in text]
        total = sum(widths) + tracking * (len(text) - 1)
        x = (W - total) / 2
        for ch, w in zip(text, widths):
            d.text((x, y), ch, font=fnt, fill=fill)
            x += w + tracking
        return
    w = d.textlength(text, font=fnt)
    d.text(((W - w) / 2, y), text, font=fnt, fill=fill)


def compose():
    img = background()
    d = ImageDraw.Draw(img)
    vf = font(SERIF, 410, "Semibold")
    mf = font(MONO, 164, "Regular")
    rf = font(SANS, 90, "Semibold")
    # The dissolution ladder, stacked: full text → first letters → reference,
    # each fainter than the last. Total height ~1500, centered on the canvas.
    line_h, gap_mono, gap_ref = 470, 170, 120
    total = line_h * len(VERSE) + gap_mono + 164 + gap_ref + 90
    y = (H - total) // 2 - 20
    for line in VERSE:
        centered(d, line, vf, y, WHITE)
        y += line_h
    y += gap_mono
    centered(d, FIRST_LETTERS, mf, y, ON_LAPIS_FAINT + "B8")
    y += 164 + gap_ref
    centered(d, REFERENCE, rf, y, ON_LAPIS_FAINT + "99", tracking=16)
    return img.convert("RGB")


def crop_to(img, ratio, size):
    """Center-crop the master to `ratio` (w/h) and resize to `size`."""
    w, h = img.size
    if w / h > ratio:
        cw = round(h * ratio)
        box = ((w - cw) // 2, 0, (w - cw) // 2 + cw, h)
    else:
        ch = round(w / ratio)
        box = (0, (h - ch) // 2, w, (h - ch) // 2 + ch)
    return img.crop(box).resize(size, Image.LANCZOS)


def preview(master, header, search):
    """Contact sheet: the three outputs plus the safe zone (intersection of both
    crops) drawn on the master, for a quick check before uploading."""
    pw = 1800
    tiles = []
    safe = master.copy()
    sd = ImageDraw.Draw(safe)
    cw, ch = round(H * 3 / 2), round(W * 9 / 21)  # 3:2 keeps 4425 wide; 21:9 keeps 2247 tall
    sd.rectangle(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2), outline="#FFD166", width=12)
    for label, im in (("universal 16:9 5244×2950 (safe zone = survives both crops)", safe),
                      ("header 21:9 3840×1646", header), ("search results 3:2 3840×2560", search)):
        t = im.resize((pw, round(im.height * pw / im.width)), Image.LANCZOS)
        tiles.append((label, t))
    lf = font(SANS, 44, "Semibold")
    total_h = sum(t.height + 90 for _, t in tiles) + 40
    sheet = Image.new("RGB", (pw + 80, total_h), "#FBFAF7")
    d = ImageDraw.Draw(sheet)
    y = 40
    for label, t in tiles:
        d.text((40, y), label, font=lf, fill="#1A1D26")
        y += 70
        sheet.paste(t, (40, y))
        y += t.height + 20
    return sheet


def main():
    os.makedirs(OUT, exist_ok=True)
    master = compose()
    header = crop_to(master, 21 / 9, (3840, 1646))
    search = crop_to(master, 3 / 2, (3840, 2560))
    outputs = {
        "universal-16x9.png": master,
        "header-21x9.png": header,
        "search-3x2.png": search,
        "preview.png": preview(master, header, search),
    }
    for name, im in outputs.items():
        path = os.path.join(OUT, name)
        im.save(path, optimize=True)
        print(f"  wrote {os.path.relpath(path, ROOT)}  {im.size[0]}×{im.size[1]}  {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main()
