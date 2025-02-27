const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs-extra');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

async function copyAssets() {
  // Copiar o arquivo HTML
  const htmlSrc = path.join(__dirname, 'src', 'index.html');
  const htmlDest = path.join(__dirname, 'dist', 'index.html');
  fs.copySync(htmlSrc, htmlDest);
  
  // Copiar o arquivo CSS (caso exista)
  const cssSrc = path.join(__dirname, 'src', 'styles.css');
  const cssDest = path.join(__dirname, 'dist', 'styles.css');
  if (fs.existsSync(cssSrc)) {
    fs.copySync(cssSrc, cssDest);
  }

  // Copiar o arquivo JS (caso exista)
  const jsSrc = path.join(__dirname, 'src', 'script.js');
  const jsDest = path.join(__dirname, 'dist', 'script.js');
  if (fs.existsSync(jsSrc)) {
    fs.copySync(jsSrc, jsDest);
  }

  console.log('Assets copied to dist folder');
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      esbuildProblemMatcherPlugin,
    ],
  });

  // Executar o processo de build
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  // Copiar os arquivos de assets (HTML, CSS, JS)
  await copyAssets();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
