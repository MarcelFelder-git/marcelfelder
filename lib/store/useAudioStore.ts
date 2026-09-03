"use client";

import { create } from "zustand";
import { audioEngine, DEFAULT_PARAMS, type ParamKey } from "@/lib/audio/engine";

interface AudioState {
  isRunning: boolean;
  params: Record<ParamKey, number>;
  toggle: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  setParam: (key: ParamKey, value: number) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isRunning: false,
  params: { ...DEFAULT_PARAMS },

  start: async () => {
    await audioEngine.start();
    set({ isRunning: true });
  },
  stop: async () => {
    await audioEngine.stop();
    set({ isRunning: false });
  },
  toggle: async () => {
    await (get().isRunning ? get().stop() : get().start());
  },
  setParam: (key, value) => {
    audioEngine.setParam(key, value);
    set((s) => ({ params: { ...s.params, [key]: value } }));
  },
}));

export const FADERS: {
  key: ParamKey;
  label: string;
  unit: string;
  format: (v: number) => string;
}[] = [
  {
    key: "level",
    label: "Level",
    unit: "dB",
    format: (v) => (v <= 0.001 ? "-inf" : `${(20 * Math.log10(v)).toFixed(1)}`),
  },
  {
    key: "cutoff",
    label: "Cutoff",
    unit: "Hz",
    format: (v) => {
      const hz = 120 * Math.pow(2, v * 7);
      return hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${hz.toFixed(0)}`;
    },
  },
  { key: "resonance", label: "Reso", unit: "Q", format: (v) => (0.7 + v * 14).toFixed(1) },
  { key: "drift", label: "Drift", unit: "ct", format: (v) => `${(v * 22).toFixed(0)}` },
  { key: "space", label: "Space", unit: "%", format: (v) => `${(v * 100).toFixed(0)}` },
];
