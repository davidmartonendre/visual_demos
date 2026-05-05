"use client";

import { useEffect, useRef } from "react";

const vertexShader = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  uniform vec2 mouse;
  uniform float clicked;
  uniform vec2 clickPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
    vec2 mp = (mouse - 0.5 * resolution) / min(resolution.x, resolution.y);

    float mouseInfluence = smoothstep(1.5, 0.0, length(p - mp));

    vec2 q = p * 2.0;
    q.x += sin(time * 0.3 + q.y * 1.5) * 0.5;
    q.y += cos(time * 0.4 + q.x * 1.2) * 0.5;

    q += mp * mouseInfluence * 0.3;

    float n = fbm(q + time * 0.2);
    float n2 = fbm(q * 1.5 - time * 0.15 + vec2(n * 2.0));

    float pattern = smoothstep(0.35, 0.65, n2);
    float highlight = pow(n2, 4.0) * 0.8;

    float clickWave = 0.0;
    if (clicked > 0.0) {
      vec2 cp = (clickPos - 0.5 * resolution) / min(resolution.x, resolution.y);
      float cd = length(p - cp);
      clickWave = sin(cd * 25.0 - time * 10.0) * exp(-cd * 5.0 - time * 0.4);
    }

    float final = pattern + highlight + clickWave * 0.3;
    final = clamp(final, 0.0, 1.0);

    gl_FragColor = vec4(vec3(final), 1.0);
  }
`;

export default function LiquidMetal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    let animationId: number;
    let time = 0;
    let mouseX = 0;
    let mouseY = 0;
    let clicked = 0;
    let clickX = 0;
    let clickY = 0;

    function resize() {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener("resize", resize);

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs!, vertexShader);
    gl.compileShader(vs!);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs!, fragmentShader);
    gl.compileShader(fs!);

    const program = gl.createProgram();
    gl.attachShader(program!, vs!);
    gl.attachShader(program!, fs!);
    gl.linkProgram(program!);
    gl.useProgram(program!);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program!, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program!, "time");
    const resLoc = gl.getUniformLocation(program!, "resolution");
    const mouseLoc = gl.getUniformLocation(program!, "mouse");
    const clickLoc = gl.getUniformLocation(program!, "clicked");
    const clickPosLoc = gl.getUniformLocation(program!, "clickPos");

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = rect.height - (e.clientY - rect.top);
    }

    function handleClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      clicked = 1;
      clickX = e.clientX - rect.left;
      clickY = rect.height - (e.clientY - rect.top);
      setTimeout(() => { clicked = 0; }, 100);
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    function draw() {
      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, mouseX, mouseY);
      gl.uniform1f(clickLoc, clicked);
      gl.uniform2f(clickPosLoc, clickX, clickY);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      time += 0.016;
      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
