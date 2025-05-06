const fs = require('fs-extra');
const path = require('path');

async function copyBuildFiles() {
  try {
    const buildDir = path.join(__dirname, 'build');
    const rootDir = __dirname;

    console.log('Copying build files from:', buildDir);
    console.log('To root directory:', rootDir);

    // Ensure build directory exists
    if (!fs.existsSync(buildDir)) {
      console.error('Build directory not found:', buildDir);
      process.exit(1);
    }

    // Copy all files from build to root
    await fs.copy(buildDir, rootDir, {
      overwrite: true,
      errorOnExist: false
    });

    console.log('Build files copied successfully');
  } catch (err) {
    console.error('Error copying build files:', err);
    process.exit(1);
  }
}

copyBuildFiles(); 