import { mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionSiteAssets } from './version-site-assets.mjs';
test('changed static files invalidate cached URLs while runtime config and Clarity stay stable',()=>{
 const root=mkdtempSync(join(tmpdir(),'prymeira-assets-'));
 try {
  writeFileSync(join(root,'main.js'),'one');writeFileSync(join(root,'main.woff2'),'font');writeFileSync(join(root,'analytics.js'),'tracker');writeFileSync(join(root,'site-config.js'),'runtime');
  const html='<head><script src="main.js"></script><script src="analytics.js"></script><script src="site-config.js"></script><style>src: url("main.woff2")</style></head>';
  writeFileSync(join(root,'index.html'),html);versionSiteAssets(root);const first=readFileSync(join(root,'index.html'),'utf8');
  assert.match(first,/main\.js\?v=[a-f0-9]{12}/);assert.match(first,/main\.woff2\?v=[a-f0-9]{12}/);assert.match(first,/src="analytics\.js"/);assert.match(first,/src="site-config\.js"/);
  writeFileSync(join(root,'main.js'),'two');versionSiteAssets(root);const second=readFileSync(join(root,'index.html'),'utf8');assert.notEqual(first,second);assert.doesNotMatch(second,/\?v=[a-f0-9]+\?v=/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
