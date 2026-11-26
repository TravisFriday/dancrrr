# dancrrr

A graph of the dance styles you're focusing on (Ndombolo, Amapiano, Azonto), plus the other styles that feed into them.

- Tap a style to see what it helps with, and the moves and concepts you want from it.
- Rate each move from 1 to 5. The ring around a style shows your overall progress.
- Filter by focus style with the chips at the top.
- Open a supporting style to connect or disconnect it from any focus style, and say what it builds.
- "Add style" adds a new supporting style. The ⋯ menu saves your map to a file, loads one, or resets.
- Built with Google's Material 3 web components (@material/web), Roboto and Material Symbols. Follows your device's light or dark mode.

Your map and ratings are saved in the browser on each device for now. A Rust backend with a map per friend comes next.

## Develop

```sh
npm install
npm run dev
```

The starter map lives in `src/data/seed.json`. Pushing to `main` deploys to GitHub Pages.

## Colours

`src/m3-tokens.css` is generated from a seed colour with Google's material-color-utilities. To change the seed or the focus style colours, edit `scripts/gen-theme.mjs` and run `npm run theme`.
