#!/usr/bin/env node
const path = require('path');
const { imageToBraille, showLoader, buildTUI } = require('./tui');

const imagePath = path.join(__dirname, 'assets', 'image.jpg');
const MIN_LOAD_TIME = 2000;
const loadStart = Date.now();

process.stdin.resume();

const { screen: loaderScreen, interval } = showLoader();

imageToBraille(imagePath, 40, 28)
  .then((art) => {
    const elapsed = Date.now() - loadStart;
    const remaining = Math.max(0, MIN_LOAD_TIME - elapsed);

    setTimeout(() => {
      clearInterval(interval);
      loaderScreen.destroy();
      buildTUI(art);
    }, remaining);
  })
  .catch((err) => {
    clearInterval(interval);
    loaderScreen.destroy();
    console.error('Failed to convert image:', err.message);
    buildTUI('[ no image ]');
  });
