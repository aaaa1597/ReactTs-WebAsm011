import React, { useEffect, useRef } from 'react';
import './App.css';

const constraints: MediaStreamConstraints = {
  audio: false,
  video: {
    // width:  { min: 1280, ideal: 1920, max: 2560 },
    // height: { min: 720 , ideal: 1080, max: 1440 } ,
    width:  640,
    height: 480 ,
    // frameRate: {
    //   max: 30,
    // }//,
    // facingMode: {
    //   exact: 'environment',
    // },
  },
 };

function App() {
  const refWasm = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D|null>();
  const loopRef = useRef(0);
  let cnt = 0;

  /* wasm読込み */
  const h = require('./cppmain.js');
  h.Module.onRuntimeInitialized = () => {
    console.log("Wasm loaded.");
    h.Module["canvas"] = canvasRef.current
    refWasm.current = h.Module
  }
 
  /* 初期化 */
  useEffect(() => {
    const openCamera = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        canvas.width = 640;
        canvas.height = 480;
        video.width = 640;
        video.height = 480;
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();
        ctxRef.current = canvas.getContext('2d');
        loop();
      }
    };
    openCamera();

    return () => cancelAnimationFrame(loopRef.current);
  }, [])

  /* ループ */
  const loop = () => {
    const ctx = ctxRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const wasm = refWasm.current;
    if(ctx && video && canvas && wasm) {
      ctx.drawImage(video, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const buffer = wasm._creata_buffer(data.data.length);
      wasm.HEAPU8.set(data.data, buffer);
      wasm._Convert(buffer, data.width, data.height, cnt);
      wasm._destroy_buffer(buffer);
      cnt++;
      if(cnt>=200) cnt = 0;
    }
    loopRef.current = requestAnimationFrame(loop);
  }

  return (
    <div className="App">
      hello world!!
      <video autoPlay playsInline={true} ref={videoRef} />
      <canvas width="640" height="480" ref={canvasRef} />
    </div>
  );
}

export default App;
