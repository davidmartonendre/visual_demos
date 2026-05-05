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

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
    vec2 mp = (mouse - 0.5 * resolution) / min(resolution.x, resolution.y);

    float pattern = 0.0;

    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 node = vec2(
        sin(time * 0.15 + fi * 1.3) * 0.8 + sin(time * 0.3 + fi * 0.7) * 0.2,
        cos(time * 0.2 + fi * 1.7) * 0.8 + cos(time * 0.25 + fi * 0.5) * 0.2
      );

      float mouseInfluence = smoothstep(1.2, 0.0, length(mp - node));
      node += (mp - node) * mouseInfluence * 0.2;

      float d = length(p - node);
      float nodeGlow = exp(-d * 8.0) * 0.6;
      float pulse = sin(time * 2.0 + fi * 3.14) * 0.5 + 0.5;
      nodeGlow *= 0.5 + pulse * 0.5;
      pattern += nodeGlow;

      for (int j = 0; j < 12; j++) {
        if (j <= i) continue;
        float fj = float(j);
        vec2 other = vec2(
          sin(time * 0.15 + fj * 1.3) * 0.8 + sin(time * 0.3 + fj * 0.7) * 0.2,
          cos(time * 0.2 + fj * 1.7) * 0.8 + cos(time * 0.25 + fj * 0.5) * 0.2
        );
        other += (mp - other) * smoothstep(1.2, 0.0, length(mp - other)) * 0.2;

        vec2 diff = other - node;
        float len = length(diff);
        if (len < 0.8) {
          float t = dot(p - node, diff) / (len * len + 0.001);
          t = clamp(t, 0.0, 1.0);
          vec2 closest = node + diff * t;
          float lineDist = length(p - closest);
          float line = smoothstep(0.008, 0.0, lineDist) * (1.0 - len * 0.8);
          line *= sin(time * 3.0 + fi + fj) * 0.3 + 0.7;
          pattern += line * 0.4;
        }
      }
    }

    float clickWave = 0.0;
    if (clicked > 0.0) {
      vec2 cp = (clickPos - 0.5 * resolution) / min(resolution.x, resolution.y);
      float cd = length(p - cp);
      clickWave = sin(cd * 20.0 - time * 8.0) * exp(-cd * 4.0 - time * 0.3);
    }

    pattern += clickWave * 0.3;
    pattern = clamp(pattern, 0.0, 1.0);

    gl_FragColor = vec4(vec3(pattern), 1.0);
  }
`;

export default function NeuralMesh() {
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
