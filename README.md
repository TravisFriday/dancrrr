# dancrrr

A graph of the dance styles you're focusing on (Ndombolo, Amapiano, Azonto), plus the other styles that feed into them.

- Tap a style to see what it helps with, and the moves and concepts you want from it.
- Rate each move from 1 to 5. The ring around a style shows your overall progress.
- Filter by focus style with the chips at the top.
- The ⋯ menu lets you add a supporting style, save your map to a file, load one, or reset.

Your map and ratings are saved in the browser on each device for now. A Rust backend with a map per friend comes next.

## Develop

```sh
npm install
npm run dev
```

The starter map lives in `src/data/seed.json`. Pushing to `main` deploys to GitHub Pages.
