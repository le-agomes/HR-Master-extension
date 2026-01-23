#!/bin/bash
# Creates JD Scorer icons with AI badge
python3 << 'PYTHON'
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create image with gradient-like indigo background
    img = Image.new('RGB', (size, size), color='#4F46E5')
    draw = ImageDraw.Draw(img)

    # Add rounded corners by creating a mask
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    radius = int(size * 0.2)
    mask_draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)
    img.putalpha(mask)

    # Convert back to RGB for saving as PNG
    background = Image.new('RGB', (size, size), (79, 70, 229))
    background.paste(img, (0, 0), img)
    img = background
    draw = ImageDraw.Draw(img)

    # Add a yellow lightning bolt (more prominent)
    bolt_points = [
        (size*0.56, size*0.15),
        (size*0.33, size*0.56),
        (size*0.47, size*0.56),
        (size*0.42, size*0.85),
        (size*0.69, size*0.44),
        (size*0.53, size*0.44)
    ]
    draw.polygon(bolt_points, fill='#FCD34D', outline='#FBBF24')

    # Add green "AI" badge in top right corner (for sizes 48+)
    if size >= 48:
        badge_size = int(size * 0.25)
        badge_x = size - badge_size - int(size * 0.1)
        badge_y = int(size * 0.1)
        draw.ellipse(
            [(badge_x, badge_y), (badge_x + badge_size, badge_y + badge_size)],
            fill='#10B981'
        )

        # Try to add "AI" text if possible
        try:
            font_size = int(badge_size * 0.5)
            # Use default font
            font = ImageFont.load_default()
            text = "AI"
            # Get text size for centering
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            text_x = badge_x + (badge_size - text_width) // 2
            text_y = badge_y + (badge_size - text_height) // 2
            draw.text((text_x, text_y), text, fill='white', font=font)
        except:
            pass

    img.save(filename)
    print(f"Created {filename} ({size}x{size})")

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
print("✅ All icons created successfully!")
PYTHON
