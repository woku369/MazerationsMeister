// 🚀 UPLOAD NEUER STATISCHER DATEIEN ZU GITHUB PAGES
// Dieses Script lädt tank-viewer-simple.html und static-qr-codes.html hoch

const fs = require('fs');
const path = require('path');

// GitHub Configuration
const GITHUB_CONFIG = {
  username: 'woku369',
  repository: 'MazerationsMeister',
  token: process.env.GITHUB_TOKEN || 'ghp_your_token_here',
  branch: 'pages-clean'
};

async function uploadFile(filePath, githubPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const encodedContent = Buffer.from(content).toString('base64');
  
  console.log(`📤 Uploading ${githubPath}...`);
  
  // Zuerst versuchen aktuelle SHA zu bekommen
  let sha = null;
  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}/contents/${githubPath}?ref=${GITHUB_CONFIG.branch}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_CONFIG.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      sha = data.sha;
      console.log(`📋 Found existing file, SHA: ${sha.substring(0, 8)}...`);
    }
  } catch (error) {
    console.log(`ℹ️ File ${githubPath} does not exist yet (will be created)`);
  }
  
  // Upload/Update file
  const uploadData = {
    message: `Upload ${githubPath} - Statisches QR-Code System`,
    content: encodedContent,
    branch: GITHUB_CONFIG.branch
  };
  
  if (sha) {
    uploadData.sha = sha;
  }
  
  const uploadResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}/contents/${githubPath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadData)
    }
  );
  
  if (uploadResponse.ok) {
    const result = await uploadResponse.json();
    console.log(`✅ Successfully uploaded: ${githubPath}`);
    console.log(`🔗 GitHub URL: ${result.content.html_url}`);
    console.log(`🌐 Pages URL: https://${GITHUB_CONFIG.username}.github.io/${GITHUB_CONFIG.repository}/${githubPath}`);
    return true;
  } else {
    const error = await uploadResponse.text();
    console.error(`❌ Upload failed for ${githubPath}:`, uploadResponse.status, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Uploading static QR system files to GitHub Pages...');
  
  const files = [
    {
      local: path.join(__dirname, '../public/tank-viewer-simple.html'),
      github: 'tank-viewer-simple.html'
    },
    {
      local: path.join(__dirname, '../public/static-qr-codes.html'),
      github: 'static-qr-codes.html'
    }
  ];
  
  for (const file of files) {
    if (fs.existsSync(file.local)) {
      await uploadFile(file.local, file.github);
    } else {
      console.warn(`⚠️ File not found: ${file.local}`);
    }
  }
  
  console.log('✅ Upload complete!');
  console.log('🔗 Test URLs:');
  console.log(`   tank-viewer-simple: https://${GITHUB_CONFIG.username}.github.io/${GITHUB_CONFIG.repository}/tank-viewer-simple.html?tankId=T%20341`);
  console.log(`   static-qr-codes: https://${GITHUB_CONFIG.username}.github.io/${GITHUB_CONFIG.repository}/static-qr-codes.html`);
}

main().catch(console.error);