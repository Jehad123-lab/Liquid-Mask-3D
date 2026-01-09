import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GlobalUniforms, BlobUniforms } from '../../types';

// --- Blob Logic Class ---
class BlobEffect {
  renderer: THREE.WebGLRenderer;
  fbTexture: { value: THREE.FramebufferTexture };
  rtOutput: THREE.WebGLRenderTarget;
  uniforms: BlobUniforms;
  rtScene: THREE.Mesh;
  rtCamera: THREE.Camera;
  
  constructor(renderer: THREE.WebGLRenderer, width: number, height: number, gu: GlobalUniforms) {
    this.renderer = renderer;
    this.fbTexture = { value: new THREE.FramebufferTexture(width, height) }; // Available in newer Three.js versions
    this.rtOutput = new THREE.WebGLRenderTarget(width, height);
    
    this.uniforms = {
      pointer: { value: new THREE.Vector2().setScalar(10) },
      pointerDown: { value: 1 },
      pointerRadius: { value: 0.375 }, // of UV -1..1
      pointerDuration: { value: 2.5 }
    };

    // Note: Event listeners are handled externally in the React component for better cleanup
    
    this.rtScene = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        // @ts-ignore
        onBeforeCompile: (shader) => {
          shader.uniforms.dTime = gu.dTime;
          shader.uniforms.aspect = gu.aspect;
          shader.uniforms.pointer = this.uniforms.pointer;
          shader.uniforms.pointerDown = this.uniforms.pointerDown;
          shader.uniforms.pointerRadius = this.uniforms.pointerRadius;
          shader.uniforms.pointerDuration = this.uniforms.pointerDuration;
          shader.uniforms.fbTexture = this.fbTexture;
          shader.fragmentShader = `
            uniform float dTime;
            uniform float aspect;
            uniform vec2 pointer;
            uniform float pointerDown;
            uniform float pointerRadius;
            uniform float pointerDuration;
            uniform sampler2D fbTexture;
            
            ${shader.fragmentShader}
          `.replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
            
            float duration = pointerDuration;
            
            float rVal = texture2D(fbTexture, vUv).r;
            
            rVal -= clamp(dTime / duration, 0., 0.1);
            rVal = clamp(rVal, 0., 1.);
            
            
            float f = 0.;
            // Assuming pointerDown is always active for this demo or controlled via props
            if (pointerDown > 0.5){
              vec2 uv = (vUv - 0.5) * 2. * vec2(aspect, 1.);
              vec2 mouse = pointer * vec2(aspect, 1.); // Fixed typo in logic (vec2(aspect, 1) -> 1.)
              
              f = 1. - smoothstep(pointerRadius * 0.1, pointerRadius, distance(uv, mouse));
            }
            rVal += f * 0.1;
            rVal = clamp(rVal, 0., 1.);
            diffuseColor.rgb = vec3(rVal);
            `
          );
        }
      })
    );
    this.rtScene.material.defines = { "USE_UV": "" };
    this.rtCamera = new THREE.Camera();
  }

  updatePointer(x: number, y: number) {
    this.uniforms.pointer.value.set(x, y);
  }

  resetPointer() {
    this.uniforms.pointer.value.setScalar(10);
  }

  render() {
    const currentRt = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.rtOutput);
    this.renderer.render(this.rtScene, this.rtCamera);
    // @ts-ignore - copyFramebufferToTexture exists in modern Three.js
    this.renderer.copyFramebufferToTexture(this.fbTexture.value);
    this.renderer.setRenderTarget(currentRt);
  }

  setSize(w: number, h: number) {
    this.rtOutput.setSize(w, h);
    if(this.fbTexture.value) {
        this.fbTexture.value.dispose();
    }
    this.fbTexture.value = new THREE.FramebufferTexture(w, h);
  }
}

interface ThreeSceneProps {
    onLoadComplete: () => void;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ onLoadComplete }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;

    // --- Setup ---
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF); // Match surface-1 (White)
    
    const camera = new THREE.PerspectiveCamera(30, width / height, 1, 100);
    camera.position.set(-1, 0, 0).setLength(15);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const gu: GlobalUniforms = {
      time: { value: 0 },
      dTime: { value: 0 },
      aspect: { value: width / height }
    };

    // --- Camera Controls ---
    const camShift = new THREE.Vector3(0, 1, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.object.position.add(camShift);
    controls.target.add(camShift);
    
    const light = new THREE.AmbientLight(0xffffff, Math.PI);
    scene.add(light);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // --- Blob ---
    const blob = new BlobEffect(renderer, width, height, gu);

    // --- Loading Assets ---
    const loader = new GLTFLoader();
    
    let isMounted = true;

    const loadAssets = async () => {
      try {
        // Load Head (LeePerrySmith)
        const headGltf = await loader.loadAsync("https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb");
        if (!isMounted) return;
        const head = headGltf.scene.children[0] as THREE.Mesh;
        head.geometry.rotateY(Math.PI * 0.01);
        
        // Use a Standard Material so it reacts to light and casts shadows/shading on white bg
        head.material = new THREE.MeshStandardMaterial({ 
             color: 0xE5E7EB, // Light gray for visibility against white
             roughness: 0.4,
             metalness: 0.1
        });
        scene.add(head);

        // Load Helmet (DamagedHelmet)
        const helmetGltf = await loader.loadAsync("https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf");
        if (!isMounted) return;
        const helmet = helmetGltf.scene.children[0] as THREE.Mesh;
        
        const helmetUniforms = {
          texBlob: { value: blob.rtOutput.texture }
        };

        helmet.material.onBeforeCompile = (shader) => {
          shader.uniforms.texBlob = helmetUniforms.texBlob;
          shader.vertexShader = `
            varying vec4 vPosProj;
            ${shader.vertexShader}
          `.replace(
            `#include <project_vertex>`,
            `#include <project_vertex>
              vPosProj = gl_Position;
            `
          );
          shader.fragmentShader = `
            uniform sampler2D texBlob;
            varying vec4 vPosProj;
            ${shader.fragmentShader}
          `.replace(
            `#include <clipping_planes_fragment>`,
            `
            vec2 blobUV = ((vPosProj.xy / vPosProj.w) + 1.) * 0.5;
            
            vec4 blobData = texture(texBlob, blobUV);
            
            if (blobData.r < 0.01) discard;
            //diffuseColor += blobData;
            
            #include <clipping_planes_fragment>
            `
          );
        };
        
        helmet.scale.setScalar(3.5);
        helmet.position.set(0, 1.5, 0.75);
        scene.add(helmet);

        // Helmet Wireframe Overlay
        const helmetWire = new THREE.Mesh(
          helmet.geometry.clone().rotateX(Math.PI * 0.5),
          new THREE.MeshBasicMaterial({
            color: 0x222222, // Darker gray for wireframe on light background
            wireframe: true, 
            transparent: true, 
            opacity: 0.15,
            onBeforeCompile: (shader) => {
              shader.uniforms.time = gu.time;
              shader.vertexShader = `
                varying float vYVal;
                ${shader.vertexShader}
              `.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                  vYVal = position.y;
                `
              );
              shader.fragmentShader = `
                uniform float time;
                varying float vYVal;
                ${shader.fragmentShader}
              `.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                
                  float y = fract(vYVal * 0.25 + time * 0.5);
                  float fY = smoothstep(0., 0.01, y) - smoothstep(0.02, 0.1, y);
                  
                  diffuseColor.a *= fY * 0.9 + 0.1;
                `
              );
            }
          })
        );
        helmetWire.scale.setScalar(3.5);
        helmetWire.position.set(0, 1.5, 0.75);
        scene.add(helmetWire);

        onLoadComplete();

      } catch (err) {
        console.error("Error loading models:", err);
      }
    };

    loadAssets();

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let t = 0;

    const animate = () => {
      const dt = clock.getDelta();
      t += dt;
      gu.time.value = t;
      gu.dTime.value = dt;
      
      controls.update();
      blob.render();
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // --- Event Listeners ---
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      gu.aspect.value = camera.aspect;
      blob.setSize(w, h);
    };

    const handlePointerMove = (event: PointerEvent) => {
        blob.updatePointer(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
    };

    const handlePointerLeave = () => {
        blob.resetPointer();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    // --- Cleanup ---
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
        if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
            mountRef.current.removeChild(renderer.domElement);
        }
      }
      renderer.setAnimationLoop(null);
      renderer.dispose();
    };
  }, [onLoadComplete]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full bg-surface-1" />;
};