# Class portraits

Drop AI-generated (or illustrated) class portraits here. The `Avatar` component
automatically renders `<instrument>.png` from this folder when present, and falls
back to the procedural SVG avatar when the file is missing.

Expected filenames (must match the instrument id exactly):

```
flute.png
clarinet.png
alto_sax.png
trumpet.png
trombone.png
euphonium.png
percussion.png
french_horn.png
tuba.png
oboe.png
bassoon.png
```

PNG with transparent background preferred, ~1024×1024 or larger (the app downscales).

See `docs/PORTRAIT_PROMPTS.md` for ready-to-use generation prompts per class.
