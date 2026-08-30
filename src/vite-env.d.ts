/// <reference types="vite/client" />

interface ElectronAPI {
  platform: string;
  version: string;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  getSettingsDisk: () => Promise<any>;
  saveSettingsDisk: (settings: any) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
