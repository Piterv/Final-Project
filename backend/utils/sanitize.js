
function sanitizeInput(value) {

  // Reject anything that isn't a string

  if (typeof value !== "string") {
    return "";
  }

  return value

    // 1. Remove <script> blocks (XSS attack)
 
    .replace(/<script.*?>.*?<\/script>/gis, "")

    // 2. Remove onclick="...", onmouseover="...", etc.

    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")

    // 3. Remove "javascript:"

    .replace(/javascript:/gi, "")

    // 4. HTML-encode display as text
    
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // 5. Remove leading/trailing whitespace
    
    .trim();
}

//imported in routes/tasks.js
module.exports = { sanitizeInput };
