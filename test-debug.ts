import { isValidFolderName, sanitizeFolderToBranch } from './src/utils/paths.js';

console.log('=== isValidFolderName tests ===');
console.log('folder<name>:', isValidFolderName('folder<name>'));
console.log('folder:name:', isValidFolderName('folder:name'));
console.log('folder ', isValidFolderName('folder '));

console.log('\n=== sanitizeFolderToBranch tests ===');
console.log('-invalid:', sanitizeFolderToBranch('-invalid'));
console.log('..:', sanitizeFolderToBranch('..'));
console.log('.hidden:', sanitizeFolderToBranch('.hidden'));
