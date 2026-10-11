# UI baseline

`main/` is what every page looked like on the `main` branch before the move
to prerendered, path-based URLs: full-page screenshots of each route at
1440px and 390px wide, plus the position, size and computed styles of
headings, buttons, cards and form controls. Any change to the site should
leave these identical.

```sh
npm run build
node tests/ui-baseline/serve.mjs dist 4302                       # answers like GitHub Pages
npm run ui:capture -- http://localhost:4302 /tmp/after           # same shots of the new build
npm run ui:diff -- tests/ui-baseline/main /tmp/after /tmp/diff   # exits 1 on any difference
node tests/ui-baseline/check-routing.mjs http://localhost:4302   # hydration, redirects, links
```

The animated layers (background frames, dust, travelling logo) are hidden in
the shots and transitions are off, so two captures of the same build match
pixel for pixel. To recapture the baseline of an old hash-router build, pass
`hash` as the third argument to `capture.mjs`. Playwright needs its browser
once: `npx playwright install chromium`.
