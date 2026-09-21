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

  var TAB_ICONS = {
    overview:   "description",
    experience: "work_outline",
    projects:   "folder_open",
    skills:     "construction",
    contact:    "mail_outline"
  };

  var panels = $$(".page");
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

  var EMAIL = "shariqhafizi@gmail.com";

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
  }

  /* No data-theme attribute means "follow the OS". Once the viewer picks a
     side we set it explicitly, so forcing light still works on a dark OS. */
  function effectiveTheme() {
    var forced = root.getAttribute("data-theme");
    if (forced) return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* One source of truth for all three theme controls: the toolbar button,
     View > Dark theme, and the glass switch. */
  function paintThemeIcon() {
    var dark = effectiveTheme() === "dark";
    var icon = $("#modeBtn .msym");
    if (icon) icon.textContent = dark ? "light_mode" : "dark_mode";
    var glass = $("#glassToggle");
    if (glass) glass.setAttribute("aria-checked", dark ? "true" : "false");
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

  var glassToggle = $("#glassToggle");
  if (glassToggle) {
    glassToggle.addEventListener("click", function () { run("theme"); });
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
