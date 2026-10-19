// Runs inside the page (Playwright page.evaluate). Finds the things a user
// reads or touches in the main content — fields, buttons, tabs, table columns,
// switches — numbers them in reading order and draws a badge on each.
// Returns [{ n, kind, key, x, y, w, h }]. The key is the element's visible
// label, which is what the manual's explanations are keyed by.
(() => {
  // An open dialog or side sheet is the window being documented.
  const root =
    document.querySelector('[role="dialog"][data-state="open"]') ||
    document.querySelector("main main") ||
    document.querySelector("main") ||
    document.body;
  const rtl = document.documentElement.dir === "rtl";
  const seen = new Set();
  const out = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  // Digits become "#": counts and scores change between captures, labels don't.
  const clean = (t) => (t || "").replace(/\s+/g, " ").replace(/[*:]+$/, "").replace(/\d+([.,]\d+)?/g, "#").trim().slice(0, 80);
  const labelFor = (el) => {
    if (el.id) {
      const l = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return clean(l.textContent);
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return clean(aria);
    const lb = el.getAttribute("aria-labelledby");
    if (lb) return clean(lb.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" "));
    // shadcn FormItem: label sits in the same item wrapper
    const item = el.closest('[data-slot="form-item"], .space-y-1\\.5, .space-y-2');
    const l = item?.querySelector("label");
    if (l && !l.contains(el)) return clean(l.textContent);
    return clean(el.getAttribute("placeholder") || el.getAttribute("title") || el.getAttribute("name"));
  };
  const add = (el, kind, key) => {
    key = clean(key);
    if (!key || !visible(el)) return;
    // Buttons and links labelled with data (a ticket number, a score) are records, not controls.
    if ((kind === "button" || kind === "link") && key.includes("#")) return;
    // Parts of a labelled group (filter chips) are documented as the group.
    if (kind !== "group" && el.closest('[role="group"][aria-label]') && el.closest('[role="group"][aria-label]') !== el) return;
    const dedupe = `${kind}:${key}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    const r = el.getBoundingClientRect();
    out.push({ el, kind, key, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  };

  root.querySelectorAll('[role="tab"]').forEach((el) => add(el, "tab", el.textContent));
  root.querySelectorAll('[role="group"][aria-label]').forEach((el) => add(el, "group", el.getAttribute("aria-label")));
  root.querySelectorAll("input:not([type=hidden]), textarea, select, [role=combobox], [role=switch], [role=checkbox], [role=radio]").forEach((el) => {
    if (el.closest('[role="tablist"]')) return;
    const kind = el.getAttribute("role") === "switch" ? "switch" : el.getAttribute("role") === "checkbox" || el.type === "checkbox" ? "checkbox" : el.getAttribute("role") === "radio" || el.type === "radio" ? "option" : "field";
    add(el, kind, labelFor(el));
  });
  root.querySelectorAll("button, a[data-slot=button], [role=button]").forEach((el) => {
    if (el.getAttribute("role") === "tab" || el.getAttribute("role") === "combobox" || el.getAttribute("role") === "switch" || el.getAttribute("role") === "checkbox" || el.getAttribute("role") === "radio") return;
    if (el.closest("thead")) return; // sort buttons belong to their column
    add(el, "button", el.textContent || el.getAttribute("aria-label") || el.getAttribute("title"));
  });
  root.querySelectorAll("thead th").forEach((el) => add(el, "column", el.textContent));
  // Links that act like buttons ("View", record links in lists are skipped: they are data).
  root.querySelectorAll("a[href]").forEach((el) => {
    if (el.closest("tbody") || el.querySelector("input,button")) return;
    add(el, "link", el.textContent || el.getAttribute("aria-label"));
  });
  // Read-only tiles: cards that hold no controls, keyed by their title (KPI tiles).
  root.querySelectorAll('[data-slot="card"]').forEach((el) => {
    if (el.querySelector("input,textarea,select,button,[role=combobox],table,a")) return;
    // Title: the card title, else the first short text with letters (not the figure).
    const title =
      el.querySelector('[data-slot="card-title"]') ||
      [...el.querySelectorAll("p,span,h3,h4,div")].find((n) => !n.children.length && /[A-Za-z\u0600-\u06FF]/.test(n.textContent || ""));
    add(el, "tile", title?.textContent);
  });

  // Reading order: top to bottom in 12px bands, then start-to-end.
  out.sort((a, b) => Math.round(a.y / 12) - Math.round(b.y / 12) || (rtl ? b.x - a.x : a.x - b.x));

  const layer = document.createElement("div");
  layer.id = "__manual_badges";
  layer.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none";
  document.body.appendChild(layer);
  return out.map((o, i) => {
    const n = i + 1;
    o.el.style.outline = "2px solid #c026d3";
    o.el.style.outlineOffset = "1px";
    const b = document.createElement("div");
    b.textContent = String(n);
    const left = rtl ? o.x + o.w - 11 : o.x - 11;
    b.style.cssText = `position:absolute;left:${left}px;top:${o.y - 11}px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;background:#c026d3;color:#fff;font:700 12px/22px system-ui,Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff`;
    layer.appendChild(b);
    return { n, kind: o.kind, key: o.key, x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w), h: Math.round(o.h) };
  });
})();
