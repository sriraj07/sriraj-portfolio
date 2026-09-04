# Portfolio — Sriraj Rajkumar (2026)

Static site rebuilt from the Figma file **Portfolio - 2026**. Plain HTML/CSS/JS — no build step, no framework. Dark theme by default with a light-mode toggle.

```
index.html      markup + all content
styles.css      layout, type, dark/light themes
script.js       theme toggle + copy-email
assets/         project galleries + interest photos
.nojekyll       tells GitHub Pages to serve files as-is
```

## Preview locally

Open `index.html` directly, or run a local server (better for fonts/clipboard):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Hosting on GitHub Pages (free)

This is set up for a **user site** at `https://<username>.github.io/`.

1. Create a **public** repo named **exactly** `<your-username>.github.io`
   (e.g. `janedoe.github.io`). The name must match your username or it becomes a
   project site at a `/repo/` sub-path instead.
2. Push this folder to the repo's default branch:
   ```bash
   git remote add origin https://github.com/<username>/<username>.github.io.git
   git branch -M main
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment**
   → Source: **Deploy from a branch** → Branch: **main** / **/(root)** → **Save**.
4. Wait ~1–10 min. Site goes live at `https://<username>.github.io/`.

`.nojekyll` is already included so GitHub serves the raw files without Jekyll.

### Project site instead?
If you host this under an existing repo (e.g. `github.com/<username>/portfolio`),
the URL becomes `https://<username>.github.io/portfolio/`. All asset paths here
are **relative**, so it works at either location with no changes.

## Hero 3D scene (Spline)

The hero currently shows an animated CSS fallback. To use the real Spline scene:

1. Open the community scene and duplicate it to your account:
   https://app.spline.design/community/file/173ec89d-5781-4972-88dc-641e8e72ff35
2. In Spline: **Export → Viewer / Code** and copy the `.splinecode` URL.
3. In `index.html`, uncomment the two `spline-viewer` lines in the hero and paste
   your URL into the `url` attribute.

## Notes

- Project image galleries are rendered exports from the Figma design (they scroll
  horizontally on small screens). Swap the files in `assets/` to update them, or
  ask to rebuild them as fully interactive carousels.
- Contact email and social links: update in `index.html` (`#contact` footer).
