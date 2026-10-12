#!/usr/bin/env bash
set -euo pipefail
image=${1:?Provide the Hub image}
container=$(docker run --rm -d -p 127.0.0.1:18767:80 --add-host prymeira_account_api:127.0.0.1 "$image")
trap 'docker stop "$container" >/dev/null' EXIT
docker exec "$container" mkdir -p /usr/share/nginx/site/_analytics_test/nested
docker exec -i "$container" sh -c 'cat > /usr/share/nginx/site/_analytics_test/nested/index.html' <<'HTML'
<!doctype html><html><head><title>Temporary CI page</title></head><body><form><input name="example"></form></body></html>
HTML
docker exec -i "$container" sh -c 'cat > /usr/share/nginx/site/_analytics_test/material.html' <<'HTML'
<!doctype html><html><head><title>Temporary CI material</title></head><body>Test</body></html>
HTML
docker exec -i "$container" sh -c 'cat > /usr/share/nginx/site/_analytics_test/file.pdf' <<'PDF'
%PDF-1.4 CI fixture </head>
PDF
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import http from 'node:http';
function get(path,host) {
  return new Promise((resolve,reject)=>{
    const req=http.get({hostname:'127.0.0.1',port:18767,path,headers:{Host:host}},res=>{
      let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
    });req.on('error',reject);
  });
}
for (let attempt=0;attempt<20;attempt++) {
  try { await get('/','www.prymeiradigital.com.br'); break; }
  catch(error) { if(attempt===19) throw error; await new Promise(resolve=>setTimeout(resolve,250)); }
}
for(const host of ['www.prymeiradigital.com.br','prymeiradigital.com.br']) {
  for(const path of ['/','/privacidade.html','/talk-agenda.html','/_analytics_test/nested/','/_analytics_test/material']) {
    const res=await get(path,host);
    assert.equal(res.status,200,`${host}${path}`);
    assert.equal((res.body.match(/<script src="\/analytics\.js" defer><\/script>/g)||[]).length,1,`${host}${path}: one tracker`);
    assert.match(res.headers['content-security-policy'],/script-src[^;]*https:\/\/\*\.clarity\.ms/);
    assert.match(res.headers['content-security-policy'],/connect-src[^;]*https:\/\/\*\.clarity\.ms/);
    console.log('PASS',host+path);
  }
}
const pdf=await get('/_analytics_test/file.pdf','www.prymeiradigital.com.br');
assert.equal(pdf.status,200);assert.doesNotMatch(pdf.body,/analytics\.js/);
const hub=await get('/','hub.prymeiradigital.com.br');
assert.equal(hub.status,200);assert.doesNotMatch(hub.body,/analytics\.js|clarity\.ms/);
console.log('PASS PDF and Hub isolation');
JS
