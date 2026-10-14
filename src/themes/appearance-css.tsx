import { useId, type ReactElement } from 'react';
import { MAX_APPEARANCE_CSS, scanThemeCss } from '../core/theme-package';

export interface AppearanceCss {
  /** Spread onto every resume root the component renders (the elements carrying themeClasses). */
  scope: { 'data-rs-css'?: string };
  /** Render once, anywhere in the component. */
  style: ReactElement | null;
}

/**
 * A resume's own stylesheet (appearance.css) for the pages one component renders. Like a theme's, it is
 * nested in a root selector, here an attribute unique to the component, so it reaches nothing else on the
 * screen. The <style> sits in the body, after every theme stylesheet in <head>, so its rules win over the
 * theme's rules of the same specificity.
 */
export function useAppearanceCss(css: string | undefined): AppearanceCss {
  const id = useId();
  // Saving rejects such a stylesheet, but an unsaved draft could still hold one; it must not load anything meanwhile.
  if (!css || scanThemeCss(css, 'appearance.css', MAX_APPEARANCE_CSS).length) return { scope: {}, style: null };
  return { scope: { 'data-rs-css': id }, style: <style>{`[data-rs-css="${id}"] {\n${css}\n}\n`}</style> };
}
