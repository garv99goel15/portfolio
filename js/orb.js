// ============================================================
//  GARV — WebGL crystal orb
//  Smooth glossy pearl/egg + fresnel rim + inner glow + bloom
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const gsap = window.gsap;

let renderer, scene, camera, composer, clock;
let orb, core, particles;
let running = false;
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

// Per-phase look: amplitude (very subtle), frequency, color mix, rotation, hue colors, bloom
// Keep amp tiny so the silhouette stays a clean smooth sphere; keep bloom gentle.
const PHASES = [
  { amp: 0.030, freq: 1.3, mix: 0.30, spin: 0.10, a: '#6a5cff', b: '#34d3ff', bloom: 0.55 },
  { amp: 0.028, freq: 1.8, mix: 0.45, spin: 0.16, a: '#34d3ff', b: '#a06bff', bloom: 0.55 },
  { amp: 0.040, freq: 1.2, mix: 0.32, spin: 0.13, a: '#7b2ff7', b: '#34d3ff', bloom: 0.60 },
  { amp: 0.032, freq: 2.0, mix: 0.55, spin: 0.18, a: '#c6f135', b: '#34d3ff', bloom: 0.55 },
  { amp: 0.036, freq: 1.6, mix: 0.22, spin: 0.12, a: '#a06bff', b: '#ff5ca8', bloom: 0.55 },
  { amp: 0.030, freq: 1.8, mix: 0.40, spin: 0.15, a: '#6a5cff', b: '#34d3ff', bloom: 0.55 },
];

const uniforms = {
  uTime: { value: 0 },
  uAmp: { value: PHASES[0].amp },
  uFreq: { value: PHASES[0].freq },
  uMix: { value: PHASES[0].mix },
  uColorA: { value: new THREE.Color(PHASES[0].a) },
  uColorB: { value: new THREE.Color(PHASES[0].b) },
  uColorDeep: { value: new THREE.Color('#160a2e') },
};

// ---- GLSL: Ashima 3D simplex noise (MIT) ----
const NOISE = /* glsl */`
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERT = /* glsl */`
  uniform float uTime; uniform float uAmp; uniform float uFreq;
  varying float vNoise; varying vec3 vNormal; varying vec3 vView;
  ${NOISE}
  void main(){
    // Gentle, low-amplitude swell so the surface stays smooth and glossy.
    float n = snoise(normal * uFreq + uTime * 0.22);
    float disp = n * uAmp;
    vNoise = n;
    vec3 pos = position + normal * disp;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */`
  uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorDeep; uniform float uMix;
  varying float vNoise; varying vec3 vNormal; varying vec3 vView;
  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    vec3 L = normalize(vec3(0.45, 0.8, 0.55));   // key light, upper-right
    float diff = clamp(dot(N, L), 0.0, 1.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 80.0);  // tight glossy highlight

    // Pearl gradient: deep at the base, brighter towards the top.
    float grad = smoothstep(-0.85, 0.95, N.y);
    vec3 base = mix(uColorDeep, uColorA, grad);
    base = mix(base, uColorB, smoothstep(0.45, 1.0, grad) * (0.35 + uMix * 0.55));

    // Soft inner luminosity facing the viewer.
    float inner = pow(max(dot(N, V), 0.0), 1.6);
    vec3 col = base * (0.45 + 0.75 * diff) + inner * uColorA * 0.30;
    col += fres * uColorB * 0.85;                 // iridescent rim
    col += spec * (uColorB * 0.5 + vec3(0.55)) * 1.25;  // gloss highlight
    col = clamp(col, 0.0, 1.6);
    gl_FragColor = vec4(col, 1.0);
  }`;

function makeParticles() {
  const N = 1400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3.2 + Math.random() * 5.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.028, color: 0xbfa9ff, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

export function initOrb(container) {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0418, 0.045);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 6.4);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Orb — smooth high-res round sphere.
  const geo = new THREE.IcosahedronGeometry(1.6, 96);
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
  orb = new THREE.Mesh(geo, mat);
  scene.add(orb);

  // Subtle inner luminosity (kept low so it never blows out to white).
  core = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(core);

  particles = makeParticles();
  scene.add(particles);

  // Bloom — gentle, high threshold so only the gloss highlight + rim bloom.
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight), PHASES[0].bloom, 0.4, 0.9
  );
  composer.bloomPass = bloom;
  composer.addPass(bloom);

  clock = new THREE.Clock();

  window.addEventListener('mousemove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('resize', onResize);
  onResize.container = container;
}

function onResize() {
  const c = onResize.container;
  if (!c || !renderer) return;
  const w = c.clientWidth, h = c.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); composer.setSize(w, h);
}

function tick() {
  if (!running) return;
  const t = clock.getElapsedTime();
  uniforms.uTime.value = t;

  pointer.x += (pointer.tx - pointer.x) * 0.05;
  pointer.y += (pointer.ty - pointer.y) * 0.05;

  const spin = orb.userData.spin ?? PHASES[0].spin;
  orb.rotation.y += 0.0014 + spin * 0.003;
  orb.rotation.x = pointer.y * 0.12;
  orb.rotation.z = -pointer.x * 0.06;
  core.rotation.copy(orb.rotation);

  // Gentle idle float so the pearl feels alive.
  const bob = Math.sin(t * 0.8) * 0.07;
  orb.position.y = bob;
  core.position.y = bob;

  particles.rotation.y -= 0.0006;
  particles.rotation.x = pointer.y * 0.05;

  camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
  camera.position.y += (-pointer.y * 0.32 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);

  composer.render();
  requestAnimationFrame(tick);
}

export function startOrb() {
  if (running) return;
  running = true;
  clock.start();
  tick();
}

export function setPhase(i) {
  const p = PHASES[i % PHASES.length];
  if (!orb) return;
  orb.userData.spin = p.spin;
  if (!gsap) {
    uniforms.uAmp.value = p.amp; uniforms.uFreq.value = p.freq; uniforms.uMix.value = p.mix;
    uniforms.uColorA.value.set(p.a); uniforms.uColorB.value.set(p.b);
    if (composer.bloomPass) composer.bloomPass.strength = p.bloom;
    return;
  }
  gsap.to(uniforms.uAmp, { value: p.amp, duration: 1.4, ease: 'power3.inOut' });
  gsap.to(uniforms.uFreq, { value: p.freq, duration: 1.4, ease: 'power3.inOut' });
  gsap.to(uniforms.uMix, { value: p.mix, duration: 1.4, ease: 'power3.inOut' });
  gsap.to(uniforms.uColorA.value, { r: new THREE.Color(p.a).r, g: new THREE.Color(p.a).g, b: new THREE.Color(p.a).b, duration: 1.4 });
  gsap.to(uniforms.uColorB.value, { r: new THREE.Color(p.b).r, g: new THREE.Color(p.b).g, b: new THREE.Color(p.b).b, duration: 1.4 });
  if (composer.bloomPass) gsap.to(composer.bloomPass, { strength: p.bloom, duration: 1.4, ease: 'power2.inOut' });
}

// Pulse the orb outward (used on enter / section changes)
export function pulseOrb() {
  if (!gsap || !orb) return;
  gsap.fromTo(orb.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: 1.6, ease: 'elastic.out(1, 0.6)' });
}

export const PHASE_COUNT = PHASES.length;
