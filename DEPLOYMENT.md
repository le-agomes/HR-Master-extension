# JD Scorer - Deployment Guide

This guide explains how to build, test, and deploy the JD Scorer Chrome Extension.

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- Chrome browser (for testing)

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server** (optional, for testing React components):
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to see the popup UI in a browser

## Building for Production

1. **Build the extension:**
   ```bash
   npm run build
   ```

   This will:
   - Compile TypeScript files
   - Bundle React application with Vite
   - Process CSS with Tailwind
   - Copy static files (manifest, icons, content script)
   - Output everything to the `dist/` directory

2. **Verify build output:**
   ```bash
   ls -la dist/
   ```

   You should see:
   - `manifest.json` - Extension configuration
   - `index.html` - Popup HTML
   - `popup.js` - Bundled React application
   - `popup.css` - Compiled styles
   - `contentScript.js` - Content script for text extraction
   - `icons/` - Extension icons

## Loading the Extension in Chrome (Development/Testing)

1. **Open Chrome Extensions page:**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top right

3. **Load the extension:**
   - Click "Load unpacked"
   - Select the `dist` folder from this project
   - The extension should now appear in your extensions list

4. **Test the extension:**
   - Navigate to any webpage with a job description
   - Click inside a text field containing a JD, or highlight the text
   - Click the JD Scorer extension icon in your toolbar
   - Review the analysis results

## Updating the Extension

After making changes to the code:

1. Rebuild: `npm run build`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the JD Scorer extension card
4. Test your changes

## Publishing to Chrome Web Store

### 1. Prepare Icons (Important!)

The current icons are placeholders. Create professional icons before publishing:

```bash
cd public/icons
# See README.md in this directory for icon generation instructions
```

Required icon sizes: 16x16, 48x48, 128x128 pixels

### 2. Update Version

Edit `manifest.json` and increment the version number:
```json
{
  "version": "1.0.1"
}
```

Also update in `package.json`.

### 3. Create Production Build

```bash
npm run build
```

### 4. Create ZIP Archive

```bash
cd dist
zip -r ../jd-scorer-v1.0.0.zip .
cd ..
```

### 5. Chrome Web Store Submission

1. **Create Developer Account:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay one-time $5 registration fee

2. **Submit Extension:**
   - Click "New Item"
   - Upload `jd-scorer-v1.0.0.zip`
   - Fill in store listing details:
     - Name: JD Scorer
     - Description: (see README.md)
     - Category: Productivity
     - Language: English
   - Upload screenshots (1280x800 or 640x400)
   - Upload promotional images (if desired)
   - Set privacy practices
   - Submit for review

3. **Review Process:**
   - Typically takes 1-3 business days
   - May require revisions
   - You'll receive email notification

## Distribution Options

### Option 1: Chrome Web Store (Recommended)
- Official distribution channel
- Automatic updates for users
- Better discoverability
- Requires developer account ($5 one-time fee)

### Option 2: Manual Distribution
- Share the `.zip` file directly
- Users must enable Developer Mode
- No automatic updates
- Free but less user-friendly

### Option 3: Enterprise Deployment
- For internal company use
- Use Google Admin Console
- Can force-install for all users
- See [Chrome Enterprise documentation](https://support.google.com/chrome/a/answer/9296680)

## Testing Checklist

Before publishing, test these scenarios:

- [ ] Extension loads without errors
- [ ] Icon displays correctly in toolbar
- [ ] Popup opens and displays UI
- [ ] Text extraction works from input fields
- [ ] Text extraction works from textarea elements
- [ ] Text extraction works from highlighted text
- [ ] Analysis calculates readability score correctly
- [ ] Bias detection identifies problematic words
- [ ] Reset button works
- [ ] UI is responsive and displays properly
- [ ] No console errors
- [ ] Works on various websites (LinkedIn, Indeed, etc.)

## Troubleshooting

### Build fails with TypeScript errors
```bash
npm run type-check
```
Fix any type errors before building.

### Extension doesn't load
- Check `manifest.json` syntax
- Verify all file paths are correct
- Check Chrome DevTools console for errors

### Popup doesn't open
- Check Content Security Policy in manifest
- Verify `index.html` exists in dist/
- Check for JavaScript errors in popup DevTools

### Content script fails
- Verify `contentScript.js` is in dist/
- Check permissions in manifest.json
- Test on different websites

## Security Considerations

This extension:
- ✅ Runs analysis locally (no external API calls)
- ✅ Doesn't collect or transmit user data
- ✅ Uses minimal permissions (activeTab, scripting)
- ✅ No background scripts or persistent data
- ✅ No external dependencies loaded at runtime

## Performance

- Bundle size: ~205 KB (gzipped: ~64 KB)
- Load time: <100ms
- Analysis time: <50ms for typical job descriptions
- Memory usage: Minimal (popup closes after use)

## Support & Maintenance

- Report issues on GitHub
- Check README.md for feature roadmap
- Submit pull requests for improvements

## License

MIT License - see LICENSE file for details

---

**Ready to publish?** Make sure you've completed all items in the Testing Checklist!
