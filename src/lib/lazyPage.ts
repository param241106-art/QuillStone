import { createElement, lazy, useState, type ComponentType } from 'react';

export type LazyPage = ComponentType & {
  /** Fetches the page's code; later renders then show it straight away. */
  preload: () => Promise<void>;
};

/**
 * A page component whose code is split into its own chunk, like React.lazy,
 * plus preload(). A page whose code is already loaded when it mounts renders
 * directly, with no Suspense pause: that is what lets the prerender
 * (entry-server.tsx) write the full page, and lets the browser hydrate that
 * HTML in one pass (main.tsx preloads the current page before hydrating).
 */
export function lazyPage(load: () => Promise<ComponentType>): LazyPage {
  let Loaded: ComponentType | null = null;
  let pending: Promise<void> | null = null;
  const preload = () =>
    (pending ??= load().then((C) => {
      Loaded = C;
    }));
  const Lazy = lazy(() => preload().then(() => ({ default: Loaded! })));

  function Page() {
    // decided once per mount: switching from Lazy to Loaded later would
    // remount the page and replay its reveal animations
    const [ready] = useState(() => Loaded !== null);
    return ready ? createElement(Loaded!) : createElement(Lazy);
  }
  return Object.assign(Page, { preload });
}
