#!/bin/bash
# Creates simple placeholder icons using Python PIL
python3 << 'PYTHON'
from PIL import Image, ImageDraw

def create_icon(size, filename):
    # Create image with indigo background
    img = Image.new('RGB', (size, size), color='#4F46E5')
    draw = ImageDraw.Draw(img)
    
    # Add a simple lightning bolt shape (simplified)
    # For a real icon, use the SVG or a proper design tool
    points = [
        (size*0.55, size*0.2),
        (size*0.35, size*0.55),
        (size*0.45, size*0.55),
        (size*0.42, size*0.8),
        (size*0.62, size*0.45),
        (size*0.52, size*0.45)
    ]
    draw.polygon(points, fill='white')
    
    img.save(filename)
    print(f"Created {filename}")

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
PYTHON
