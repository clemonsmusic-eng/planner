# Class portraits — how the art pipeline works

The avatar system supports **hand-drawn / AI-generated class portraits** layered on
top of the original procedural SVG avatar, which now acts as a fallback.

## How it works

`<Avatar>` (`src/components/Avatar.tsx`) accepts an optional `instrument` prop:

```tsx
<Avatar appearance={character.appearance} instrument={character.instrument} size={64} />
```

- If `instrument` is set, the component renders `/portraits/<instrument>.png`.
- If that file is missing or fails to load, it **automatically falls back** to the
  procedural SVG portrait (no error, no code change needed).
- If `instrument` is omitted (e.g. the appearance customizer, teacher accounts),
  it always renders the procedural SVG.

So the rollout is incremental: add portrait files one at a time and they light up
across the app (character card, battle screen, leaderboard, teacher roster).

## Adding a portrait

1. Generate the image using the prompt for that class in
   [`PORTRAIT_PROMPTS.md`](./PORTRAIT_PROMPTS.md).
2. Crop to head-and-shoulders, export PNG (transparent background preferred,
   ~1024×1024 or larger).
3. Save it as `bandquest/public/portraits/<instrument>.png`.

Valid `<instrument>` ids:

```
flute  clarinet  alto_sax  trumpet  trombone  euphonium
percussion  french_horn  tuba  oboe  bassoon
```

That's it — reload the app and the portrait appears wherever that character shows up.

## Why this approach

Procedural SVG can produce clean stylized vector shapes, but it cannot reach the
shaded, contoured, realistically-structured faces (defined nose/lips/chin/jowls,
individual lashes, painterly lighting) the design calls for — the art direction
explicitly wants *"hand-drawn frames, not flat vectors."* AI-generated/illustrated
portraits deliver that quality, and this layer lets them drop in without rewiring
the app.
