import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const cities = {
  tokyo: { lat: 35.6762, lng: 139.6503, color: 0xff0055 },
  london: { lat: 51.5074, lng: -0.1278, color: 0x00f5d4 },
  newyork: { lat: 40.7128, lng: -74.006, color: 0x3a86ff },
  cairo: { lat: 30.0444, lng: 31.2357, color: 0xffbe0b },
  sydney: { lat: -33.8688, lng: 151.2093, color: 0xe0aaff }
};

let scene;
let camera;
let renderer;
let globe;
let controls;
let activeArc;

export async function initGlobe(containerId='canvas-container') {
  const container = document.getElementById(containerId);
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const texture = await createEarthTexture();

  globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshPhongMaterial({ map: texture, shininess: 18 })
  );

  scene.add(globe);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  scene.add(sun);

  addMarkers();

  window.addEventListener('resize', onResize);

  animate();

  return {
    flyToCity,
    drawArc
  };
}

async function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;

  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0,0,0,canvas.height);
  ocean.addColorStop(0,'#071226');
  ocean.addColorStop(1,'#0a1630');
  ctx.fillStyle = ocean;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle='rgba(255,255,255,0.05)';
  for(let x=0;x<canvas.width;x+=canvas.width/24){
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();
  }

  const urls=[
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
    'https://unpkg.com/world-atlas@2/countries-110m.json'
  ];

  try {
    let topology=null;

    for(const url of urls){
      try{
        const res=await fetch(url);
        if(!res.ok) throw new Error('map fetch failed');
        topology=await res.json();
        break;
      }catch(err){
        console.warn('map source failed',url);
      }
    }

    if(topology && window.topojson){
      const geojson=window.topojson.feature(topology, topology.objects.countries);

      ctx.fillStyle='#0f766e';
      ctx.strokeStyle='#14b8a6';
      ctx.lineWidth=1;

      geojson.features.forEach(feature=>{
        const geom=feature.geometry;
        if(geom.type==='Polygon') drawPolygon(geom.coordinates);
        else if(geom.type==='MultiPolygon') geom.coordinates.forEach(drawPolygon);
      });

      function drawPolygon(coords){
        coords.forEach(ring=>{
          ctx.beginPath();
          ring.forEach((coord,index)=>{
            const pt=project(coord[0],coord[1]);
            if(index===0) ctx.moveTo(pt.x,pt.y);
            else ctx.lineTo(pt.x,pt.y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
    } else {
      drawFallbackContinents(ctx,canvas);
    }
  } catch(err){
    drawFallbackContinents(ctx,canvas);
  }

  return new THREE.CanvasTexture(canvas);
}

function drawFallbackContinents(ctx,canvas){
  ctx.fillStyle='#0f766e';

  const shapes=[
    [[180,160],[500,180],[620,360],[480,520],[240,470]],
    [[780,180],[1040,150],[1160,320],[1080,540],[820,500]],
    [[1240,220],[1680,260],[1780,500],[1450,620],[1220,480]],
    [[1500,720],[1700,760],[1760,880],[1600,930],[1460,860]]
  ];

  shapes.forEach(shape=>{
    ctx.beginPath();
    shape.forEach((p,i)=>{
      if(i===0) ctx.moveTo(p[0],p[1]);
      else ctx.lineTo(p[0],p[1]);
    });
    ctx.closePath();
    ctx.fill();
  });
}

function project(lng,lat){
  return {
    x:((lng+180)/360)*2048,
    y:((90-lat)/180)*1024
  };
}

function toCartesian(lat,lng,r=1){
  const phi=(90-lat)*(Math.PI/180);
  const theta=(lng+180)*(Math.PI/180);

  return new THREE.Vector3(
    -r*Math.sin(phi)*Math.sin(theta),
    r*Math.cos(phi),
    -r*Math.sin(phi)*Math.cos(theta)
  );
}

function addMarkers(){
  Object.entries(cities).forEach(([key,city])=>{
    const marker=new THREE.Mesh(
      new THREE.SphereGeometry(0.015,16,16),
      new THREE.MeshBasicMaterial({ color: city.color })
    );

    marker.position.copy(toCartesian(city.lat,city.lng,1.015));
    globe.add(marker);
  });
}

export function flyToCity(key){
  const city=cities[key];
  if(!city) return;

  const target=toCartesian(city.lat,city.lng,2.4);
  camera.position.copy(target);
}

export function drawArc(keyA,keyB){
  if(activeArc) globe.remove(activeArc);

  const cityA=cities[keyA];
  const cityB=cities[keyB];
  if(!cityA||!cityB) return;

  const posA=toCartesian(cityA.lat,cityA.lng,1.02);
  const posB=toCartesian(cityB.lat,cityB.lng,1.02);

  const points=[];

  for(let i=0;i<=30;i++){
    const t=i/30;
    const mid=new THREE.Vector3().lerpVectors(posA,posB,t);
    mid.normalize().multiplyScalar(1+Math.sin(t*Math.PI)*0.18);
    points.push(mid);
  }

  activeArc=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color:0xfacc15 })
  );

  globe.add(activeArc);
}

function onResize(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
}

function animate(){
  requestAnimationFrame(animate);

  if(globe && controls && controls.state===-1){
    globe.rotation.y += 0.0004;
  }

  controls.update();
  renderer.render(scene,camera);
}
