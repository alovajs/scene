const cpy = require('cpy');
const { resolve } = require('path');

(async () => {
  await cpy(resolve(__dirname, '../typings/**'), resolve('./typings'));
})();