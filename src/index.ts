import { Compiler } from 'webpack';
import parser from './parser';
import * as path from 'path';
import glob = require('glob');
import fs = require('fs');
import mkdirp = require('mkdirp');

interface ReactTypescriptIntlOptions {
  filename?: string;
  path?: string;
  defaultLocale?: string;
  outputPath?: string;
  preventOverwrite?: boolean;
  supportedLocales?: string[];
  addEmptyString?: boolean;

}
class ReactTypescriptIntl {
  TS_PATTERN = '**/*.@(tsx|ts)';
  options: ReactTypescriptIntlOptions;
  basePattern: string;
  basePath: string;
  finish: boolean = false;
  messages: any;
  outputFile: string;
  constructor(opts: ReactTypescriptIntlOptions) {
    this.options = opts;
  }
  apply(compiler: Compiler) {
    compiler.plugin('compile', ({ normalModuleFactory }) => {
      this.basePath = normalModuleFactory.context;
      this.basePattern = path.join(this.basePath, this.TS_PATTERN);
      const assetName = (this.options.filename) ? this.options.filename : 'locales.json';
      const fullpath = path.resolve(this.basePath, this.options.outputPath, assetName);
      this.outputFile = fullpath;
      this.run();
    });
  }
  writeAssetToDisk(content, cb?) {
    const assetName = (this.options.filename) ? this.options.filename : 'locales.json';
    const fullpath = path.resolve(this.basePath, this.options.outputPath, assetName);
    const directory = path.dirname(fullpath);
    mkdirp(directory, function (err) {
      if (err) {
        if (cb && typeof cb === 'function')
          return cb(err);
        else return;
      }
      // Write to disk
      console.log('writing messages to disk');
      fs.writeFile(fullpath, content, function (err) {
        if (err) {
          if (cb && typeof cb === 'function')
            return cb(err);
          else return;
        }
        if (cb && typeof cb === 'function')
          cb(null);
      });
    });
  }
  parseMessages(messages) {
    let defaultLocale = {};
    let defaultMessage = {};
    messages.forEach(r => {
      defaultLocale[r.id] = r.defaultMessage;
    });

    if (this.options.preventOverwrite) {
      if (fs.existsSync(this.outputFile)) {
        const str = fs.readFileSync(this.outputFile, { encoding: 'utf-8' });
        const { en, ...rest } = JSON.parse(str);
        defaultLocale = Object.assign({}, en, defaultLocale);
        defaultMessage = { ...rest };
      }
    }
    const locales = {
      en: defaultLocale,
      ...defaultMessage
    };
    if (this.options.supportedLocales)
      this.options.supportedLocales.forEach(language => {
        locales[language] = (locales.hasOwnProperty(language)) ? Object.assign({}, locales[language]) : {};
        if (this.options.addEmptyString) {
          Object.keys(locales.en).forEach(key => {
            if (!locales[language].hasOwnProperty(key))
              locales[language][key] = "";
          });
        }
      });
    const jsonString = JSON.stringify(locales, undefined, 2);
    return jsonString;
  }
  run() {
    let results = [];
    glob(this.basePattern, (err:any, files) => {
      if (err) {
        throw new Error(err);
      }
      files.forEach(f => {
        const content = fs.readFileSync(f).toString();
        const res = parser(content);
        results = results.concat(res);
      });
      this.messages = results;
      const content = this.parseMessages(this.messages);
      this.writeAssetToDisk(content);
    });
  }
}

export default ReactTypescriptIntl;
