# Icon Assets

This directory should contain the following icon files:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## Generating Icons

You can use the `icon.svg` file as a base to generate the PNG files:

### Using online tools:
1. Open https://www.svg2png.com/
2. Upload `icon.svg`
3. Export at 16x16, 48x48, and 128x128 sizes

### Using Inkscape (command line):
```bash
inkscape icon.svg --export-filename=icon16.png -w 16 -h 16
inkscape icon.svg --export-filename=icon48.png -w 48 -h 48
inkscape icon.svg --export-filename=icon128.png -w 128 -h 128
```

### Using ImageMagick:
```bash
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

## Temporary Workaround

For development, you can create simple colored squares:

```bash
# Create solid indigo colored PNGs (requires ImageMagick)
convert -size 16x16 xc:"#4F46E5" icon16.png
convert -size 48x48 xc:"#4F46E5" icon48.png
convert -size 128x128 xc:"#4F46E5" icon128.png
```

Or manually create them in any image editor (GIMP, Photoshop, etc.)
