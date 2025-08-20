#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const example = process.argv[2];
if (!example) {
  console.error('Usage: npm run deploy:ex1 or npm run deploy:ex2');
  process.exit(1);
}

const examplePath = path.join(process.cwd(), 'src', example);
if (!fs.existsSync(examplePath)) {
  console.error(`Example ${example} not found`);
  process.exit(1);
}

console.log(`Deploying ${example}...`);

// Deploy resource server
const rsPath = path.join(examplePath, 'resource-server.ts');
const asPath = path.join(examplePath, 'auth-server.ts');

try {
  // Initialize vals if they don't exist
  console.log('Creating/updating resource server val...');
  execSync(`vt val create mcp-oauth-${example}-rs --type http`, { stdio: 'inherit' });
  
  console.log('Creating/updating auth server val...');
  execSync(`vt val create mcp-oauth-${example}-as --type http`, { stdio: 'inherit' });
  
  // Push the code
  console.log('Pushing resource server code...');
  execSync(`vt push ${rsPath} --to mcp-oauth-${example}-rs`, { stdio: 'inherit' });
  
  console.log('Pushing auth server code...');
  execSync(`vt push ${asPath} --to mcp-oauth-${example}-as`, { stdio: 'inherit' });
  
  console.log(`\n✅ ${example} deployed successfully!`);
  console.log(`Resource Server: https://[your-username]-mcp-oauth-${example}-rs.web.val.run`);
  console.log(`Auth Server: https://[your-username]-mcp-oauth-${example}-as.web.val.run`);
  
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}