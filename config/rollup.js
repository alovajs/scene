/*
 * @Date: 2020-04-09 11:06:01
 * @LastEditors: JOU(wx: huzhen555)
 * @LastEditTime: 2022-11-30 20:46:39
 */
var typescript = require('rollup-plugin-typescript2');
var { readFileSync } = require('fs');
var compilePaths = require('./libs');
const path = require('path');

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

const pkgPath = path.resolve(process.cwd(), './package.json');
const pkg = require(pkgPath);
const version = process.env.VERSION || pkg.version;
const { name, author, homepage } = pkg;
exports.banner = `/**
  * ${name} ${version} (${homepage})
  * Copyright ${new Date().getFullYear()} ${author}. All Rights Reserved
  * Licensed under MIT (${homepage}/blob/main/LICENSE)
  */
`;
const compilePath = (exports.compilePath = compilePaths[extension]);
exports.external = compilePath.external;
