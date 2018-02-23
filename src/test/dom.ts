/* setup.js */

const { JSDOM } = require('jsdom');

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');

function copyProps(src: any, target: any) {
  const props = Object.getOwnPropertyNames(src)
    .filter(prop => typeof target[prop] === 'undefined')
    .map(prop => Object.getOwnPropertyDescriptor(src, prop));
  Object.defineProperties(target, props as any);
}

(global as any).window = jsdom.window;
(global as any).document = window.document;
(global as any).navigator = {
  userAgent: 'node.js',
};
copyProps(window, global);