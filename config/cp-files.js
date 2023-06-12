const cpy = require('cpy');
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

(async () => {
  // 将src/index.js修改为对应框架，并复制文件到对应框架下
  const fileContent = readFileSync(resolve(__dirname, '../src/index.js'));
  writeFileSync(resolve('./index.js'), fileContent.toString().replace('{framework}', process.env.FW));
  await cpy(resolve(__dirname, '../typings/**'), resolve('./typings'));
})();
