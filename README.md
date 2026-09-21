# Shariq Hafizi — personal website

A personal site built to look like the thing it actually is: a document. The
page wears Google Docs' chrome — title bar, menus, toolbar, ruler, and a left
tabs rail — around a white letter-sized sheet.

Plain HTML, CSS and JavaScript: **no build step, no dependencies, no
framework**. Open `index.html` in a browser and what you see is exactly what
ships.

```
index.html          the chrome + all five pages of content
assets/styles.css   all styling; colour tokens at the top
assets/main.js      tabs, menus, zoom, theme, ruler
.nojekyll           tells GitHub Pages to serve the files as-is
```

---

## How it's put together

**The left rail is the navigation.** Each `<article class="page">` in
`index.html` is one tab. The buttons in the rail are generated from those
articles at load, so the two can never drift — to add a page, copy an
`<article>` block, give it a unique `id="panel-yourname"` and a
`data-tab-title`, and the tab appears by itself. Add a matching icon in
`TAB_ICONS` in `main.js` if you want one that isn't the default.

**Every control in the chrome does something real.** File → Print, View →
Dark theme and Zoom, Tools → Word count (it counts the actual text), Help →
About. The purely decorative buttons — bold, italic, undo — are marked
`data-noop` in the HTML and say so when clicked, rather than failing silently.

**The tabs are linkable.** `/#experience` opens straight to that page, and the
URL updates as you switch, so you can send someone directly to one section.

**There are three ways to change the theme** — the liquid-glass switch at the
bottom right, the toolbar button, and View → Dark theme — and all three read
and write the same state through `paintThemeIcon()` in `main.js`, so they can't
disagree. Left alone, the page follows the operating system.

**Zoom is one number.** Page width, margins and every text size derive from the
`--zoom` variable, so the toolbar's zoom control resizes the document the way a
real one does.

---

## Editing the content

Everything is in `index.html`, marked with `<!-- EDIT ME -->` comments.
Anything still needing your input is also **highlighted in yellow on the page
itself**, styled like a Google Docs highlight, so you can spot it by looking
rather than by reading the source.

Still outstanding:

| Where | What to put there |
|---|---|
| LinkedIn URL | Currently `#`, in both the Overview and Contact pages |
| Experience → dates | `20XX – Present` on the Equitle entry |
| Experience → a result | One concrete outcome with a number in it |
| Experience → second role, Education | Fill in or delete the blocks |
| Projects two and three | Real projects, or delete the `<div class="entry">` blocks |
| Skills | Trim to what you'd be happy to be interviewed on |
| Overview → "what you're looking for" | One line about why someone should mail you |

### Changing the colours

Every colour is a CSS variable at the top of `assets/styles.css`. The dark
theme is defined **twice** on purpose — once under
`@media (prefers-color-scheme: dark)` for people whose OS is dark, and once
under `:root[data-theme="dark"]` for the manual toggle. CSS has no way to share
one block between the two, so if you change a dark colour, change it in both.

### Printing

`@media print` strips the entire chrome and prints just the document, in black
on white, with the yellow placeholder highlights removed. So File → Print
produces a clean résumé PDF, not a screenshot of a browser.

---

## Previewing locally

```bash
cd ~/code/shariq-personal-website
python3 -m http.server 8080
```

Then open <http://localhost:8080>. There's no live-reload, so hard-refresh
(⌘⇧R) after an edit.

---

## Publishing

Hosted on **GitHub Pages**, served from the `main` branch root.

1. Push to `main`.
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **`main`**, folder: **`/ (root)`**
3. Give it a minute. The first deploy is the slowest.

Every later `git push` redeploys automatically. `../publish-personal-website.sh`
does the repo creation, push and Pages setup in one go.

### Custom domain

1. **Settings → Pages → Custom domain** → enter it → **Save**. GitHub writes a
   `CNAME` file into the repo for you.
2. At your registrar, add these DNS records:

   **Apex domain** (`yourdomain.com`) — four `A` records:

   ```
   A   @   185.199.108.153
   A   @   185.199.109.153
   A   @   185.199.110.153
   A   @   185.199.111.153
   ```

   **`www`** — one `CNAME` record:

   ```
   CNAME   www   <your-github-username>.github.io
   ```

3. Tick **Enforce HTTPS** once the certificate is issued. That can take a few
   hours after DNS resolves; the checkbox stays greyed out until it's ready.

DNS usually propagates in 10–30 minutes, occasionally longer.
