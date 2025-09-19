const fs = require('fs');
const path = require('path');

// Function to remove all Unicode characters except basic ASCII
function removeAllUnicode(text) {
  // Remove all characters that are not in the basic ASCII range (0-127)
  // This will remove all emojis, accented characters, and other Unicode symbols
  return text.replace(/[^\x00-\x7F]/g, '');
}

// Read the file
const filePath = path.join(__dirname, 'src', 'components', 'mazeration-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove all Unicode characters from the content
const cleanedContent = removeAllUnicode(content);

// Write back to file
fs.writeFileSync(filePath, cleanedContent, 'utf8');

console.log('All Unicode characters (including emojis and umlauts) removed from mazeration-form.tsx');
