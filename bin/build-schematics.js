const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function init() {
  try {
     const schematicsDir = path.join(process.cwd(), 'schematics');
      if (!fs.existsSync(schematicsDir))
        throw Error('Schematics directory does not exist.');

      console.log('Linking schematics...');
      execSync('npm link schematics', { stdio: 'inherit' });

      console.log('Installing and building schematics...');
      process.chdir(schematicsDir);
      execSync('npm install && npm run build', { stdio: 'inherit' });

      process.chdir('..');
      console.log('Testing schematics...');
      execSync('npx schematics .:schematics --name=decaf', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error building schematics:', error);
  }
}

init();
