#!/usr/bin/env python3
"""
Process the new KODAND logo PNG: remove the light gray/off-white background
and the faint blueprint schematic lines, keeping the dark forest-green
KODAND letters + their internal mechanical/gear details intact. Output a
transparent PNG with the same aspect ratio as the source.

Strategy:
- The KODAND letters are deep forest green (~#3D5C46) with darker shadows
  (~#24362B) and lighter highlights (~#4F7359).
- The background is light gray/off-white (~#EBECEB) with faint light-gray
  blueprint lines (~#CCCCCC).
- A pixel is "background" if it's:
    - very light (luminance > 160), OR
    - light-ish AND very desaturated (luminance > 110 AND saturation < 0.18)
- We apply a soft alpha channel + tiny Gaussian blur for anti-aliasing.
- We trim transparent margins to the content bounding box.
- We downscale to a reasonable web height (~240px) to keep the file small.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

SRC = "/home/z/my-project/upload/pasted_image_1788671231771.png"
DST = "/home/z/my-project/public/kodand-logo.png"

# Load the source image
src = Image.open(SRC).convert("RGBA")
src_w, src_h = src.size
print(f"Loaded: {SRC} ({src_w}x{src_h}, aspect {src_w/src_h:.3f})")

# Downscale to a reasonable size for a web logo (preserve aspect ratio).
# Source is 1654x338 — target height 240px → width ~1176px.
TARGET_HEIGHT = 240
aspect = src_w / src_h
target_w = int(TARGET_HEIGHT * aspect)
src_resized = src.resize((target_w, TARGET_HEIGHT), Image.LANCZOS)
print(f"Resized to: {target_w}x{TARGET_HEIGHT}")

arr = np.array(src_resized).astype(np.float32)  # shape: (H, W, 4) — RGBA
rgb = arr[:, :, :3]

# Compute luminance (Rec. 709). Light pixels (high luminance) are background.
luminance = (0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2])

# Detect low-saturation pixels (gray background, not the green letters).
mx = rgb.max(axis=2)
mn = rgb.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

# A pixel is "background" if:
#   - very light (luminance > 160), OR
#   - light-ish AND very desaturated (luminance > 110 AND saturation < 0.18)
# This catches the off-white background + faint light-gray blueprint lines,
# while preserving the dark green letter pixels + shadows + highlights.
bg_mask = (luminance > 160) | ((luminance > 110) & (sat < 0.18))

# Build alpha: 255 (opaque) for letter pixels, 0 (transparent) for background.
soft_alpha = np.where(bg_mask, 0.0, 255.0).astype(np.uint8)

# Convert to PIL image (single channel) and apply a tiny blur for anti-aliasing.
alpha_img = Image.fromarray(soft_alpha, mode="L")
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.6))

# Re-combine with the original RGB.
r, g, b, _ = src_resized.split()
final = Image.merge("RGBA", (r, g, b, alpha_img))

# Trim transparent margins to content bounding box.
bbox = final.getbbox()
if bbox:
    final = final.crop(bbox)
    print(f"Trimmed to content: {final.size[0]}x{final.size[1]} (aspect {final.size[0]/final.size[1]:.3f})")

Path(DST).parent.mkdir(parents=True, exist_ok=True)
final.save(DST, "PNG", optimize=True)
print(f"Saved: {DST} ({final.size[0]}x{final.size[1]})")

# Also save a preview composited on the new theme color #3e5b4b for visual check
preview_bg = Image.new("RGBA", (final.size[0] + 40, final.size[1] + 40), (62, 91, 75, 255))
preview_bg.paste(final, (20, 20), final)
preview_bg.save("/home/z/my-project/public/kodand-logo-preview.png", "PNG")
print("Preview saved to /home/z/my-project/public/kodand-logo-preview.png")
