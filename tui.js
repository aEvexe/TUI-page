const blessed = require('blessed');
const sharp = require('sharp');
const path = require('path');

// ─── Braille Image Converter ─────────────────────────────────────────────────
const BRAILLE_BASE = 0x2800;
const BRAILLE_MAP = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

async function imageToBraille(imagePath, cols, rows) {
  const pixelW = cols * 2;
  const pixelH = rows * 4;

  const { data } = await sharp(imagePath)
    .resize(pixelW, pixelH, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lines = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      let code = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const px = col * 2 + dx;
          const py = row * 4 + dy;
          if (data[py * pixelW + px] < 128) code |= BRAILLE_MAP[dy][dx];
        }
      }
      line += String.fromCharCode(BRAILLE_BASE + code);
    }
    lines.push(line);
  }
  return lines.join('\n');
}

// ─── ASCII Name Banner ──────────────────────────────────────────────────────
const NAME_BANNER = `     _       _
    (_) __ _| | ___ _ __
    | |/ _\` | |/ _ \\ '_ \\
    | | (_| | |  __/ | | |
   _/ |\\__,_|_|\\___|_| |_|
  |__/`;

// ─── Page Content ─────────────────────────────────────────────────────────────
const PAGES = {
  About: {
    title: 'About',
    content: [
      'is a creator & storyteller on the',
      'internet, building cool products,',
      'documenting life & reflecting on how',
      'technology shapes our humanity.',
      '',
      'Explore the directories below to',
      'learn more.',
    ],
  },
  Links: {
    title: 'Links',
    content: [
      '->  GitHub      github.com/jalen',
      '->  Twitter     @jalen',
      '->  LinkedIn    linkedin.com/in/jalen',
      '->  Email       jalen@example.com',
      '->  Website     jalen.dev',
    ],
  },
  Work: {
    title: 'Work',
    content: [
      '2023 - now',
      '  Software Engineer @ Company',
      '  Building things people love',
      '',
      '2021 - 2023',
      '  Developer @ Previous Co.',
      '  Led product development 0->1',
      '',
      '2019 - 2021',
      '  Junior Dev @ Startup',
      '  Full-stack web development',
    ],
  },
};

// ─── Themes (bg: -1 = transparent/default terminal bg) ───────────────────────
const THEMES = [
  { name: 'dark', bg: -1, fg: '#c8d8ff', accent: '#ff4500', dim: '#555555' },
  { name: 'green', bg: -1, fg: '#c8d8ff', accent: '#00cc33', dim: '#005511' },
  { name: 'blue', bg: -1, fg: '#c8d8ff', accent: '#5599ff', dim: '#334466' },
];

const pageKeys = Object.keys(PAGES);

// ─── Typewriter helper ───────────────────────────────────────────────────────
function typeText(element, text, speed, screen, callback) {
  let idx = 0;
  const interval = setInterval(() => {
    idx++;
    element.setContent(text.slice(0, idx));
    screen.render();
    if (idx >= text.length) {
      clearInterval(interval);
      if (callback) callback();
    }
  }, speed);
  return interval;
}

// ─── Loading Screen ──────────────────────────────────────────────────────────
// opts: { input, output, terminal } for SSH, omit for local
function showLoader(opts) {
  const screenOpts = {
    smartCSR: true,
    fullUnicode: true,
    title: 'loading...',
  };
  if (opts) {
    screenOpts.input = opts.input;
    screenOpts.output = opts.output;
    screenOpts.terminal = opts.terminal || 'xterm-256color';
  }

  const screen = blessed.screen(screenOpts);

  blessed.box({
    parent: screen,
    top: 0, left: 0, width: '100%', height: '100%',
    style: { bg: -1 },
  });

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  const spinner = blessed.text({
    parent: screen,
    top: 'center',
    left: '50%-6',
    width: 20,
    height: 1,
    tags: true,
    style: { bg: -1, fg: '#c8d8ff' },
  });

  screen.render();

  const interval = setInterval(() => {
    spinner.setContent(
      `{#ff4500-fg}${frames[i % frames.length]}{/} {#c8d8ff-fg}loading...{/}`,
    );
    screen.render();
    i++;
  }, 80);

  return { screen, interval };
}

// ─── Build TUI ───────────────────────────────────────────────────────────────
// opts: { input, output, terminal, onQuit } for SSH, omit for local
function buildTUI(brailleArt, opts) {
  let currentPage = 0;
  let currentTheme = 0;
  const theme = THEMES[currentTheme];
  const artLines = brailleArt.split('\n').length;

  const screenOpts = {
    smartCSR: true,
    fullUnicode: true,
    title: 'jalen - portfolio',
    cursor: { artificial: true, shape: 'block', blink: true },
  };
  if (opts) {
    screenOpts.input = opts.input;
    screenOpts.output = opts.output;
    screenOpts.terminal = opts.terminal || 'xterm-256color';
  }

  const screen = blessed.screen(screenOpts);

  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    if (opts && opts.onQuit) {
      opts.onQuit();
    } else {
      process.exit(0);
    }
  });

  // ── Root box
  const root = blessed.box({
    parent: screen,
    top: 0, left: 0, width: '100%', height: '100%',
    style: { bg: theme.bg, fg: theme.fg },
  });

  // ── Top nav bar (hidden initially)
  const nav = blessed.box({
    parent: root,
    top: 0, left: 0, width: '100%', height: 3,
    style: { bg: theme.bg },
    hidden: true,
  });

  const navLeft = blessed.box({
    parent: nav,
    top: 1, left: 2, width: '60%', height: 1,
    content: '', tags: true,
    style: { bg: theme.bg },
  });

  const statusBox = blessed.text({
    parent: nav,
    top: 1, right: 2, width: 20, height: 1,
    content: '{bold}[ jalen.dev ]{/bold}',
    tags: true,
    style: { fg: theme.accent, bg: theme.bg },
  });

  const navSep = blessed.line({
    parent: root,
    top: 3, left: 0, orientation: 'horizontal', width: '100%',
    style: { fg: theme.dim, bg: theme.bg },
    hidden: true,
  });

  // ── Centered content area
  const contentHeight = Math.max(artLines, 20);
  const contentWidth = 86;
  const content = blessed.box({
    parent: root,
    top: 'center', left: 'center',
    width: contentWidth, height: contentHeight,
    style: { bg: theme.bg },
  });

  const asciiBox = blessed.box({
    parent: content,
    top: 0, left: 0,
    width: 42, height: artLines + 1,
    content: '',
    style: { fg: theme.fg, bg: theme.bg },
  });

  const nameBox = blessed.box({
    parent: content,
    top: 0, left: 44,
    width: 42, height: 7,
    content: '',
    style: { fg: theme.accent, bg: theme.bg },
  });

  const textBox = blessed.box({
    parent: content,
    top: 8, left: 44,
    width: 42, height: contentHeight - 8,
    tags: true, content: '',
    style: { bg: theme.bg, fg: theme.fg },
  });

  // ── Bottom bar (hidden initially)
  const bottomBar = blessed.box({
    parent: root,
    bottom: 0, left: 0, width: '100%', height: 3,
    style: { bg: theme.bg },
    hidden: true,
  });

  const bottomSep = blessed.line({
    parent: root,
    bottom: 3, left: 0, orientation: 'horizontal', width: '100%',
    style: { fg: theme.dim, bg: theme.bg },
    hidden: true,
  });

  const versionText = blessed.text({
    parent: bottomBar,
    bottom: 1, left: 2,
    content: 'v1.0.0',
    style: { fg: theme.dim, bg: theme.bg },
  });

  const hintText = blessed.text({
    parent: bottomBar,
    bottom: 1, left: 'center', width: 55,
    content: '', tags: true,
    style: { fg: theme.fg, bg: theme.bg },
  });

  // ── Render helpers
  function renderNav() {
    const t = THEMES[currentTheme];
    let navContent = '';
    pageKeys.forEach((key, i) => {
      if (i === currentPage) {
        navContent += `{bold}{#${t.accent.slice(1)}-fg}${key}{/}`;
      } else {
        navContent += `{#${t.dim.slice(1)}-fg}${key}{/}`;
      }
      if (i < pageKeys.length - 1) navContent += '  ';
    });
    navLeft.setContent(navContent);
  }

  function renderContent() {
    const t = THEMES[currentTheme];
    const page = PAGES[pageKeys[currentPage]];
    textBox.setContent(`{#${t.fg.slice(1)}-fg}${page.content.join('\n')}{/}`);
  }

  function renderHints() {
    const t = THEMES[currentTheme];
    hintText.setContent(
      `{#${t.accent.slice(1)}-fg}<- ->{/} navigate  {#${t.accent.slice(1)}-fg}t{/} theme  {#${t.accent.slice(1)}-fg}?{/} help  {#${t.accent.slice(1)}-fg}q{/} quit`,
    );
  }

  function updateStyles() {
    const t = THEMES[currentTheme];
    [root, nav, navLeft, content, asciiBox, nameBox, textBox, bottomBar].forEach(
      (el) => { el.style.bg = t.bg; },
    );
    root.style.fg = t.fg;
    asciiBox.style.fg = t.fg;
    textBox.style.fg = t.fg;
    hintText.style.fg = t.fg; hintText.style.bg = t.bg;
    statusBox.style.fg = t.accent; statusBox.style.bg = t.bg;
    nameBox.style.fg = t.accent;
    navSep.style.fg = t.dim; navSep.style.bg = t.bg;
    bottomSep.style.fg = t.dim; bottomSep.style.bg = t.bg;
    versionText.style.fg = t.dim; versionText.style.bg = t.bg;
  }

  function renderAll() {
    renderNav();
    renderContent();
    renderHints();
    screen.render();
  }

  // ── Key bindings (disabled during animation)
  let animationDone = false;

  screen.key(['left', 'h'], () => {
    if (!animationDone) return;
    currentPage = (currentPage - 1 + pageKeys.length) % pageKeys.length;
    renderAll();
  });

  screen.key(['right', 'l'], () => {
    if (!animationDone) return;
    currentPage = (currentPage + 1) % pageKeys.length;
    renderAll();
  });

  screen.key('t', () => {
    if (!animationDone) return;
    currentTheme = (currentTheme + 1) % THEMES.length;
    updateStyles();
    renderAll();
  });

  screen.key('?', () => {
    if (!animationDone) return;
    const help = blessed.box({
      parent: screen,
      top: 'center', left: 'center', width: 40, height: 12,
      border: { type: 'line' },
      style: {
        fg: THEMES[currentTheme].fg,
        bg: THEMES[currentTheme].bg,
        border: { fg: THEMES[currentTheme].accent },
      },
      content: [
        '', '  Keyboard Shortcuts', '  -------------------',
        '  <- / h    prev page', '  -> / l    next page',
        '  t        cycle theme', '  ?        this help',
        '  q        quit', '', '  Press any key to close',
      ].join('\n'),
    });
    screen.render();
    screen.once('keypress', () => { help.destroy(); screen.render(); });
  });

  // ── Intro Animation: show image + name, type bio, reveal UI
  asciiBox.setContent(brailleArt);
  nameBox.setContent(NAME_BANNER);
  screen.render();

  setTimeout(() => {
    const aboutText = PAGES.About.content.join('\n');
    typeText(textBox, aboutText, 12, screen, () => {
      setTimeout(() => {
        nav.show();
        navSep.show();
        bottomBar.show();
        bottomSep.show();
        animationDone = true;
        renderAll();
      }, 400);
    });
  }, 300);

  return screen;
}

module.exports = { imageToBraille, showLoader, buildTUI, NAME_BANNER, PAGES, THEMES };
