# Contributing to JD Scorer

Thank you for your interest in contributing to JD Scorer! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/HR-Master-extension.git
   cd HR-Master-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

## Project Structure

```
HR-Master-extension/
├── src/
│   ├── App.tsx              # Main React component
│   ├── index.tsx            # React entry point
│   ├── index.css            # Tailwind CSS entry
│   ├── types.ts             # TypeScript definitions
│   └── utils/
│       └── analysis.ts      # Analysis logic (readability + bias)
├── public/
│   └── icons/               # Extension icons
├── contentScript.js         # Content script for text extraction
├── manifest.json            # Chrome extension manifest
├── vite.config.ts           # Build configuration
├── tailwind.config.js       # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update types as needed

3. **Test your changes:**
   ```bash
   npm run build
   # Load extension in Chrome and test
   ```

4. **Type check:**
   ```bash
   npm run type-check
   ```

## Code Style Guidelines

### TypeScript
- Use TypeScript strict mode
- Define proper types for all functions
- Avoid `any` types
- Use meaningful variable names

### React
- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Handle loading and error states

### CSS
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing (use Tailwind spacing scale)

## Adding New Features

### 1. New Analysis Metrics

To add a new analysis metric:

1. Update `AnalysisResult` type in `src/types.ts`:
   ```typescript
   export interface AnalysisResult {
     // ... existing fields
     newMetric: number;
   }
   ```

2. Implement analysis logic in `src/utils/analysis.ts`:
   ```typescript
   export const analyzeJD = (text: string): AnalysisResult => {
     // ... existing code
     const newMetric = calculateNewMetric(text);
     
     return {
       // ... existing fields
       newMetric
     };
   };
   ```

3. Display results in `src/App.tsx`:
   ```tsx
   <div className="bg-white rounded-2xl p-6">
     <h3>New Metric</h3>
     <p>{result.newMetric}</p>
   </div>
   ```

### 2. New Bias Categories

To add bias word categories:

1. Edit `src/utils/analysis.ts`:
   ```typescript
   const biasWords = [
     // ... existing words
     'new-word', 'another-word'
   ];
   ```

2. Consider grouping by category:
   ```typescript
   const biasCategories = {
     bro_culture: ['ninja', 'rockstar', 'guru'],
     gender: ['he', 'chairman', 'manpower'],
     age: ['young', 'energetic', 'digital native']
   };
   ```

## Testing

### Manual Testing Checklist

- [ ] Extension loads in Chrome
- [ ] Popup UI renders correctly
- [ ] Text extraction works from inputs
- [ ] Text extraction works from textareas
- [ ] Text extraction works from selection
- [ ] Analysis produces correct results
- [ ] Error handling works properly
- [ ] UI is responsive

### Testing on Real Job Boards

Test the extension on:
- LinkedIn job postings
- Indeed
- Glassdoor
- Company career pages

## Pull Request Process

1. **Update documentation** if needed
2. **Test thoroughly** in Chrome
3. **Create pull request** with clear description:
   - What does this PR do?
   - Why is this change needed?
   - How has it been tested?
   - Screenshots (for UI changes)

4. **Address review feedback**
5. **Squash commits** if requested

## Reporting Bugs

When reporting bugs, include:

- **Description:** Clear description of the issue
- **Steps to reproduce:** Numbered steps
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Screenshots:** If applicable
- **Environment:**
  - Chrome version
  - OS
  - Extension version

## Feature Requests

For feature requests:

- Check existing issues first
- Clearly describe the feature
- Explain the use case
- Consider implementation complexity

## Questions?

- Open an issue for questions
- Check existing documentation first
- Be respectful and constructive

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to JD Scorer!
