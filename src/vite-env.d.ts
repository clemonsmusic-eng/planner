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
