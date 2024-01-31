import React, { useEffect, useRef } from 'react';
import './App.css';

class point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  toString() {
    return '('+this.x+','+this.y+')';
  }
}

class rect {
  x: number;
  y: number;
  w: number;
  h: number;
  constructor(x: number, y: number, w: number, h: number) {
    this.x=x;
    this.y=y;
    this.w=w;
    this.h=h;
  }
  toString() {
    return '('+this.x+','+this.y+','+this.w+','+this.h+')';
  }
}

function App() {
  const refWasm = useRef<any>(null)
  const refTextin = useRef<HTMLTextAreaElement>(null!)
  const refTextout = useRef<HTMLTextAreaElement>(null!)

  /* wasm読込み */
  const h = require('./cppmain.js');
  h.Module.onRuntimeInitialized = () => {
    console.log("Wasm loaded.");
    refWasm.current = h.Module
  }

  useEffect(() => {
    refTextin.current.rows = 5
    refTextout.current.rows = 5
  });

  const bclick = () => {
    const textout = refTextout.current;
    const wasm = refWasm.current;
    if(!textout && !wasm) return;
		textout.value ="f1(1,2)=" + wasm.f1(1,2) + "\n";
		textout.value+="f2(2.5,3.5)=" + wasm.f2(2.5, 3.5) + "\n";
		textout.value+="f3('aaa', 'bbbb')=" + wasm.f3('aaa', 'bbbb') + "\n";
		const arg41=[1,2,3,4], arg42=[5,6,7,8];
		textout.value+="f4([1,2,3,4], [5,6,7,8])=" + wasm.f4(arg41, arg42) + "\n";
		const arg51=new Uint8Array([1,2,3,4]), arg52=new Uint8Array([5,6,7,8]);
		textout.value+="f5(new Uint8Array([1,2,3,4]), new Uint8Array([5,6,7,8]))=" + wasm.f5(arg51, arg52) + "\n";
		const arg61=['aa','bb','cc','dd'], arg62=['ee','ff','gg','hh'];
		textout.value+="f6(['aa','bb','cc','dd'], ['ee','ff','gg','hh'])=" + wasm.f6(arg61, arg62) + "\n";
		const arg71=new point(1,2), arg72=new point(3,4);
//		textout.value+="f7(new point(1,2), new point(3,4))=" + wasm.f7(arg71, arg72) + "\n";
		textout.value+="f8({x2:1, y2:2},{w2:3, h2:4})=" + JSON.stringify(wasm.f8({x2:1, y2:2},{w2:3, h2:4}));
  }

  return (
    <div className="App">
      hello world!!
      <button onClick={bclick}>Click</button>
      <textarea id="textin" ref={refTextin}></textarea>
      <textarea id="textout" ref={refTextout}></textarea>
    </div>
  );
}

export default App;
