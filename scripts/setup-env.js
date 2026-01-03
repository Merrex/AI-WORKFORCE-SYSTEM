#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.join(__dirname, '..');
const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function setupEnv() {
  console.log('🚀 Setting up environment configuration...\n');

  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Skipping setup.');
    console.log('   Delete .env file if you want to regenerate it.\n');
    return;
  }

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example file not found!');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envExamplePath, 'utf8');

  // Generate secure secrets
  const jwtSecret = generateSecret(32);
  const sessionSecret = generateSecret(32);

  envContent = envContent
    .replace('your-secret-key-change-this-in-production', jwtSecret)
    .replace('your-session-secret-change-this', sessionSecret);

  fs.writeFileSync(envPath, envContent);

  console.log('✅ .env file created successfully!');
  console.log('✅ JWT and session secrets generated\n');
  console.log('📝 Next steps:');
  console.log('   1. Edit .env file and add your LLM API keys (OpenAI, Anthropic, etc.)');
  console.log('   2. Configure database connection string');
  console.log('   3. Update other settings as needed\n');
  console.log('⚠️  Important: Keep your .env file secure and never commit it to version control!\n');
}

setupEnv();
