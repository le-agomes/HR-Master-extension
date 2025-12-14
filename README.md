# JD Scorer - Job Description Analyzer Chrome Extension

A professional Chrome Extension that helps HR professionals and recruiters analyze job descriptions for readability and bias in real-time.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Features

- **Readability Analysis**: Uses Flesch-Kincaid Grade Level formula to assess job description complexity
- **Bias Detection**: Identifies potentially exclusionary or "bro-culture" language
- **One-Click Analysis**: Extract text from any input field or selected text on a webpage
- **Beautiful UI**: Modern, clean interface with TailwindCSS styling
- **Offline-First**: No API calls required - all analysis runs locally

## What It Analyzes

### Readability Metrics
- **Grade Level Score**: Calculated using Flesch-Kincaid formula
- **Word Count**: Total words in the job description
- **Reading Difficulty**: Categorized as Easy (5th Grade) to Academic (College)

### Bias Detection
Flags common exclusionary terms like:
- "ninja", "rockstar", "guru", "hacker", "wizard"
- "crushing it", "kill it", "dominate"
- "aggressive", "native english"
- And more...

## Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HR-Master-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### For Production

Download the latest release from the Chrome Web Store (coming soon).

## Usage

1. **Navigate to any webpage** with a job description
2. **Click inside a text field** containing the job description, or **highlight the text**
3. **Click the JD Scorer extension icon** in your Chrome toolbar
4. **Review the analysis**:
   - Readability score and grade level
   - Biased words detected
5. **Make improvements** to your job description based on the feedback

## Development

### Project Structure

```
HR-Master-extension/
├── src/
│   ├── App.tsx              # Main React application
│   ├── index.tsx            # React entry point
│   ├── types.ts             # TypeScript type definitions
│   └── utils/
│       └── analysis.ts      # Readability & bias analysis logic
├── public/
│   ├── manifest.json        # Chrome extension manifest
│   ├── background.js        # Service worker
│   ├── contentScript.js     # Content script for text extraction
│   └── icons/               # Extension icons
├── vite.config.ts           # Vite build configuration
└── package.json             # Dependencies and scripts
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **Chrome Extension Manifest V3** - Latest extension standard

## How It Works

1. **Content Script Injection**: When you click the extension, it injects a content script into the active tab
2. **Text Extraction**: Captures text from the focused input field or current text selection
3. **Local Analysis**: Processes the text using client-side algorithms:
   - Syllable counting for readability
   - Flesch-Kincaid formula calculation
   - Pattern matching for bias words
4. **Results Display**: Shows scores and recommendations in the popup UI

## Roadmap

- [ ] Add more bias categories (gender, age, disability)
- [ ] Export analysis results as PDF
- [ ] Chrome Web Store publication
- [ ] Job board integrations (LinkedIn, Indeed, etc.)
- [ ] Browser compatibility (Firefox, Edge)
- [ ] Historical tracking of analyzed JDs
- [ ] AI-powered improvement suggestions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for better, more inclusive hiring
