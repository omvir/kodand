#!/usr/bin/env python3
"""
Process the new KODAND logo PNG:
- The source is RGB with a checkerboard pattern (alternating dark/light gray
  squares) that image editors use to indicate transparency.
- We detect the checkerboard background pixels and make them transparent,
  keeping the dark forest-green KODAND letters + their mechanical details.
- Output a transparent PNG optimized for web use.

Strategy:
- The checkerboard consists of two shades of dark gray (~#303030 and ~#3c3c3c).
- The KODAND letters are deep forest green (~#2F4F3E to #5C7D66).
- We compute a "background distance" metric: pixels close to the gray
  checkerboard (low saturation, mid luminance) are background; pixels with
  green tint (higher green channel than red/blue) are letters.
- We apply a soft alpha + tiny blur for anti-aliasing.
- We downscale to a reasonable web height (~240px) and trim transparent margins.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

SRC = "/home/z/my-project/upload/pasted_image_1788673857716.png"
DST = "/home/z/my-project/public/kodand-logo.png"

# Load the source image
src = Image.open(SRC).convert("RGBA")
src_w, src_h = src.size
print(f"Loaded: {SRC} ({src_w}x{src_h}, aspect {src_w/src_h:.3f})")

# Downscale to a reasonable size for a web logo (preserve aspect ratio).
# Source is 1024x252 — target height 240px → width ~974px.
TARGET_HEIGHT = 240
aspect = src_w / src_h
target_w = int(TARGET_HEIGHT * aspect)
src_resized = src.resize((target_w, TARGET_HEIGHT), Image.LANCZOS)
print(f"Resized to: {target_w}x{TARGET_HEIGHT}")

arr = np.array(src_resized).astype(np.float32)  # shape: (H, W, 4) — RGBA
rgb = arr[:, :, :3]
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

# Compute luminance and saturation
luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
mx = rgb.max(axis=2)
mn = rgb.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

# Detect "greenness" — pixels where green channel is meaningfully higher than
# red and blue (the KODAND letters are forest green). The checkerboard is
# neutral gray (r ≈ g ≈ b), so it has low greenness.
greenness = np.maximum(0, g - np.maximum(r, b) - 4)  # tolerance of 4

# A pixel is "letter" (keep) if it has noticeable green tint OR is very dark
# (the deep shadows inside the letters can be near-black with slight green).
# A pixel is "background" (transparent) if it's neutral gray (low saturation)
# AND mid-luminance (the checkerboard is ~#303030 to ~#3c3c3c).
is_neutral_gray = (sat < 0.10) & (luminance > 50) & (luminance < 110)
is_letter = (greenness > 6) | (luminance < 35)  # very dark pixels are letter shadows

# Background = NOT letter
bg_mask = ~is_letter
# But also catch the checkerboard even if some is dark: enforce neutral gray
bg_mask = bg_mask | is_neutral_gray

# Build alpha: 255 (opaque) for letter pixels, 0 (transparent) for background.
soft_alpha = np.where(bg_mask, 0.0, 255.0).astype(np.uint8)

# Convert to PIL image (single channel) and apply a tiny blur for anti-aliasing.
alpha_img = Image.fromarray(soft_alpha, mode="L")
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.6))

# Re-combine with the original RGB.
r_ch, g_ch, b_ch, _ = src_resized.split()
final = Image.merge("RGBA", (r_ch, g_ch, b_ch, alpha_img))

# Trim transparent margins to content bounding box.
bbox = final.getbbox()
if bbox:
    final = final.crop(bbox)
    print(f"Trimmed to content: {final.size[0]}x{final.size[1]} (aspect {final.size[0]/final.size[1]:.3f})")

Path(DST).parent.mkdir(parents=True, exist_ok=True)
final.save(DST, "PNG", optimize=True)
print(f"Saved: {DST} ({final.size[0]}x{final.size[1]})")

# Also save a preview composited on the theme color #3e5b4b for visual check
preview_bg = Image.new("RGBA", (final.size[0] + 40, final.size[1] + 40), (62, 91, 75, 255))
preview_bg.paste(final, (20, 20), final)
preview_bg.save("/home/z/my-project/public/kodand-logo-preview.png", "PNG")
print("Preview saved to /home/z/my-project/public/kodand-logo-preview.png")
