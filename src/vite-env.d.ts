/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API host, or `/api` for same-origin proxy. Empty uses `/api`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
