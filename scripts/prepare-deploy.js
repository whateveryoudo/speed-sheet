const fs = require('fs-extra');
const path = require('path');

async function prepareDeploy() {
  const deployDir = path.resolve(__dirname, '../dist-deploy');
  await fs.ensureDir(deployDir);

  const docsDistDir = path.resolve(__dirname, '../docs/.vitepress/dist');
  const docsTargetDir = path.resolve(deployDir, 'docs');
  await fs.ensureDir(docsTargetDir);
  await fs.copy(docsDistDir, docsTargetDir, {
    filter: (src) => !src.includes('.git'),
  });

  await fs.copy(
    path.resolve(__dirname, '../demos/vue3-demo/dist'),
    path.resolve(deployDir, 'demo'),
  );

  const indexHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Speed Sheet</title>
    <script>
      const path = window.location.pathname;
      if (path === '/' || path === '/speed-sheet/' || path === '/speed-sheet/index.html') {
        window.location.href = '/speed-sheet/docs/';
      }
    </script>
  </head>
  <body>
    <p>If you are not redirected automatically, <a href="/speed-sheet/docs/">click here</a>.</p>
  </body>
</html>
  `.trim();

  await fs.writeFile(path.resolve(deployDir, 'index.html'), indexHtml);
  console.log('Deploy files prepared successfully!');
}

prepareDeploy().catch(console.error);
