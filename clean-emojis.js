const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/components/mazeration-form.tsx', 'utf8');

// Remove all Unicode characters (emojis and special characters)
const cleanedContent = content.replace(/[^\x00-\x7F]/g, '');

// Write back to file
fs.writeFileSync('src/components/mazeration-form.tsx', cleanedContent);

console.log('Emojis removed from mazeration-form.tsx');
