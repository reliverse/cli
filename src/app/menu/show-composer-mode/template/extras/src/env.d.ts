/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_URL: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
