# Shariq Hafizi — personal website

A single-page personal site. Plain HTML, CSS and JavaScript: **no build step, no
dependencies, no framework**. Open `index.html` in a browser and what you see is
exactly what ships.

```
index.html          the whole page — all the copy lives here
assets/styles.css   all styling; every colour is a variable at the top
assets/main.js      theme toggle, scroll reveal, footer year
.nojekyll           tells GitHub Pages to serve the files as-is
```

---

## Editing the content

Everything you'd want to change is in `index.html`, marked with
`<!-- EDIT ME -->` comments. The spots that still need your input:

| Where | What to put there |
|---|---|
| `<title>` + `<meta name="description">` | How the page shows up in Google and link previews |
| Hero heading and intro paragraph | Your one-line pitch and two or three sentences |
| LinkedIn link in `.socials` | Currently `#` — replace with your profile URL |
| Project cards two and three | Real projects, or delete the `<article>` blocks |
| "Outside of that" line in About | One honest personal sentence |
| `Now` list | Keep this current — a stale "now" reads worse than none |
| `resume.pdf` | Drop the file in this folder, or delete the Résumé button |

To add a project, copy a whole `<article class="card reveal">…</article>` block.

### Changing the colours

Every colour is a CSS variable at the top of `assets/styles.css`. Change
`--accent` in both the light block (`:root`) and the two dark blocks and the
entire site follows. Nothing else needs touching.

---

## Previewing locally

```bash
cd ~/code/shariq-personal-website
python3 -m http.server 8080
```

Then open <http://localhost:8080>. (Opening `index.html` directly with
`file://` mostly works too, but a local server matches production exactly.)

---

## Publishing

The site is hosted on **GitHub Pages**, served straight from the `main` branch.

1. Push to `main`.
2. In the repo: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **`main`**, folder: **`/ (root)`**
3. Wait about a minute. The first deploy is the slowest.

Every later `git push` redeploys automatically.

### Custom domain

Once you're ready to point your domain at the site:

1. Repo **Settings → Pages → Custom domain** → enter the domain → **Save**.
   GitHub commits a `CNAME` file to the repo for you.
2. At your domain registrar, add these DNS records:

   **For the apex domain** (`yourdomain.com`) — four `A` records:

   ```
   A   @   185.199.108.153
   A   @   185.199.109.153
   A   @   185.199.110.153
   A   @   185.199.111.153
   ```

   **For `www`** — one `CNAME` record:

   ```
   CNAME   www   <your-github-username>.github.io
   ```

3. Back in Settings → Pages, tick **Enforce HTTPS** once the certificate is
   issued. That can take up to a few hours after DNS resolves; the checkbox
   stays greyed out until it's ready.

DNS changes usually take 10–30 minutes to propagate, occasionally longer.
