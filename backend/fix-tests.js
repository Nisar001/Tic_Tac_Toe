#!/usr/bin/env node

/**
 * Test Fix Script
 * 
 * This script provides a systematic approach to fix common TypeScript errors
 * in test files. Run this script to automatically fix recurring patterns.
 */

const fs = require('fs');
const path = require('path');

// Common patterns to fix
const fixes = [
  {
    name: 'Add NextFunction import',
    pattern: /import \{ Request, Response \} from 'express';/g,
    replacement: "import { Request, Response, NextFunction } from 'express';"
  },
  {
    name: 'Add test helpers import',
    pattern: /(import.*error\.middleware.*\n)/,
    replacement: '$1import { createMockEnergyStatus, createMockUser, createMockRefreshToken } from \'../../../utils/testHelpers\';\n'
  },
  {
    name: 'Fix controller calls - add next parameter',
    pattern: /await (\w+)\(req as Request, res as Response\);/g,
    replacement: 'await $1(req as Request, res as Response, next);'
  },
  {
    name: 'Fix controller calls in expect',
    pattern: /await expect\((\w+)\(req as Request, res as Response\)\)/g,
    replacement: 'await expect($1(req as Request, res as Response, next))'
  },
  {
    name: 'Add next variable declaration',
    pattern: /(let res: Partial<Response>;)/,
    replacement: '$1\n  let next: NextFunction;'
  },
  {
    name: 'Initialize next in beforeEach',
    pattern: /(res = \{[\s\S]*?\};)/,
    replacement: '$1\n    \n    next = jest.fn();'
  }
];

/**
 * Apply fixes to a file
 */
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
      console.log(`  ✅ Applied: ${fix.name}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

/**
 * Find all test files
 */
function findTestFiles(dir) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.test.ts') || item.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    });
  }
  
  walkDir(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  const testsDir = path.join(__dirname, 'tests');
  
  if (!fs.existsSync(testsDir)) {
    console.log('Tests directory not found');
    return;
  }

  console.log('🔧 Starting test file fixes...\n');

  const testFiles = findTestFiles(testsDir);
  let fixedCount = 0;

  testFiles.forEach(file => {
    console.log(`\n📁 Processing: ${file}`);
    if (fixFile(file)) {
      fixedCount++;
    } else {
      console.log(`  ℹ️  No fixes needed`);
    }
  });

  console.log(`\n✨ Completed! Fixed ${fixedCount} out of ${testFiles.length} files.`);
  console.log('\n📋 Manual fixes still needed for each test file:');
  console.log('1. Replace mockEnergyStatus objects with createMockEnergyStatus()');
  console.log('2. Replace mockUserData objects with createMockUser()');
  console.log('3. Fix specific property access errors');
  console.log('4. Update EnergyStatus property names (energyToRegen -> timeUntilNextRegen)');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, findTestFiles, fixes };
