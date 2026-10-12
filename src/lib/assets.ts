import logoUrl from '@/assets/logo-mark.webp';
import frames from 'virtual:bg-frames';

export const BASE = import.meta.env.BASE_URL;
/** The router's basename: the base path without its trailing slash ('/' at the domain root). */
export const BASENAME = BASE.replace(/\/$/, '') || '/';
/** The logo lockup (design/logo-mark.png as WebP), with a content-hashed file name. */
export const LOGO = logoUrl;
/** The hero logo's width in px, capped at 62% of the window (Layout's CFG.heroWidth). */
export const HERO_LOGO_WIDTH = 440;
/** logo-mark.webp's height ÷ width (the file is 827 x 834). */
export const LOGO_AR = 834 / 827;

// The scroll-scrubbed background: 145 frames in order, with content-hashed
// file names (see bgFrames() in vite.config.ts). Layout fetches them as the
// page needs them.
const FRAMES: string[] = frames;

export const BG_TOTAL_FRAMES = FRAMES.length;
/** Frame `i`, counting from 1. */
export const bgFrameSrc = (i: number) => FRAMES[i - 1];

/** The route for a pathname under BASE, e.g. '/what-we-do' (always '/' for the home page). */
export const routeOf = (pathname: string) => {
  const path = `${pathname}/`.startsWith(BASE) ? '/' + `${pathname}/`.slice(BASE.length) : pathname;
  return path.replace(/\/+$/, '') || '/';
};
