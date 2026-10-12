import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BASE, HERO_LOGO_WIDTH, LOGO, LOGO_AR, BG_TOTAL_FRAMES, bgFrameSrc } from '@/lib/assets';
import { trackPageview } from '@/lib/analytics';
import { applyHead } from '@/seo/meta';
import { SITE, hasWhatsApp, whatsappHref } from '@/config/site';
import { ContactLinks } from '@/components/ContactLinks';
import { QuoteForm } from '@/components/QuoteForm';
import { CookieNotice } from '@/components/CookieNotice';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/what-we-do', label: 'What we do' },
  { to: '/our-work', label: 'Our work' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/contact', label: 'Contact' },
];

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);

/** Everything keyboard-focusable inside `root`, in DOM order. */
const focusablesIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'));

/* ============================================================
   TUNING — everything you'd want to change lives here
   ============================================================ */
const CFG = {
  heroWidth: HERO_LOGO_WIDTH,
  markWidth: 880,
  markOpacity: 0.075,
  markBlur: 1.1,
  markDrift: 38,
  markSpin: 1.8,
  markBreathe: 0.035,
  markPulse: 0.28,
  handoff: 0.62,
  dust: 340,
  dustMobile: 140,
  gather: 0.66,
  orbitMin: 0.42,
  orbitMax: 1.35,
  scrollPush: 0.6,
  streak: 1.0,
  repel: 120,
};

type LogoState = { x: number; y: number; w: number; pull: number };

const on = (
  cleanups: Array<() => void>,
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  opts?: AddEventListenerOptions,
) => {
  target.addEventListener(type, handler, opts);
  cleanups.push(() => target.removeEventListener(type, handler, opts));
};

/**
 * Persistent site chrome: the frame-sequence background, the dust field,
 * the travelling hero logo, nav, and footer. Mounted once by the router
 * and never torn down, so these effects survive page navigation — only
 * the routed page content underneath (via <Outlet/>) swaps out.
 */
export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const logoStateRef = useRef<LogoState>({ x: 0, y: 0, w: 0, pull: 0 });
  const anchorRefreshRef = useRef<() => void>(() => {});
  const [menuOpen, setMenuOpen] = useState(false);
  // the travelling logo stays hidden until its effect has placed it once, so
  // the prerendered page never shows it unpositioned in the top-left corner
  const [logoPlaced, setLogoPlaced] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  /* ---------- background + dust + nav scroll class: set up once ---------- */
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    let disposed = false;

    /* the frame-sequence background */
    (function () {
      const cv = document.getElementById('bgframes') as HTMLCanvasElement | null;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) return;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

      const images: (HTMLImageElement | null)[] = new Array(BG_TOTAL_FRAMES + 1).fill(null);
      const loaded: boolean[] = new Array(BG_TOTAL_FRAMES + 1).fill(false);
      // restarts the drawing loop below once it has gone idle
      let wake = () => {};
      const loadFrame = (i: number) => {
        if (images[i]) return;
        const img = new Image();
        img.decoding = 'async';
        img.src = bgFrameSrc(i);
        img.onload = () => {
          loaded[i] = true;
          wake();
        };
        images[i] = img;
      };
      // Load the first screenful now; stream the rest in during idle time,
      // once the page has finished loading, so 145 requests don't compete
      // with the page itself or all land on the main thread/network at once.
      if (!reduce) for (let i = 1; i <= Math.min(12, BG_TOTAL_FRAMES); i++) loadFrame(i);
      let streamNext = reduce ? BG_TOTAL_FRAMES + 1 : 13;
      const idle: (cb: () => void) => number =
        (window as unknown as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback ||
        ((cb: () => void) => window.setTimeout(cb, 120));
      const streamRest = () => {
        if (disposed || streamNext > BG_TOTAL_FRAMES) return;
        const end = Math.min(streamNext + 4, BG_TOTAL_FRAMES);
        for (let i = streamNext; i <= end; i++) loadFrame(i);
        streamNext = end + 1;
        idle(streamRest);
      };
      if (document.readyState === 'complete') idle(streamRest);
      else on(cleanups, window, 'load', () => idle(streamRest), { once: true } as AddEventListenerOptions);

      const nearestLoadedFrame = (target: number) => {
        const t = Math.round(target);
        for (let d = 0; d <= BG_TOTAL_FRAMES; d++) {
          const lo = t - d;
          const hi = t + d;
          if (lo >= 1 && loaded[lo]) return lo;
          if (hi <= BG_TOTAL_FRAMES && loaded[hi]) return hi;
        }
        return null;
      };

      let width = innerWidth;
      let height = innerHeight;

      /* the source frames are 848x480 on black; letterbox them into a
         buffer at their native aspect, then feather the edges with a
         radial mask so the rectangle blends into the page. */
      const AR = 480 / 848;
      const bufW = 640;
      const bufH = Math.round(bufW * AR);
      const buffer = document.createElement('canvas');
      buffer.width = bufW;
      buffer.height = bufH;
      const bctx = buffer.getContext('2d')!;

      const mask = document.createElement('canvas');
      mask.width = bufW;
      mask.height = bufH;
      const mctx = mask.getContext('2d')!;
      const g = mctx.createRadialGradient(bufW / 2, bufH / 2, bufH * 0.16, bufW / 2, bufH / 2, bufH * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, bufW, bufH);

      const resize = () => {
        width = innerWidth;
        height = innerHeight;
        // this layer is soft-edged and low-alpha, so full retina density
        // buys nothing visible — cap it to keep the pixel count down.
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        cv!.width = width * dpr;
        cv!.height = height * dpr;
        cv!.style.width = width + 'px';
        cv!.style.height = height + 'px';
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      let rrt: number;
      const onResize = () => {
        clearTimeout(rrt);
        rrt = window.setTimeout(resize, 150);
      };
      on(cleanups, window, 'resize', onResize, { passive: true });

      const getMaxScroll = () =>
        Math.max(1, document.documentElement.scrollHeight - innerHeight);
      let maxScroll = getMaxScroll();
      const ro = new ResizeObserver(() => {
        maxScroll = getMaxScroll();
      });
      ro.observe(document.documentElement);
      cleanups.push(() => ro.disconnect());

      let targetFrame = 1;
      const onScroll = () => {
        const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
        targetFrame = 1 + progress * (BG_TOTAL_FRAMES - 1);
        wake();
      };
      on(cleanups, window, 'scroll', onScroll, { passive: true });
      onScroll();

      const drawFrame = (frameIndex: number) => {
        const img = images[frameIndex];
        if (!img) return;
        ctx!.clearRect(0, 0, width, height);

        bctx.clearRect(0, 0, bufW, bufH);
        const scale = Math.min(bufW / img.naturalWidth, bufH / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        bctx.drawImage(img, (bufW - dw) / 2, (bufH - dh) / 2, dw, dh);
        bctx.globalCompositeOperation = 'destination-in';
        bctx.drawImage(mask, 0, 0);
        bctx.globalCompositeOperation = 'source-over';

        const w = Math.min(1100, Math.max(480, width * 0.78));
        const h = w * AR;
        ctx!.globalAlpha = 0.42;
        ctx!.drawImage(buffer, (width - w) / 2, (height - h) / 2, w, h);
        ctx!.globalAlpha = 1;
      };

      if (reduce) {
        // only the final frame is ever shown, so load just that one
        loadFrame(BG_TOTAL_FRAMES);
        const img = images[BG_TOTAL_FRAMES]!;
        const draw = () => drawFrame(BG_TOTAL_FRAMES);
        if (img.complete) draw();
        else on(cleanups, img, 'load', draw, { once: true } as AddEventListenerOptions);
        return;
      }

      let raf = 0;
      let running = true;
      let currentFrame = 1;
      let lastDrawn = -1;

      const tick = () => {
        raf = 0;
        if (!running) return;
        currentFrame += (targetFrame - currentFrame) * 0.09;
        if (Math.abs(currentFrame - targetFrame) < 0.05) currentFrame = targetFrame;

        const frameToShow = nearestLoadedFrame(currentFrame);
        if (frameToShow !== null && frameToShow !== lastDrawn) {
          drawFrame(frameToShow);
          lastDrawn = frameToShow;
        }
        // Once the frame has caught up with the scroll position nothing can
        // change until the page scrolls or another frame finishes loading,
        // and both of those wake the loop again, so stop asking for frames.
        if (currentFrame !== targetFrame) raf = requestAnimationFrame(tick);
      };
      wake = () => {
        if (!disposed && running && !raf) raf = requestAnimationFrame(tick);
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          running = false;
          cancelAnimationFrame(raf);
          raf = 0;
        } else if (!running) {
          running = true;
          wake();
        }
      };
      on(cleanups, document, 'visibilitychange', onVisibility);

      raf = requestAnimationFrame(tick);
      cleanups.push(() => cancelAnimationFrame(raf));
    })();

    /* the dust */
    (function () {
      const cv = document.getElementById('dust') as HTMLCanvasElement | null;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) return;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let W = 0,
        H = 0;
      let P: Array<{
        x: number; y: number; z: number; a: number; rr: number; sp: number; ph: number; w: number; hot: boolean;
        // fixed per particle, so worked out once in build() rather than every frame
        size: number; fill: string; trail: string;
      }> = [];
      let lastY = scrollY,
        vel = 0;
      const mouse = { x: -9e9, y: -9e9 };
      let raf = 0;

      function resize() {
        // hundreds of tiny particles redraw every frame forever, not just
        // while scrolling, so this canvas's pixel count matters a lot more
        // than a one-shot layer's; cap it below full retina density.
        const DPR = Math.min(devicePixelRatio || 1, 1.5);
        W = innerWidth;
        H = innerHeight;
        cv!.width = W * DPR;
        cv!.height = H * DPR;
        ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      function build() {
        const n = innerWidth < 780 ? CFG.dustMobile : CFG.dust;
        P = [];
        for (let i = 0; i < n; i++)
          P.push({
            x: Math.random() * W,
            y: Math.random() * H,
            z: 0.3 + Math.random() * 0.7,
            a: Math.random() * Math.PI * 2,
            rr: CFG.orbitMin + Math.random() * (CFG.orbitMax - CFG.orbitMin),
            sp: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.1),
            ph: Math.random() * Math.PI * 2,
            w: 0.2 + Math.random() * 0.8,
            hot: Math.random() < 0.09,
            size: 0,
            fill: '',
            trail: '',
          });
        for (const p of P) {
          const alpha = (0.14 + p.z * 0.5) * (p.hot ? 1.5 : 1);
          p.size = 1.4 * p.z * (p.hot ? 1.7 : 1);
          p.fill = p.hot
            ? 'rgba(240,224,189,' + alpha.toFixed(3) + ')'
            : 'rgba(224,203,158,' + alpha.toFixed(3) + ')';
          p.trail = 'rgba(203,176,120,' + (alpha * 0.8).toFixed(3) + ')';
        }
      }

      /* the travelling logo (when active, home page only) is the primary
         attractor; the monogram/footer mark takes over when it's centred.
         The candidate elements are static once mounted per page, so the
         query runs once here rather than on every animation frame — see
         the pathname-keyed effect below, which refreshes it on navigation. */
      let anchorEls: HTMLElement[] = Array.from(document.querySelectorAll<HTMLElement>('[data-dust-anchor]'));
      function anchor() {
        const L = logoStateRef.current;
        let best = { x: L.x, y: L.y, w: Math.min(L.w, 430), pull: L.pull };
        let bestP = 0;
        anchorEls.forEach((m) => {
          const r = m.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= H) return;
          const cy = r.top + r.height / 2;
          const p = Math.max(0, 1 - Math.abs(cy - H * 0.5) / (H * 0.55));
          if (p > 0.25 && p > bestP) {
            bestP = p;
            best = { x: r.left + r.width / 2, y: cy, w: r.width * 2.1, pull: p };
          }
        });
        return best;
      }
      anchorRefreshRef.current = () => {
        anchorEls = Array.from(document.querySelectorAll<HTMLElement>('[data-dust-anchor]'));
      };
      cleanups.push(() => {
        anchorRefreshRef.current = () => {};
      });

      const t0 = performance.now();
      function frame(now: number) {
        raf = 0;
        if (disposed || hidden) return;
        const t = now - t0,
          y = scrollY;
        let d = y - lastY;
        lastY = y;
        if (Math.abs(d) > 220) d = 0;
        vel += (d - vel) * 0.22;

        ctx!.clearRect(0, 0, W, H);
        const A = reduce ? null : anchor();
        const streak = Math.min(Math.abs(vel) * CFG.streak, 30);
        ctx!.globalCompositeOperation = 'lighter';

        for (const p of P) {
          p.y -= vel * CFG.scrollPush * p.z;
          p.x += Math.sin(t * 0.00013 + p.ph) * 0.18 * p.z;
          p.y += Math.cos(t * 0.0001 + p.ph * 1.4) * 0.12 * p.z;
          if (p.y < -70) p.y = H + 70;
          else if (p.y > H + 70) p.y = -70;
          if (p.x < -70) p.x = W + 70;
          else if (p.x > W + 70) p.x = -70;

          let x = p.x,
            yy = p.y;

          if (A && A.pull > 0.02) {
            p.a += 0.0022 * p.sp;
            const R = A.w * p.rr;
            const ox = A.x + Math.cos(p.a) * R;
            const oy = A.y + Math.sin(p.a) * R * 0.72;
            const k = CFG.gather * A.pull * p.w;
            x = p.x + (ox - p.x) * k;
            yy = p.y + (oy - p.y) * k;
          }

          const dx = x - mouse.x,
            dy = yy - mouse.y,
            d2 = dx * dx + dy * dy,
            R = CFG.repel;
          if (d2 < R * R) {
            const dd = Math.sqrt(d2) || 0.001,
              f = 1 - dd / R;
            x += (dx / dd) * f * f * 26;
            yy += (dy / dd) * f * f * 26;
          }

          const size = p.size;
          if (streak > 1.3) {
            // A thin filled rect reads identically to a capped line at this
            // size but skips path construction + stroking, which is what
            // made fast scrolling (streak active on ~every particle) heavy.
            const len = vel > 0 ? -streak * p.z : streak * p.z;
            ctx!.fillStyle = p.trail;
            ctx!.fillRect(x - size / 2, len < 0 ? yy + len : yy, size, Math.abs(len));
          } else {
            ctx!.fillStyle = p.fill;
            ctx!.fillRect(x - size / 2, yy - size / 2, size, size);
          }
        }
        ctx!.globalCompositeOperation = 'source-over';
        raf = requestAnimationFrame(frame);
      }

      const onMove = (e: PointerEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      };
      const onLeave = () => {
        mouse.x = mouse.y = -9e9;
      };
      on(cleanups, window, 'pointermove', onMove as EventListener, { passive: true });
      on(cleanups, window, 'pointerleave', onLeave);

      let rt: number;
      const onResize = () => {
        clearTimeout(rt);
        rt = window.setTimeout(() => {
          resize();
          build();
        }, 160);
      };
      on(cleanups, window, 'resize', onResize, { passive: true });

      // stop drawing while the tab is hidden, and pick up where it left off
      let hidden = document.visibilityState === 'hidden';
      on(cleanups, document, 'visibilitychange', () => {
        hidden = document.visibilityState === 'hidden';
        if (hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else if (!raf) {
          raf = requestAnimationFrame(frame);
        }
      });

      resize();
      build();
      raf = requestAnimationFrame(frame);
      cleanups.push(() => cancelAnimationFrame(raf));
    })();

    /* nav scroll class */
    (function () {
      const nav = document.getElementById('nav');
      if (!nav) return;
      const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
      onScroll();
      on(cleanups, window, 'scroll', onScroll, { passive: true });
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  /* ---------- the travelling hero logo: only meaningful on the home
     page, so it (re)starts each time navigation lands on "/" and stops
     cleanly otherwise ---------- */
  useEffect(() => {
    if (!isHome) {
      logoStateRef.current = { x: 0, y: 0, w: 0, pull: 0 };
      return;
    }

    const cleanups: Array<() => void> = [];
    let disposed = false;

    const flier = document.getElementById('flier') as HTMLElement | null;
    const inner = document.getElementById('flierIn') as HTMLElement | null;
    const img = document.getElementById('flierImg') as HTMLImageElement | null;
    const space = document.getElementById('logoSpace') as HTMLElement | null;
    const hero = document.querySelector<HTMLElement>('.hero');
    if (!flier || !inner || !img || !space || !hero) return;

    const aura = inner.querySelector<HTMLElement>('.aura')!;
    const rings = inner.querySelectorAll<HTMLElement>('.ring');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // the lockup's height ÷ width; checked again once the real image reports its size
    let AR = LOGO_AR;
    let base = CFG.heroWidth;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    let placed = false;
    let raf = 0;

    function layout() {
      base = Math.min(CFG.heroWidth, innerWidth * 0.62);
      inner!.style.width = base + 'px';
      inner!.style.height = base * AR + 'px';
      space!.style.height = base * AR + 'px';
    }

    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function frame() {
      if (disposed) return;
      const y = scrollY;
      const heroH = hero!.offsetHeight || innerHeight;

      /* 0 = full lockup in the hero, 1 = faint watermark behind the page */
      let t = Math.min(1, Math.max(0, y / (heroH * CFG.handoff)));
      t = ease(t);

      /* where it starts: the reserved slot in the hero */
      const r = space!.getBoundingClientRect();
      const hx = r.left + r.width / 2;
      const hy = r.top + r.height / 2;

      /* where it ends up: adrift in the middle of the viewport, never quite still */
      const now = performance.now();
      const markW = Math.min(CFG.markWidth, innerWidth * 0.96);
      const D = reduce ? 0 : CFG.markDrift;
      const wx =
        innerWidth / 2 +
        Math.sin(now * 0.000073) * D +
        Math.sin(now * 0.000041 + 1.7) * D * 0.45;
      const wy =
        innerHeight / 2 +
        Math.cos(now * 0.000056) * D * 0.72 +
        Math.sin(y * 0.0006) * 18;

      let cx = lerp(hx, wx, t);
      let cy = lerp(hy, wy, t);
      const w = lerp(base, markW, t);

      /* a little parallax while it's still the hero */
      if (!reduce) {
        mx += (tmx - mx) * 0.06;
        my += (tmy - my) * 0.06;
        const k = (1 - t) * (1 - t);
        cx += mx * 14 * k;
        cy += my * 10 * k;
      }

      /* tilt and breath — only once it's a watermark, so the hero stays composed */
      const spin = reduce ? 0 : Math.sin(now * 0.000061) * CFG.markSpin * t;
      const swell = reduce ? 1 : 1 + Math.sin(now * 0.00011 + 0.9) * CFG.markBreathe * t;

      const s = (w / base) * swell;
      flier!.style.transform =
        'translate3d(' + (cx - base / 2) + 'px,' + (cy - (base * AR) / 2) + 'px,0)' +
        ' rotate(' + spin.toFixed(3) + 'deg)' +
        ' scale(' + s.toFixed(4) + ')';

      let op = lerp(1, CFG.markOpacity, t);
      if (!reduce) op *= 1 + Math.sin(now * 0.000094 + 2.2) * CFG.markPulse * t;
      inner!.style.opacity = op.toFixed(3);
      inner!.style.filter =
        t > 0.02
          ? 'blur(' + (CFG.markBlur * t).toFixed(2) + 'px)'
          : 'drop-shadow(0 0 34px rgba(203,176,120,.28))';

      /* the halo belongs to the hero, not the watermark */
      const fade = Math.max(0, 1 - t * 1.6);
      aura.style.opacity = (0.35 + fade * 0.65).toFixed(3);
      rings.forEach((el) => (el.style.opacity = fade.toFixed(3)));

      logoStateRef.current = { x: cx, y: cy, w, pull: 1 };
      if (!placed) {
        placed = true;
        setLogoPlaced(true);
      }
      raf = requestAnimationFrame(frame);
    }

    const onPointerMove = (e: PointerEvent) => {
      tmx = (e.clientX / innerWidth - 0.5) * 2;
      tmy = (e.clientY / innerHeight - 0.5) * 2;
    };
    on(cleanups, window, 'pointermove', onPointerMove as EventListener, { passive: true });

    let rt: number;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(layout, 140);
    };
    on(cleanups, window, 'resize', onResize, { passive: true });

    const applyAR = () => {
      if (img!.naturalWidth && img!.naturalHeight) {
        AR = img!.naturalHeight / img!.naturalWidth;
      }
    };

    layout();
    if (img.complete) {
      applyAR();
      layout();
      raf = requestAnimationFrame(frame);
    } else {
      const onLoad = () => {
        applyAR();
        layout();
        raf = requestAnimationFrame(frame);
      };
      on(cleanups, img, 'load', onLoad, { once: true } as AddEventListenerOptions);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      logoStateRef.current = { x: 0, y: 0, w: 0, pull: 0 };
    };
  }, [isHome]);

  /* ---------- refresh the dust field's anchor points, the page's <head>
     tags and the scroll position on every navigation ---------- */
  useEffect(() => {
    anchorRefreshRef.current();
    applyHead(location.pathname);
    if (!location.search.includes('scroll=')) window.scrollTo(0, 0);
    trackPageview();
  }, [location.pathname, location.search]);

  /* ---------- plain <a href="/…"> links in the pages' raw HTML (hero,
     What we do) navigate inside the app like <Link>s, so the background
     effects above aren't torn down by a full page load. <Link> handles
     its own clicks first and marks them defaultPrevented. ---------- */
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest('a');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      if (a.getAttribute('href')?.startsWith('#')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !`${url.pathname}/`.startsWith(BASE)) return;
      e.preventDefault();
      navigate('/' + `${url.pathname}/`.slice(BASE.length).replace(/\/$/, '') + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  /* ---------- mobile menu (below 900px) ---------- */
  const menuOpenRef = useRef(false);
  const focusMainOnCloseRef = useRef(false);

  // close on every navigation, including a link to the page you're already on,
  // and hand focus to the new page rather than leaving it on a hidden link
  // (done in the menu effect's cleanup, once <main> is no longer inert)
  useEffect(() => {
    if (!menuOpenRef.current) return;
    focusMainOnCloseRef.current = true;
    setMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    const menu = menuRef.current;
    const btn = menuBtnRef.current;
    const main = mainRef.current;
    if (!menuOpen || !menu || !btn) return;
    menuOpenRef.current = true;

    // lock page scroll and make everything behind the menu inert
    const root = document.documentElement;
    root.classList.add('menu-open');
    const behind = Array.from(
      document.querySelectorAll<HTMLElement>('main, footer, .wa-float, .cookie-notice'),
    );
    behind.forEach((el) => el.setAttribute('inert', ''));
    focusablesIn(menu)[0]?.focus();

    // keep Tab cycling between the toggle button and the menu's own links
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        btn.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [btn, ...focusablesIn(menu)];
      const i = items.indexOf(document.activeElement as HTMLElement);
      const last = items.length - 1;
      if (i === -1 || (e.shiftKey && i === 0) || (!e.shiftKey && i === last)) {
        e.preventDefault();
        items[e.shiftKey ? last : 0].focus();
      }
    };
    document.addEventListener('keydown', onKey);

    // the menu only exists on narrow screens; widening the window closes it
    const wide = matchMedia('(min-width: 901px)');
    const onWide = () => {
      if (wide.matches) setMenuOpen(false);
    };
    wide.addEventListener('change', onWide);

    return () => {
      menuOpenRef.current = false;
      root.classList.remove('menu-open');
      behind.forEach((el) => el.removeAttribute('inert'));
      if (focusMainOnCloseRef.current) {
        focusMainOnCloseRef.current = false;
        main?.focus({ preventScroll: true });
      }
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [menuOpen]);

  return (
    <>
      <canvas id="bgframes" aria-hidden="true"></canvas>
      <canvas id="dust" aria-hidden="true"></canvas>

      {/* the logo lives here, above the page, and travels — home only */}
      <div className={`stage${isHome && logoPlaced ? ' active' : ''}`} aria-hidden="true">
        <div className="flier" id="flier">
          <div className="flier-in" id="flierIn">
            <div className="aura"></div>
            <div className="ring"></div>
            <div className="ring two"></div>
            <div className="sheen"></div>
            <img id="flierImg" src={LOGO} alt="" width={827} height={834} />
          </div>
        </div>
      </div>

      <nav id="nav" aria-label="Main">
        <Link className="brand" to="/" aria-label="Quillstones home">
          <img className="nav-mono" src={LOGO} alt="Quillstones" width={827} height={834} />
        </Link>
        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-actions">
          <ContactLinks className="nav-contact" />
          <Link to="/contact" className="pill">
            Get in touch
          </Link>
          <button
            ref={menuBtnRef}
            type="button"
            className={'menu-btn' + (menuOpen ? ' is-open' : '')}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-icon" aria-hidden="true"></span>
          </button>
        </div>

        {/* narrow screens only (see .mobile-menu in index.css) */}
        <div
          id="site-menu"
          ref={menuRef}
          className={'mobile-menu' + (menuOpen ? ' is-open' : '')}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <ul className="mobile-menu-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <Link to="/contact" className="pill mobile-menu-cta">
            Get in touch
          </Link>
          <ContactLinks className="mobile-menu-contact" withEmail />
        </div>
      </nav>

      <main id="main" ref={mainRef} tabIndex={-1}>
        {/* Navigation runs in a React transition, so while a page's code is
            still loading the current page stays on screen; the fallback only
            shows on a first render with nothing to keep (e.g. `vite dev`). */}
        <Suspense fallback={<div style={{ minHeight: '100vh' }} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <img className="foot-logo" data-dust-anchor src={LOGO} alt="Quillstones" width={827} height={834} />
              <p>
                Our mission is to help every author publish a book they’re proud of — and put it in
                readers’ hands around the world.
              </p>
              <a className="email" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
              <ContactLinks className="foot-contact" />
              {SITE.address.length > 0 && (
                <address className="foot-address">
                  {SITE.address.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              )}
              {SITE.social.length > 0 && (
                <ul className="foot-social">
                  {SITE.social.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.label}
                        <span className="visually-hidden"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <nav className="foot-links" aria-label="Footer">
              {NAV_ITEMS.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="foot-quote">
              <QuoteForm
                placement="footer"
                layout="stacked"
                title={
                  <>
                    Ready to <em>publish?</em>
                  </>
                }
                intro="Get a free, no-obligation quote."
              />
            </div>
          </div>
          <div className="foot-bottom">
            <p>© 2026 Quillstones. All rights reserved.</p>
            <p className="set">Set in Playfair Display &amp; Inter.</p>
          </div>
        </div>
      </footer>

      {hasWhatsApp && (
        <a
          className="wa-float"
          href={whatsappHref()}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="WhatsApp button"
          aria-label="Chat with us on WhatsApp (opens in a new tab)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              className="wa-bubble"
              d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6z"
            />
            <path
              className="wa-phone"
              transform="translate(6.6 6.6) scale(.45)"
              d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            />
          </svg>
        </a>
      )}

      <CookieNotice />
    </>
  );
}
