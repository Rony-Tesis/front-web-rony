const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../src/app');
const errors = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { visit(file); continue; }
    if (!/\.(ts|html|css)$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (!relative.endsWith('.spec.ts')) {
      if (/\binnerHTML\b|bypassSecurityTrust|\blocalStorage\b|\bsessionStorage\b|document\.querySelector/.test(content)) errors.push(`${relative}: unsafe DOM or storage API`);
      if (relative.includes('/domain/') && /from ['"].*(?:@angular|rxjs|application|infrastructure|presentation)/.test(content)) errors.push(`${relative}: domain depends on framework or outer layer`);
      if (relative.includes('/presentation/') && /from ['"].*(?:infrastructure|@angular\/common\/http)/.test(content)) errors.push(`${relative}: presentation bypasses application port`);
    }
    if (file.endsWith('.component.ts')) {
      for (const extension of ['html', 'css']) {
        if (!fs.existsSync(file.replace(/\.ts$/, `.${extension}`))) errors.push(`${relative}: missing external ${extension}`);
      }
      if (/\btemplate\s*:|\bstyles\s*:/.test(content)) errors.push(`${relative}: inline component resources`);
    }
  }
}
visit(root);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Architecture boundaries and component files verified.');
