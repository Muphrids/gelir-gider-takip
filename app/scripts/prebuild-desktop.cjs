const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform === 'win32') {
  const processes = ['Gelir Gider Takip.exe', 'electron.exe'];
  for (const name of processes) {
    spawnSync('taskkill', ['/F', '/IM', name, '/T'], { stdio: 'ignore', shell: true });
  }
}

const outputDir = path.join(__dirname, '..', 'dist-electron');
if (fs.existsSync(outputDir)) {
  try {
    fs.rmSync(outputDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    console.log('[prebuild] dist-electron klasörü temizlendi.');
  } catch {
    console.warn('[prebuild] dist-electron temizlenemedi, build yeni dosyalarla devam edecek.');
  }
}
