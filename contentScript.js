(() => {
  try {
    const el = document.activeElement;
    let text = "";

    // Check for Input or Textarea
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      text = el.value;
    } 
    // Fallback to highlighted selection if no input is focused or empty
    else if (window.getSelection()) {
      text = window.getSelection().toString();
    }

    if (text && text.trim().length > 0) {
      chrome.runtime.sendMessage({ type: 'JD_TEXT_FOUND', text: text });
    } else {
      chrome.runtime.sendMessage({ 
        type: 'JD_TEXT_ERROR', 
        error: "No text found. Please click inside a text field or highlight the Job Description text." 
      });
    }
  } catch (err) {
    chrome.runtime.sendMessage({ 
      type: 'JD_TEXT_ERROR', 
      error: "An error occurred while accessing the page content." 
    });
  }
})();