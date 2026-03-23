#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = 'ssh.jaloliddin.org';
const WEB_PORT = process.env.WEB_PORT || 3000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ssh shh.jaloliddin.org</title>
  <link rel="icon" href="/favicon.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111111;
      color: #c8d8ff;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      flex-direction: column;
      gap: 24px;
    }
    .ssh-box {
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px 28px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255,255,255,0.03);
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .ssh-box:hover {
      border-color: #555;
    }
    .ssh-box code {
      font-size: 18px;
      color: #e8e8e8;
      letter-spacing: 0.5px;
    }
    .copy-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }
    .copy-btn svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #666;
      stroke-width: 2;
      transition: stroke 0.2s;
    }
    .copy-btn:hover svg { stroke: #999; }
    .hint {
      color: #666;
      font-size: 14px;
      text-align: center;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="ssh-box" onclick="copyCmd()">
    <code>ssh ${HOST}</code>
    <button class="copy-btn" id="copyBtn" title="Copy to clipboard">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>
  </div>
  <p class="hint">
    This site is a terminal interface.<br>
    Connect via SSH to explore.
  </p>

  <script>
    function copyCmd() {
      navigator.clipboard.writeText('ssh ${HOST}');
      const btn = document.getElementById('copyBtn');
      const svg = btn.querySelector('svg');
      const original = svg.innerHTML;
      svg.innerHTML = '<polyline points="20 6 9 17 4 12" />';
      setTimeout(() => { svg.innerHTML = original; }, 1500);
    }
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.png') {
    const faviconPath = path.join(__dirname, 'assets', 'Terminal.png');
    fs.readFile(faviconPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(data);
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(WEB_PORT, () => {
  console.log(`Web landing page running on port ${WEB_PORT}`);
});
