#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Server } = require('ssh2');
const { imageToBraille, showLoader, buildTUI } = require('./tui');

const PORT = process.env.PORT || 22;

// ─── Pre-generate braille art at startup ─────────────────────────────────────
let brailleArt = '[ no image ]';
const imagePath = path.join(__dirname, 'assets', 'image.jpg');

imageToBraille(imagePath, 40, 28)
  .then((art) => {
    brailleArt = art;
    console.log('Braille art generated from assets/image.jpg');
  })
  .catch((err) => {
    console.warn('Could not convert image:', err.message);
  });

// ─── Handle SSH session ──────────────────────────────────────────────────────
function handleSession(stream, ptyInfo) {
  stream.columns = ptyInfo.cols || 80;
  stream.rows = ptyInfo.rows || 24;
  stream.isTTY = true;
  stream.setRawMode = () => {};

  const streamOpts = {
    input: stream,
    output: stream,
    terminal: ptyInfo.term || 'xterm-256color',
  };

  // Show loader for 2 seconds, then main TUI
  const { screen: loaderScreen, interval } = showLoader(streamOpts);

  setTimeout(() => {
    clearInterval(interval);
    loaderScreen.destroy();

    const screen = buildTUI(brailleArt, {
      ...streamOpts,
      onQuit: () => stream.end(),
    });

    stream.on('window-change', (info) => {
      stream.columns = info.cols;
      stream.rows = info.rows;
      screen.program.cols = info.cols;
      screen.program.rows = info.rows;
      screen.program.emit('resize');
    });

    stream.on('error', () => {
      try {
        screen.destroy();
      } catch (e) {}
    });
    stream.on('end', () => {
      try {
        screen.destroy();
      } catch (e) {}
    });
  }, 2000);
}

// ─── SSH Server ──────────────────────────────────────────────────────────────
const server = new Server(
  {
    hostKeys: [fs.readFileSync(path.join(__dirname, 'host_key'))],
  },
  (client) => {
    console.log('Client connected');

    client.on('authentication', (ctx) => {
      ctx.accept();
    });

    client.on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();
        let ptyInfo = { cols: 80, rows: 24, term: 'xterm-256color' };

        session.on('pty', (accept, _, info) => {
          ptyInfo = info;
          accept();
        });

        session.on('shell', (accept) => {
          const stream = accept();

          session.on('window-change', (_, __, info) => {
            stream.emit('window-change', info);
          });

          stream.on('close', () => {
            console.log('Client disconnected');
          });

          handleSession(stream, ptyInfo);
        });
      });
    });

    client.on('error', (err) => {
      console.error('Client error:', err.message);
    });
  },
);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  SSH portfolio server running on port ${PORT}`);
  console.log(`  Test locally: ssh -p ${PORT} localhost\n`);
});
