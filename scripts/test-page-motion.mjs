import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source=readFileSync(new URL('../apps/hub-web/site/page-motion.js',import.meta.url),'utf8');
function fixture(reduce=false) {
  let id=0,count=0;const queue=new Map(),listeners={},writes=[],classes=[];
  const document={hidden:false,body:{},addEventListener(name,fn){listeners[name]=fn;},removeEventListener(name){delete listeners[name];}};
  const window={document,innerHeight:800,scrollY:0,requestAnimationFrame(fn){queue.set(++id,fn);return id;},cancelAnimationFrame(id){queue.delete(id);},addEventListener(name,fn){listeners[name]=fn;},removeEventListener(name){delete listeners[name];}};
  const root={scrollHeight:8000,style:{setProperty(key,value){writes.push([key,value]);}}};
  const close={getBoundingClientRect(){return {top:7200-window.scrollY};},style:{setProperty(key,value){writes.push([key,value]);}}};
  const teamElement={getBoundingClientRect(){return {top:3200-window.scrollY};}};
  const ledger={getBoundingClientRect(){return {top:4000-window.scrollY,bottom:4600-window.scrollY};}};
  const pill={classList:{toggle(name,value){classes.push([name,value]);}}};
  vm.runInNewContext(source,{window});
  const motion=window.PrymeiraMotion.create({root,close,teamElement,ledger,pill,reduce,teamCount:()=>count});
  function drain(){let runs=0;while(queue.size){assert.ok(runs++<200,'easing must finish');const [id,fn]=queue.entries().next().value;queue.delete(id);fn();}return runs;}
  return {window,document,motion,queue,writes,classes,listeners,drain,setCount(value){count=value;}};
}
test('initial styles match the original state and idle page stops scheduling frames',()=>{
  const f=fixture();assert.equal(f.drain(),1);assert.deepEqual(f.writes,[['--touch','0.000'],['--meet','0.000']]);assert.deepEqual(f.classes,[['away',true]]);assert.equal(f.queue.size,0);
  f.motion.refresh();f.drain();assert.equal(f.writes.length,2,'unchanged styles must not be written again');
});
test('scroll and team selection resume smooth easing and settle to the original targets',()=>{
  const f=fixture();f.drain();f.window.scrollY=3600;f.listeners.scroll();assert.ok(f.drain()>1);assert.deepEqual(f.writes.filter(([key])=>key==='--touch').at(-1),['--touch','0.250']);
  f.setCount(6);f.motion.refresh();f.drain();assert.deepEqual(f.writes.filter(([key])=>key==='--touch').at(-1),['--touch','0.750']);assert.equal(f.queue.size,0);
});
test('resizing and visibility changes refresh geometry without running in a hidden page',()=>{
  const f=fixture();f.drain();f.window.scrollY=7000;f.listeners.scroll();f.document.hidden=true;f.listeners.visibilitychange();assert.equal(f.queue.size,0);
  f.document.hidden=false;f.listeners.visibilitychange();f.drain();assert.deepEqual(f.writes.filter(([key])=>key==='--meet').at(-1),['--meet','0.750']);
  f.window.innerHeight=1000;f.listeners.resize();f.drain();assert.deepEqual(f.writes.filter(([key])=>key==='--meet').at(-1),['--meet','0.800']);
});
test('reduced motion settles immediately and destroy cancels future work',()=>{
  const f=fixture(true);f.setCount(6);assert.equal(f.drain(),1);assert.deepEqual(f.writes.filter(([key])=>key==='--touch').at(-1),['--touch','0.500']);
  f.motion.refresh();f.motion.destroy();assert.equal(f.queue.size,0);assert.deepEqual(Object.keys(f.listeners),[]);
});
