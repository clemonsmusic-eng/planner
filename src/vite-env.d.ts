/// <reference types="vite/client" />

/**
 * `?url` imports resolve to the built asset's URL. Vite ships types for this,
 * but only for its own virtual modules — an import from inside a dependency
 * needs declaring, and the PDF reader's worker is one.
 */
declare module '*?url' {
  const url: string;
  export default url;
}

/**
 * Both optional: a build without them runs the app entirely on the device, the
 * way it always has. The anon key is meant to be public — it identifies the
 * project, and row-level security is what protects the data behind it.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
