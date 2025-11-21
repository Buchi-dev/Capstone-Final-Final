declare module 'virtual:pwa-register' {
  export function registerSW(options?: Record<string, unknown>): {
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  }
}
