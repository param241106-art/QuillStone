export const BASE = import.meta.env.BASE_URL;
/** The router's basename: the base path without its trailing slash ('/' at the domain root). */
export const BASENAME = BASE.replace(/\/$/, '') || '/';
export const LOGO = `${BASE}logo-mark.png`;
/** The hero logo's width in px, capped at 62% of the window (Layout's CFG.heroWidth). */
export const HERO_LOGO_WIDTH = 440;
/** logo-mark.png's height ÷ width (the file is 827 x 834). */
export const LOGO_AR = 834 / 827;
export const BG_TOTAL_FRAMES = 145;
export const bgFrameSrc = (i: number) =>
  `${BASE}quill-anim/frame_${String(i).padStart(3, '0')}.jpg`;

/** The route for a pathname under BASE, e.g. '/what-we-do' (always '/' for the home page). */
export const routeOf = (pathname: string) => {
  const path = `${pathname}/`.startsWith(BASE) ? '/' + `${pathname}/`.slice(BASE.length) : pathname;
  return path.replace(/\/+$/, '') || '/';
};
