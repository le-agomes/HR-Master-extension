// Store the last extracted element for replacement
let lastExtractedElement = null;
let lastExtractionMethod = null;

(() => {
  try {
    let text = "";
    let source = "unknown";

    // Site-specific extractors for popular job boards
    const extractors = {
      // LinkedIn Jobs
      linkedin: () => {
        if (!window.location.hostname.includes('linkedin.com')) return null;

        const selectors = [
          '.jobs-description__content',
          '.job-details',
          '[class*="job-description"]',
          '.description__text'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            return { text: element.innerText.trim(), source: 'LinkedIn', element };
          }
        }
        return null;
      },

      // Indeed
      indeed: () => {
        if (!window.location.hostname.includes('indeed.com')) return null;

        const selectors = [
          '#jobDescriptionText',
          '.jobsearch-jobDescriptionText',
          '[class*="jobDescriptionText"]',
          '.jobsearch-JobComponent-description'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            return { text: element.innerText.trim(), source: 'Indeed', element };
          }
        }
        return null;
      },

      // Glassdoor
      glassdoor: () => {
        if (!window.location.hostname.includes('glassdoor.com')) return null;

        const selectors = [
          '[class*="JobDetails_jobDescription"]',
          '.desc',
          '[class*="jobDescriptionContent"]'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            return { text: element.innerText.trim(), source: 'Glassdoor', element };
          }
        }
        return null;
      },

      // Greenhouse (used by many companies)
      greenhouse: () => {
        if (!window.location.hostname.includes('greenhouse.io') &&
            !document.querySelector('[class*="greenhouse"]')) return null;

        const selectors = [
          '#content',
          '.application-details',
          '[class*="job-post"]'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            return { text: element.innerText.trim(), source: 'Greenhouse', element };
          }
        }
        return null;
      },

      // Lever (used by many startups)
      lever: () => {
        if (!window.location.hostname.includes('lever.co')) return null;

        const selectors = [
          '.posting-description',
          '[class*="posting-description"]',
          '.content'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            return { text: element.innerText.trim(), source: 'Lever', element };
          }
        }
        return null;
      },

      // Workday
      workday: () => {
        if (!window.location.hostname.includes('myworkdayjobs.com')) return null;

        const selectors = [
          '[data-automation-id="jobPostingDescription"]',
          '.job-description',
          '[class*="jobDescription"]'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.trim().length > 100) {
            return { text: element.innerText.trim(), source: 'Workday', element };
          }
        }
        return null;
      },

      // Generic heuristic-based detection
      generic: () => {
        // Look for common job description indicators
        const commonSelectors = [
          '[class*="job-description"]',
          '[class*="jobDescription"]',
          '[class*="job_description"]',
          '[id*="job-description"]',
          '[id*="jobDescription"]',
          '[class*="description"]',
          'article',
          'main'
        ];

        // Try each selector
        for (const selector of commonSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.innerText.trim();
            // Job descriptions are typically at least 200 characters
            if (text.length > 200) {
              // Check for common job description keywords
              const hasJobKeywords = /\b(responsibilities|requirements|qualifications|experience|skills|benefits|about (the role|this position|you)|what (you'll do|we're looking for))\b/i.test(text);
              if (hasJobKeywords) {
                return { text, source: 'Auto-detected', element };
              }
            }
          }
        }
        return null;
      }
    };

    // Try extractors in order
    const result =
      extractors.linkedin() ||
      extractors.indeed() ||
      extractors.glassdoor() ||
      extractors.greenhouse() ||
      extractors.lever() ||
      extractors.workday() ||
      extractors.generic();

    if (result) {
      text = result.text;
      source = result.source;
      lastExtractedElement = result.element;
      lastExtractionMethod = 'site-specific';
    }

    // Fallback 1: Check for focused input or textarea
    if (!text) {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        text = el.value;
        source = 'Input field';
        lastExtractedElement = el;
        lastExtractionMethod = 'input-field';
      }
    }

    // Fallback 2: Check for highlighted text
    if (!text && window.getSelection()) {
      const selection = window.getSelection().toString();
      if (selection.trim().length > 0) {
        text = selection;
        source = 'Selected text';
        lastExtractedElement = window.getSelection().getRangeAt(0).commonAncestorContainer;
        lastExtractionMethod = 'selection';
      }
    }

    if (text && text.trim().length > 0) {
      chrome.runtime.sendMessage({
        type: 'JD_TEXT_FOUND',
        text: text.trim(),
        source: source
      });
    } else {
      chrome.runtime.sendMessage({
        type: 'JD_TEXT_ERROR',
        error: "No job description found on this page. Try selecting the text manually or clicking inside a text field."
      });
    }
  } catch (err) {
    console.error('Content script error:', err);
    chrome.runtime.sendMessage({
      type: 'JD_TEXT_ERROR',
      error: "An error occurred while accessing the page content."
    });
  }
})();

// Listen for replacement requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REPLACE_TEXT' && message.cleanedText) {
    try {
      if (!lastExtractedElement) {
        sendResponse({ success: false, error: 'No element to replace' });
        return;
      }

      const cleanedText = message.cleanedText;

      // Handle different element types
      if (lastExtractionMethod === 'input-field') {
        // For input/textarea elements
        if (lastExtractedElement.tagName === 'INPUT' || lastExtractedElement.tagName === 'TEXTAREA') {
          lastExtractedElement.value = cleanedText;

          // Trigger input event for frameworks that listen to it
          lastExtractedElement.dispatchEvent(new Event('input', { bubbles: true }));
          lastExtractedElement.dispatchEvent(new Event('change', { bubbles: true }));

          sendResponse({ success: true, method: 'input-field' });
        }
      } else if (lastExtractionMethod === 'selection') {
        // For selected text - replace in the DOM
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(cleanedText));
          sendResponse({ success: true, method: 'selection' });
        }
      } else if (lastExtractionMethod === 'site-specific') {
        // For site-specific elements - replace innerText
        if (lastExtractedElement && lastExtractedElement.nodeType === Node.ELEMENT_NODE) {
          // Check if element is contenteditable
          if (lastExtractedElement.isContentEditable) {
            lastExtractedElement.innerText = cleanedText;
            lastExtractedElement.dispatchEvent(new Event('input', { bubbles: true }));
            sendResponse({ success: true, method: 'contenteditable' });
          } else {
            // For read-only elements, just replace the text
            lastExtractedElement.innerText = cleanedText;
            sendResponse({ success: true, method: 'site-specific', warning: 'Element may be read-only' });
          }
        }
      }
    } catch (err) {
      console.error('Replacement error:', err);
      sendResponse({ success: false, error: err.message });
    }
  }
  return true; // Keep the message channel open for async response
});