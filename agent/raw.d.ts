// Text imports (`file?raw`): Vite and Vitest support them natively; scripts/build-agent.mjs adds the same for esbuild.
declare module '*?raw' {
  const content: string;
  export default content;
}
