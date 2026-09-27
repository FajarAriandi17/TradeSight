// Dev preview di sandbox/browser (bukan untuk produksi desktop)
module.exports = {
  apps: [
    {
      name: 'sidecar',
      script: 'apps/desktop/src-tauri/binaries/tradesight-sidecar-x86_64-unknown-linux-gnu',
      args: '--host 0.0.0.0 --port 8765',
      env: { TRADESIGHT_DATA_DIR: '/tmp/tradesight' },
      interpreter: 'none',
    },
    {
      name: 'frontend',
      cwd: 'apps/desktop',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 3000 --outDir ' + (process.env.PREVIEW_DIR || 'dist'),
    },
  ],
}
