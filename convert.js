// convert.js
const art = require('ascii-art');

art
  .image({
    filepath: 'assets/30k.jpg', // path to your image
    width: 50, // width in terminal chars
    colored: false, // black & white
  })
  .then(console.log);
