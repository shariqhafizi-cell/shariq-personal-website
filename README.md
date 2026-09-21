# Shariq Hafizi — personal website

A personal site built to look like the thing it actually is: a document. The
page wears Google Docs' chrome — title bar, menus, toolbar, ruler, and a left
tabs rail — around a white letter-sized sheet.

Plain HTML, CSS and JavaScript: **no build step, no dependencies, no
framework**. Open `index.html` in a browser and what you see is exactly what
ships.

```
index.html          the chrome + the content of every tab
assets/styles.css   all styling; colour tokens at the top
assets/main.js      tabs, menus, zoom, theme, ruler
assets/img/         photos used in the document
.nojekyll           tells GitHub Pages to serve the files as-is
```

---

## How it's put together

**The left rail is the navigation.** Each `<section class="tabpanel">` in
`index.html` is one tab, holding one or more `<article class="page">` sheets.
The buttons in the rail are generated from those sections at load, so the two
can never drift — to add a page, copy a `<section>` block, give it a unique
`id="panel-yourname"` and a `data-tab-title`, and the tab appears by itself.
Add a matching icon in `TAB_ICONS` in `main.js` if you want one that isn't the
default.

**Long tabs break across real pages.** Put `data-paginate` on a `<section>` and
`main.js` re-flows its single `<article>` into as many letter-sized sheets as
it needs, splitting *mid-paragraph* at the line where the page fills up, the
way a real document does. It measures with a `Range` and binary-searches the
word boundary that still fits, then re-runs whenever the zoom or the window
width changes. Below the mobile breakpoint it gives up on page-sized sheets and
renders one continuous page, which is the right call on a phone.

**The Equitle tab is authored a page per chapter**, not flowed — it has no
`data-paginate` on purpose, so each chapter starts on its own sheet. The
contents page links to them, and the page numbers beside each entry are filled
in from DOM order at load, so they stay correct if a chapter grows to two
sheets or the order changes. To add a chapter, add an `<article class="page"
id="ch-yourslug" tabindex="-1">` and one `<li>` in the `.doc-toc` list pointing
at it. Because nothing re-flows here, a chapter that outgrows its sheet just
gets a taller page — when that happens, split the overflow into a second
`<article class="page">` with no chapter label, the way chapter 3 already does.
The contents page numbers itself around those continuation sheets.

**Photos are optional until the file exists.** A `<figure class="doc-fig"
data-optional hidden>` holds the image path in `data-src` rather than `src`.
`main.js` pre-loads that path and only reveals the figure once it genuinely
loads, so a photo you have not added yet shows nothing at all instead of a
broken image. Images are capped at 240px tall (scaled with `--zoom`) so a
portrait photo cannot push its chapter onto a second sheet.

**Every control in the chrome does something real.** File → Print, View →
Dark theme and Zoom, Tools → Word count (it counts the actual text), Help →
About. The purely decorative buttons — bold, italic, undo — are marked
`data-noop` in the HTML and say so when clicked, rather than failing silently.

**The tabs are linkable.** `/#autonomous-future` opens straight to that page,
and the URL updates as you switch, so you can send someone directly to one
section.

**There are two ways to change the theme** — the button at the right end of the
toolbar, and View → Dark theme. Both read and write the same state through
`paintThemeIcon()` in `main.js`, so they can't disagree. Left alone, the page
follows the operating system.

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
| The donuts photo | Save it as `assets/img/donuts.jpg` and it appears in chapter 2 by itself. Any shape works; edit the caption in `index.html` |
| Overview → "what you're looking for" | One line about why someone should mail you |
| Autonomous Future → byline date | Update it when you revise the essay |

### Changing the colours

Every colour is a CSS variable at the top of `assets/styles.css`. The dark
theme is defined **twice** on purpose — once under
`@media (prefers-color-scheme: dark)` for people whose OS is dark, and once
under `:root[data-theme="dark"]` for the manual toggle. CSS has no way to share
one block between the two, so if you change a dark colour, change it in both.

### Printing

`@media print` strips the entire chrome and prints just the document, in black
on white, with the yellow placeholder highlights removed — so File → Print
gives a clean PDF, not a screenshot of a browser.

Paginated sheets get an inline `height` from the flow pass, which would
otherwise beat the print rules and clip the page, so the print block resets
`height` and `overflow` with `!important` and lets the printer do its own
pagination. A paragraph split across two screen sheets rejoins seamlessly on
paper, because the first half has no bottom margin and the continuation has no
top margin.

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
