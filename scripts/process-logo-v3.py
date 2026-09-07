#!/usr/bin/env python3
"""
Process the new KODAND logo PNG:
- Source is RGB with a dark-gray checkerboard pattern (transparency hint).
- Detect the checkerboard background and make it transparent, keeping the
  dark forest-green KODAND letters.
- Add a subtle light outline/glow around the letters so the logo is visible
  on a dark green background (the logo's letter color is similar to the page
  background, so without an outline it would be invisible).
- Output a transparent PNG optimized for web use.

Strategy:
- The checkerboard consists of dark gray squares (~#303030 and ~#3c3c3c).
- The KODAND letters are deep forest green (~#2D4A3E).
- We detect letter pixels via "greenness" (green channel higher than red/blue)
  OR very dark pixels (letter shadows).
- We create the alpha channel: 255 for letters, 0 for background.
- We ALSO generate a "glow" layer: a dilated (expanded) version of the letter
  mask, rendered in a light sage-green color, placed BEHIND the original
  letters. This creates a subtle halo that makes the dark logo visible on
  dark backgrounds.
- Final image = glow layer (light sage, blurred) + original letters on top.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
import numpy as np

SRC = "/home/z/my-project/upload/pasted_image_1788682576922.png"
DST = "/home/z/my-project/public/kodand-logo.png"

# Load the source image
src = Image.open(SRC).convert("RGBA")
src_w, src_h = src.size
print(f"Loaded: {SRC} ({src_w}x{src_h}, aspect {src_w/src_h:.3f})")

# The source is 1024x201 — keep at a reasonable web size.
# Target height 240px → width ~1224px (preserve aspect).
TARGET_HEIGHT = 240
aspect = src_w / src_h
target_w = int(TARGET_HEIGHT * aspect)
src_resized = src.resize((target_w, TARGET_HEIGHT), Image.LANCZOS)
print(f"Resized to: {target_w}x{TARGET_HEIGHT}")

arr = np.array(src_resized).astype(np.float32)
rgb = arr[:, :, :3]
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
mx = rgb.max(axis=2)
mn = rgb.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

# Greenness: green channel notably higher than red and blue
greenness = np.maximum(0, g - np.maximum(r, b) - 3)

# Letter pixels: noticeable green tint OR very dark (letter shadows)
is_letter = (greenness > 5) | (luminance < 35)

# Background = NOT letter
bg_mask = ~is_letter

# Build alpha: 255 for letters, 0 for background
alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
alpha_img = Image.fromarray(alpha, mode="L")
alpha_img_smooth = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.6))

# Create the letter-only image (transparent background)
r_ch, g_ch, b_ch, _ = src_resized.split()
letters_img = Image.merge("RGBA", (r_ch, g_ch, b_ch, alpha_img_smooth))

# === Create the glow/halo layer ===
# Dilate the alpha mask to create a slightly larger shape, then blur it
# heavily for a soft glow. Render in a light sage-green color so it's
# visible on dark backgrounds.
glow_color = (140, 170, 150, 180)  # light sage-green glow, semi-transparent

# Dilate: expand the letter mask by ~6px
dilated = alpha_img.filter(ImageFilter.MaxFilter(size=7))
# Blur for soft glow
glow_alpha = dilated.filter(ImageFilter.GaussianBlur(radius=4))
# Scale the glow alpha to make it subtle
glow_alpha_arr = np.array(glow_alpha, dtype=np.float32)
glow_alpha_arr = (glow_alpha_arr * 0.45).clip(0, 255).astype(np.uint8)
glow_alpha_final = Image.fromarray(glow_alpha_arr, mode="L")

# Create the glow layer: light sage-green color with the glow alpha
glow_layer = Image.new("RGBA", src_resized.size, glow_color)
glow_layer.putalpha(glow_alpha_final)

# === Composite: glow first (behind), then letters on top ===
final = Image.new("RGBA", src_resized.size, (0, 0, 0, 0))
final = Image.alpha_composite(final, glow_layer)
final = Image.alpha_composite(final, letters_img)

# Trim transparent margins to content bounding box
bbox = final.getbbox()
if bbox:
    # Add a small padding so the glow isn't cut off
    pad = 4
    bbox_padded = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(final.size[0], bbox[2] + pad),
        min(final.size[1], bbox[3] + pad),
    )
    final = final.crop(bbox_padded)
    print(f"Trimmed to content: {final.size[0]}x{final.size[1]} (aspect {final.size[0]/final.size[1]:.3f})")

Path(DST).parent.mkdir(parents=True, exist_ok=True)
final.save(DST, "PNG", optimize=True)
print(f"Saved: {DST} ({final.size[0]}x{final.size[1]})")

# Save a preview composited on the dark theme background #1A2D21
preview_bg = Image.new("RGBA", (final.size[0] + 40, final.size[1] + 40), (26, 45, 33, 255))
preview_bg.paste(final, (20, 20), final)
preview_bg.save("/home/z/my-project/public/kodand-logo-preview.png", "PNG")
print("Preview saved to /home/z/my-project/public/kodand-logo-preview.png")
