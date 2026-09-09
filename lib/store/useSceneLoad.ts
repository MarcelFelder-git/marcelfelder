"use client";

import { create } from "zustand";

/**
 * Ladefortschritt der 3D-Szene, gemeldet an die Oberflaeche.
 *
 * ## Warum ueber einen Store und nicht direkt
 *
 * Drei bringt mit `useProgress` genau diese Zahl schon mit. Die
 * Boot-Sequenz koennte sie direkt lesen - aber `useProgress` kommt aus
 * `@react-three/drei`, und ein Import von dort zieht die gesamte
 * 3D-Kette in das Bundle, in dem die Boot-Sequenz liegt. Genau daran ist
 * das Haupt-Bundle schon einmal von 229 auf 465 kB gewachsen.
 *
 * Also meldet die Szene, die three ohnehin geladen hat, ihren Fortschritt
 * hierher, und die Oberflaeche liest nur noch eine Zahl. Dieses Modul
 * kennt three nicht.
 */
interface SceneLoadState {
  /** 0..1 ueber alle Texturen der Szene. */
  progress: number;
  /** Alles geladen. Vor dem ersten Ladevorgang false. */
  done: boolean;
  report: (progress: number, done: boolean) => void;
}

export const useSceneLoad = create<SceneLoadState>((set) => ({
  progress: 0,
  done: false,
  report: (progress, done) => set({ progress, done }),
}));
