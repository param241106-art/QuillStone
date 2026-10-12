# Performance checks

```sh
npm run build
node tests/ui-baseline/serve.mjs dist 4402                          # answers like GitHub Pages
node tests/perf/measure.mjs dist http://localhost:4402 /tmp/m.json  # sizes, requests, FCP, load
node tests/perf/compare-layers.mjs <old url> <new url> /tmp/layers  # background, logo, reduced motion
```

`measure.mjs` reports the build's JS/CSS/HTML (with gzip), image and font
weight, and for `/` and `/contact` at 1440px and 390px: first contentful
paint and load time (median of three runs), the requests made before the
load event, and all requests once the background frames have streamed in.

`compare-layers.mjs` covers what the UI baseline hides: the scroll-scrubbed
background at several scroll positions, the hero logo, and the background
with reduced motion, compared pixel by pixel between two builds.

The image and font sources are reproducible with `scripts/convert-images.mjs`
and `scripts/self-host-fonts.mjs`.
