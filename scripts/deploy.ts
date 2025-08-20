#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Deploying all MCP OAuth examples to Val Town...\n');

const examples = ['example1', 'example2'];

for (const example of examples) {
  console.log(`\n=== Deploying ${example} ===`);
  try {
    execSync(`npm run deploy:${example.replace('example', 'ex')}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to deploy ${example}:`, error);
    process.exit(1);
  }
}

console.log('\n🎉 All examples deployed successfully!');
console.log('\nNext steps:');
console.log('1. Update your .env file with the actual Val Town URLs');
console.log('2. Test the OAuth flow with an MCP client');
console.log('3. Check the testing guide in docs/testing-guide.md');