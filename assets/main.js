/* =========================================================
   Shariq Hafizi — personal site, dressed as a Google Doc

   Everything in the chrome that can be clicked does something real.
   Decorative buttons are marked data-noop in the HTML and are left
   inert on purpose rather than wired to nothing.
   ========================================================= */

(function () {
  "use strict";

  var root = document.documentElement;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     small helpers
     --------------------------------------------------------- */

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } }
  };

  var toastEl = $("#toast");
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  var dlg = $("#dlg");
  function dialog(title, html) {
    if (!dlg || !dlg.showModal) { toast(title); return; }
    $("#dlgTitle").textContent = title;
    $("#dlgBody").innerHTML = html;
    dlg.showModal();
  }
  if (dlg) {
    $("#dlgOk").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------------------------------------------------------
     1. tabs — the left panel drives which page is shown
     --------------------------------------------------------- */

  // All document icons, the way a real Docs tab list looks.
  var TAB_ICONS = {
    overview:             "description",
    "autonomous-future":  "article",
    equitle:              "draft"
  };

  var panels = $$(".tabpanel");
  var list = $(".tabs__list");
  var canvas = $("#doc");

  // Build the tab buttons from the panels themselves so the two can't drift.
  panels.forEach(function (panel, i) {
    var key = panel.id.replace("panel-", "");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "tab-" + key;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", panel.id);
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    btn.tabIndex = i === 0 ? 0 : -1;
    btn.innerHTML = '<span class="msym">' + (TAB_ICONS[key] || "description") + "</span>" +
                    "<span>" + panel.getAttribute("data-tab-title") + "</span>";
    btn.addEventListener("click", function () { selectTab(i); });
    list.appendChild(btn);
  });

  var tabs = $$("button", list);

  function selectTab(index, opts) {
    opts = opts || {};
    tabs.forEach(function (t, i) {
      var on = i === index;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (canvas) canvas.scrollTop = 0;
    if (!opts.silent) store.set("gdocs-tab", String(index));
    // Keep the URL shareable: /#experience deep-links to that tab.
    var key = panels[index].id.replace("panel-", "");
    if (history.replaceState) history.replaceState(null, "", "#" + key);
    if (opts.focus !== false) tabs[index].focus();
  }

  // Arrow-key navigation, as the hint under the tab list promises.
  list.addEventListener("keydown", function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End")  next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    selectTab(next);
  });

  // Open on the tab named in the URL, else the last one used.
  (function restoreTab() {
    var byHash = -1;
    if (location.hash) {
      var key = location.hash.slice(1);
      panels.forEach(function (p, i) { if (p.id === "panel-" + key) byHash = i; });
    }
    var saved = parseInt(store.get("gdocs-tab"), 10);
    var start = byHash >= 0 ? byHash : (saved >= 0 && saved < panels.length ? saved : 0);
    if (start !== 0) selectTab(start, { silent: byHash >= 0, focus: false });
  })();

  /* ---------------------------------------------------------
     1b. pagination — flow a long tab across letter-sized sheets

     A real document breaks when the page fills up, mid-paragraph if that's
     where the break lands. So rather than hard-coding page breaks in the
     HTML, the source lives in one <article> and gets re-flowed here into
     as many sheets as it needs, again whenever the zoom or width changes.
     --------------------------------------------------------- */

  var PAGE_H_IN = 1056;   // 11in at 96dpi, matching --page-min
  var paginated = [];     // panels we've taken over, with their source nodes

  $$("[data-paginate]").forEach(function (panel) {
    var page = panel.querySelector(".page");
    var source = document.createDocumentFragment();
    while (page.firstChild) source.appendChild(page.firstChild);
    paginated.push({ panel: panel, cls: page.className, source: source });
  });

  function pageMetrics(sample) {
    var cs = getComputedStyle(sample);
    var zoom = parseFloat(getComputedStyle(root).getPropertyValue("--zoom")) || 1;
    return {
      height: PAGE_H_IN * zoom,
      padTop: parseFloat(cs.paddingTop),
      padBottom: parseFloat(cs.paddingBottom)
    };
  }

  function newPage(cls, m) {
    var p = document.createElement("article");
    p.className = cls + " page--sheet";
    p.style.height = m.height + "px";
    return p;
  }

  /* Find the largest word boundary whose rendered bottom still fits above
     `limit`, so a paragraph can be cut at the line where the page ends. */
  function splitPoint(textNode, limit) {
    var text = textNode.data;
    var cuts = [];
    var re = /\S+\s*/g, m;
    while ((m = re.exec(text)) !== null) cuts.push(m.index + m[0].length);
    if (cuts.length < 2) return -1;

    var range = document.createRange();
    var lo = 0, hi = cuts.length - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      range.setStart(textNode, 0);
      range.setEnd(textNode, cuts[mid]);
      if (range.getBoundingClientRect().bottom <= limit) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return best < 0 ? -1 : cuts[best];
  }

  function flow(entry) {
    var panel = entry.panel;
    var wasHidden = panel.hidden;
    panel.hidden = false;                 // can't measure a hidden element

    panel.innerHTML = "";
    var probe = document.createElement("article");
    probe.className = entry.cls;
    panel.appendChild(probe);
    var m = pageMetrics(probe);
    panel.removeChild(probe);

    // Below the mobile breakpoint the sheet fills the screen and has no
    // fixed height, so paging it would be meaningless — keep one long page.
    if (window.matchMedia("(max-width: 860px)").matches) {
      var single = document.createElement("article");
      single.className = entry.cls;
      single.appendChild(entry.source.cloneNode(true));
      panel.appendChild(single);
      panel.hidden = wasHidden;
      return;
    }

    var page = newPage(entry.cls, m);
    panel.appendChild(page);

    var queue = [];
    var clone = entry.source.cloneNode(true);
    while (clone.firstChild) queue.push(clone.removeChild(clone.firstChild));

    var guard = 0;
    while (queue.length && guard++ < 2000) {
      var node = queue.shift();
      page.appendChild(node);

      if (node.nodeType !== 1) continue;   // whitespace between elements
      var limit = page.getBoundingClientRect().top + m.height - m.padBottom;
      if (node.getBoundingClientRect().bottom <= limit) continue;

      // It overflowed. Try to cut the paragraph at the line that crosses.
      var cut = -1;
      if (node.tagName === "P" && node.childNodes.length === 1 &&
          node.firstChild.nodeType === 3) {
        cut = splitPoint(node.firstChild, limit);
      }

      if (cut > 0) {
        var rest = node.firstChild.data.slice(cut);
        node.firstChild.data = node.firstChild.data.slice(0, cut).replace(/\s+$/, "");
        var cont = document.createElement("p");
        cont.className = (node.className ? node.className + " " : "") + "doc-cont";
        cont.textContent = rest;
        queue.unshift(cont);
      } else if (page.children.length > 1) {
        // Can't split it — push the whole node to the next sheet.
        page.removeChild(node);
        queue.unshift(node);
      } else {
        // Alone on the sheet and still too tall to split. Let this one sheet
        // grow rather than clipping text away, then carry on.
        page.style.height = "auto";
        continue;
      }

      page = newPage(entry.cls, m);
      panel.appendChild(page);
    }

    panel.hidden = wasHidden;
  }

  function repaginate() { paginated.forEach(flow); }
  repaginate();

  /* ---------------------------------------------------------
     1c. chapter links — the contents page jumps to a chapter

     Page numbers come from DOM order rather than being typed in, so they
     stay right if a chapter grows to two sheets or one gets reordered.
     --------------------------------------------------------- */

  $$("[data-chapter]").forEach(function (link) {
    var panel = link.closest(".tabpanel");
    var target = panel && panel.querySelector(link.getAttribute("href"));
    if (!target) return;

    var sheets = $$(".page", panel);
    var pg = link.querySelector("[data-pg]");
    if (pg) pg.textContent = String(sheets.indexOf(target) + 1);

    link.addEventListener("click", function (e) {
      e.preventDefault();          // don't put #ch-… in the URL; the hash
      target.scrollIntoView({      // is how tabs are deep-linked
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "start"
      });
      target.focus({ preventScroll: true });
    });
  });

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------------------------------------------------------
     2. collapsing the tabs rail
     --------------------------------------------------------- */

  var tabsPanel = $("#tabsPanel");
  var reopenBtn = $("#tabsReopen");

  function setTabsOpen(open) {
    tabsPanel.hidden = !open;
    reopenBtn.hidden = open;
    store.set("gdocs-tabs-open", open ? "1" : "0");
  }
  $("#tabsCollapse").addEventListener("click", function () { setTabsOpen(false); reopenBtn.focus(); });
  reopenBtn.addEventListener("click", function () { setTabsOpen(true); $("#tabsCollapse").focus(); });

  // Start collapsed on narrow screens, where the rail would cover the page.
  var narrow = window.matchMedia("(max-width: 1100px)");
  if (store.get("gdocs-tabs-open") === "0" || narrow.matches) setTabsOpen(false);

  // On narrow screens, picking a tab should close the overlay rail.
  list.addEventListener("click", function () { if (narrow.matches) setTabsOpen(false); });

  /* ---------------------------------------------------------
     3. actions shared by the toolbar and the menus
     --------------------------------------------------------- */

  var EMAIL = "shariq@equitle.com";

  function wordCount() {
    var text = panels.map(function (p) { return p.innerText || p.textContent || ""; }).join(" ");
    var words = text.trim().split(/\s+/).filter(Boolean);
    var chars = text.replace(/\s+/g, " ").trim().length;
    return { words: words.length, chars: chars, pages: panels.length,
             minutes: Math.max(1, Math.round(words.length / 220)) };
  }

  function copyEmail() {
    function done() { toast("Email address copied"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, function () { toast(EMAIL); });
    } else {
      toast(EMAIL);
    }
  }

  function setZoom(z) {
    root.style.setProperty("--zoom", z);
    store.set("gdocs-zoom", z);
    var sel = $("#zoomSel");
    if (sel) sel.value = String(z);
    repaginate();   // the sheets are a different size now, so re-flow
  }

  /* No data-theme attribute means "follow the OS". Once the viewer picks a
     side we set it explicitly, so forcing light still works on a dark OS. */
  function effectiveTheme() {
    var forced = root.getAttribute("data-theme");
    if (forced) return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* One source of truth for both theme controls: the toolbar button and
     View > Dark theme. */
  function paintThemeIcon() {
    var icon = $("#modeBtn .msym");
    if (icon) icon.textContent = effectiveTheme() === "dark" ? "light_mode" : "dark_mode";
  }

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    store.set("gdocs-theme", mode);
    paintThemeIcon();
  }

  var ACTIONS = {
    print:      function () { window.print(); },
    email:      function () { window.location.href = "mailto:" + EMAIL; },
    "copy-email": copyEmail,
    theme:      function () {
      setTheme(effectiveTheme() === "dark" ? "light" : "dark");
    },
    fullscreen: function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      else toast("Full screen isn't available in this browser");
    },
    "zoom-in":  function () { setZoom(Math.min(1.5,  (parseFloat(getComputedStyle(root).getPropertyValue("--zoom")) || 1) + .25)); },
    "zoom-out": function () { setZoom(Math.max(0.75, (parseFloat(getComputedStyle(root).getPropertyValue("--zoom")) || 1) - .25)); },
    "zoom-reset": function () { setZoom(1); },
    "word-count": function () {
      var c = wordCount();
      dialog("Word count",
        "<dl>" +
        "<dt>Pages</dt><dd>" + c.pages + "</dd>" +
        "<dt>Words</dt><dd>" + c.words.toLocaleString() + "</dd>" +
        "<dt>Characters</dt><dd>" + c.chars.toLocaleString() + "</dd>" +
        "<dt>Reading time</dt><dd>about " + c.minutes + " min</dd>" +
        "</dl>");
    },
    about: function () {
      dialog("About this page",
        "<p>A personal site built to look like the thing it is: a document.</p>" +
        "<p>Hand-written HTML, CSS and JavaScript &mdash; no framework and no build " +
        "step. The chrome is a costume, but the buttons in it work.</p>" +
        '<p><a href="https://github.com/shariqhafizi-cell/shariq-personal-website">View the source</a></p>');
    },
    shortcuts: function () {
      dialog("Keyboard shortcuts",
        "<dl>" +
        "<dt>&uarr; &darr;</dt><dd>Move between tabs</dd>" +
        "<dt>Ctrl/&#8984; P</dt><dd>Print this page</dd>" +
        "<dt>Esc</dt><dd>Close a menu or dialog</dd>" +
        "</dl>");
    }
  };

  function run(name) {
    var fn = ACTIONS[name];
    if (fn) fn();
  }

  // Toolbar buttons
  $$("[data-action]").forEach(function (el) {
    el.addEventListener("click", function () { run(el.getAttribute("data-action")); });
  });

  // Decorative toolbar buttons say so rather than failing silently.
  $$("[data-noop]").forEach(function (el) {
    el.addEventListener("click", function () { toast("That one's just for the costume"); });
  });

  $("#printBtn").addEventListener("click", function () { window.print(); });

  var zoomSel = $("#zoomSel");
  if (zoomSel) {
    var savedZoom = store.get("gdocs-zoom");
    if (savedZoom) zoomSel.value = savedZoom;
    zoomSel.addEventListener("change", function () { setZoom(parseFloat(zoomSel.value)); });
  }

  // Draw the right state for whatever we're starting on, without forcing a
  // choice — an untouched page keeps following the OS as it changes.
  paintThemeIcon();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener
    && window.matchMedia("(prefers-color-scheme: dark)")
         .addEventListener("change", paintThemeIcon);

  var starBtn = $("#starBtn");
  starBtn.addEventListener("click", function () {
    var on = starBtn.getAttribute("aria-pressed") === "true";
    starBtn.setAttribute("aria-pressed", on ? "false" : "true");
    $(".msym", starBtn).textContent = on ? "star" : "star_rate";
    if (!on) toast("Thanks — starred");
  });

  /* ---------------------------------------------------------
     4. menu bar — every item runs a real action
     --------------------------------------------------------- */

  var MENUS = [
    ["File", [
      { label: "Print",            icon: "print",     action: "print", kbd: "Ctrl+P" },
      { label: "Email Shariq",     icon: "mail",      action: "email" },
      { sep: true },
      { label: "View source",      icon: "code",      href: "https://github.com/shariqhafizi-cell/shariq-personal-website" }
    ]],
    ["Edit", [
      { label: "Copy email address", icon: "content_copy", action: "copy-email" },
      { label: "Suggest an edit",    icon: "edit_note",
        href: "mailto:" + EMAIL + "?subject=Note%20on%20your%20site" }
    ]],
    ["View", [
      { label: "Dark theme",  icon: "dark_mode",  action: "theme" },
      { label: "Full screen", icon: "fullscreen", action: "fullscreen" },
      { sep: true },
      { label: "Zoom in",     icon: "zoom_in",    action: "zoom-in" },
      { label: "Zoom out",    icon: "zoom_out",   action: "zoom-out" },
      { label: "Reset zoom",  icon: "restart_alt", action: "zoom-reset" }
    ]],
    ["Insert", [
      { label: "GitHub profile", icon: "link", href: "https://github.com/shariqhafizi-cell" },
      { label: "Equitle",        icon: "link", href: "https://equitle.com" }
    ]],
    ["Tools", [
      { label: "Word count", icon: "functions", action: "word-count" }
    ]],
    ["Help", [
      { label: "About this page",     icon: "info",     action: "about" },
      { label: "Keyboard shortcuts",  icon: "keyboard", action: "shortcuts" }
    ]]
  ];

  var menubar = $("#menubar");
  var dropdown = $("#dropdown");
  var openBtn = null;

  function closeMenu() {
    dropdown.hidden = true;
    if (openBtn) openBtn.setAttribute("aria-expanded", "false");
    openBtn = null;
  }

  function openMenu(btn, items) {
    dropdown.innerHTML = "";
    items.forEach(function (item) {
      if (item.sep) { dropdown.appendChild(document.createElement("hr")); return; }
      var el = document.createElement(item.href ? "a" : "button");
      if (item.href) {
        el.href = item.href;
        if (/^https?:/.test(item.href)) { el.target = "_blank"; el.rel = "noopener"; }
      } else {
        el.type = "button";
      }
      el.setAttribute("role", "menuitem");
      el.innerHTML = '<span class="msym">' + item.icon + '</span><span>' + item.label + "</span>" +
                     (item.kbd ? '<span class="kbd">' + item.kbd + "</span>" : "");
      el.addEventListener("click", function () {
        closeMenu();
        if (item.action) run(item.action);
      });
      dropdown.appendChild(el);
    });

    var r = btn.getBoundingClientRect();
    dropdown.hidden = false;
    dropdown.style.top = (r.bottom + 4) + "px";
    // Keep the panel on screen when the menu sits near the right edge.
    var w = dropdown.offsetWidth;
    dropdown.style.left = Math.min(r.left, window.innerWidth - w - 12) + "px";

    btn.setAttribute("aria-expanded", "true");
    openBtn = btn;
  }

  MENUS.forEach(function (m) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = m[0];
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (openBtn === btn) closeMenu();
      else openMenu(btn, m[1]);
    });
    // Sliding across the bar with one open switches menus, like a real menu bar.
    btn.addEventListener("mouseenter", function () {
      if (openBtn && openBtn !== btn) openMenu(btn, m[1]);
    });
    menubar.appendChild(btn);
  });

  // Re-flow the pages when the window changes width, debounced so dragging
  // a window edge doesn't re-run the measuring loop on every frame.
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(repaginate, 180);
  });

  document.addEventListener("click", function (e) {
    if (openBtn && !dropdown.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", closeMenu);

  /* ---------------------------------------------------------
     5. the ruler
     --------------------------------------------------------- */

  (function buildRuler() {
    var ruler = $("#ruler");
    if (!ruler) return;
    var bar = document.createElement("div");
    bar.className = "ruler__bar";

    var PAGE = 8.5, MARGIN = 1; // inches
    function pct(inches) { return (inches / PAGE) * 100 + "%"; }

    ["left", "right"].forEach(function (side) {
      var m = document.createElement("div");
      m.className = "ruler__margin";
      m.style[side] = "0";
      m.style.width = pct(MARGIN);
      bar.appendChild(m);
    });

    for (var i = 1; i < PAGE; i++) {
      var tick = document.createElement("div");
      tick.className = "ruler__tick";
      tick.style.left = pct(i);
      bar.appendChild(tick);

      if (i > MARGIN && i < PAGE - MARGIN) {
        var num = document.createElement("span");
        num.className = "ruler__num";
        num.style.left = pct(i);
        num.textContent = String(i - MARGIN);
        bar.appendChild(num);
      }
    }
    ruler.appendChild(bar);
  })();

  /* ---------------------------------------------------------
     6. footer date
     --------------------------------------------------------- */

  var edited = $("#editedOn");
  if (edited) {
    edited.textContent = new Date(document.lastModified)
      .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
})();
