/*
 * @Date: 2020-04-09 11:06:01
 * @LastEditors: JOU(wx: huzhen555)
 * @LastEditTime: 2022-11-30 20:46:39
 */
var typescript = require('rollup-plugin-typescript2');
var { readFileSync } = require('fs');
var compilePaths = require('./libs');

const getCompiler = (
  opt = {
    // objectHashIgnoreUnknownHack: true,
    // clean: true,
    tsconfigOverride: {
      compilerOptions: {
        module: 'ES2015'
      }
    }
  }
) => typescript(opt);
exports.getCompiler = getCompiler;

const extension = process.env.EXTENSION;
if (!extension) {
  console.error('compiling extension error');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json').toString() || '{}');
const version = pkg.version;
const author = pkg.author;
const homepage = pkg.homepage;
exports.banner = `/**
  * ${pkg.name} ${version} (${homepage})
  * Copyright ${new Date().getFullYear()} ${author}. All Rights Reserved
  * Licensed under MIT (${homepage}/blob/master/LICENSE)
  */
`;
const compilePath = (exports.compilePath = compilePaths[extension]);
exports.external = compilePath.external;
