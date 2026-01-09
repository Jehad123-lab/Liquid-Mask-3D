import * as THREE from 'three';

export interface GlobalUniforms {
  time: { value: number };
  dTime: { value: number };
  aspect: { value: number };
}

export interface BlobUniforms {
  pointer: { value: THREE.Vector2 };
  pointerDown: { value: number };
  pointerRadius: { value: number };
  pointerDuration: { value: number };
}

export type BlobConfig = {
    renderer: THREE.WebGLRenderer;
    initialWidth: number;
    initialHeight: number;
    gu: GlobalUniforms;
}

export interface HelmetUniforms {
    texBlob: { value: THREE.Texture | null };
}