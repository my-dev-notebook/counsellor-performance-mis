import type { Band, Person } from "@/components/auth/constellation/taglines";

/**
 * The constellation behind the sign-in card: plain stars plus a handful of counsellor nodes, linked when close,
 * with successful application pulses running along the counsellor edges. Plain DOM and one `requestAnimationFrame` loop — no
 * React state per frame. The same loop moves the hover label so nothing else has to.
 *
 * Kept cheap on purpose:
 *   - neighbour search goes through a uniform grid (cell = longest link), not every pair
 *   - edges and stars are bucketed by alpha and stroked/filled in a few batched paths instead of one call each
 *   - node count follows the viewport area, the canvas backing store is capped at 2× DPR
 *   - the loop stops when the tab is hidden or the canvas is scrolled off-screen
 *   - touch devices get taps (shockwave) but no cursor bend, hover or drag
 *   - `prefers-reduced-motion` renders a single static frame
 */

type Node = {
    i: number;
    x: number;
    y: number;
    ox: number; // offset from the cursor bend / shockwaves, decays back to 0
    oy: number;
    vx: number;
    vy: number;
    z: number; // depth 0.3–1: brightness
    r: number;
    sx: number; // screen position this frame
    sy: number;
    cx: number; // grid cell this frame
    cy: number;
    p: Person | null;
    ini: string;
    ab: number; // alpha bucket (plain stars only) so they can be filled in batches
};

type Ripple = { x: number; y: number; r: number };
type Burst = { x: number; y: number; a: number; v: number; k: number };
type Pulse = { a: Node; b: Node; k: number };

export type SceneElements = {
    root: HTMLElement;
    canvas: HTMLCanvasElement;
    label: HTMLElement;
    labelOnClass: string;
    /** True for targets that sit on top of the canvas (hero, card, tickers) — pointer events there don't reach the graph. */
    isUi: (target: Element) => boolean;
};

const TAU = Math.PI * 2;
const PLAIN_LINK = 105;
const PEOPLE_LINK = 170;
const CELL = PEOPLE_LINK;
const BEND_RADIUS = 180;
const HIT_RADIUS = 18;
const RIPPLE_MAX = 520;
const ALPHA_STEPS = 5;
const STAR_STEPS = 4;
const PLAIN_ALPHA = 0.2;
const PEOPLE_ALPHA = 0.32;
const MAX_NODES = 210;
const MIN_NODES = 70;
const AREA_PER_NODE = 4500;
const MAX_PULSES = 9;

type ColorKey = "accent" | "good" | "warn" | "bad" | "ink3";
/** Edge groups: 0 star↔star, 1 person↔person, 2–4 person↔star coloured by the person's band. */
const GROUP_COLOR: readonly ColorKey[] = ["accent", "accent", "good", "warn", "bad"];
const BAND_GROUP: Record<Band, number> = { good: 2, warn: 3, bad: 4 };

function initials(name: string) {
    return name
        .split(" ")
        .map((s) => s[0] ?? "")
        .join("");
}

function px2(n: number) {
    return n.toFixed(2) + "px";
}

function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mountScene(els: SceneElements, people: readonly Person[]): () => void {
    const { root, canvas, label, labelOnClass, isUi } = els;
    const context = canvas.getContext("2d");
    if (!context) return () => {};
    const ctx = context;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const font = `500 9px ${getComputedStyle(root).fontFamily}`;

    // ---- colours: read from the tokens, re-read on theme change ----
    const C: Record<ColorKey, string> = { accent: "", good: "", warn: "", bad: "", ink3: "" };
    function readColors() {
        const s = getComputedStyle(document.documentElement);
        C.accent = s.getPropertyValue("--accent").trim();
        C.good = s.getPropertyValue("--good").trim();
        C.warn = s.getPropertyValue("--warn").trim();
        C.bad = s.getPropertyValue("--bad").trim();
        C.ink3 = s.getPropertyValue("--ink-3").trim();
    }
    const bandColor = (b: Band) => C[b];

    // ---- pointer ----
    const mouse = { x: -1e4, y: -1e4, in: false };
    let drag: Node | null = null;
    let pinned: Node | null = null;
    let hover: Node | null = null;
    let downAt = 0;
    let touchDown: { x: number; y: number; at: number } | null = null;
    let ripples: Ripple[] = [];
    let bursts: Burst[] = [];
    let pulses: Pulse[] = [];

    function localPoint(e: PointerEvent) {
        const r = root.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    }
    function shock(x: number, y: number) {
        ripples.push({ x, y, r: 0 });
        for (let b = 0; b < 6; b++) bursts.push({ x, y, a: Math.random() * TAU, v: 1.5 + Math.random() * 2.5, k: 0 });
        start();
    }
    function onMove(e: PointerEvent) {
        if (e.pointerType === "touch") return;
        const p = localPoint(e);
        mouse.x = p.x;
        mouse.y = p.y;
        mouse.in = true;
    }
    function onLeave() {
        mouse.in = false;
        mouse.x = mouse.y = -1e4;
        drag = null;
    }
    function onDown(e: PointerEvent) {
        if (e.target instanceof Element && isUi(e.target)) return;
        if (e.pointerType === "touch") {
            const p = localPoint(e);
            touchDown = { x: p.x, y: p.y, at: performance.now() };
            return;
        }
        downAt = performance.now();
        if (hover) {
            drag = hover;
            drag.vx = drag.vy = 0;
        }
    }
    function onUp(e: PointerEvent) {
        if (e.target instanceof Element && isUi(e.target)) return;
        if (e.pointerType === "touch") {
            // A tap (quick, no scroll) throws a shockwave; a scroll gets `pointercancel` instead and never lands here.
            if (touchDown && performance.now() - touchDown.at < 300) shock(touchDown.x, touchDown.y);
            touchDown = null;
            return;
        }
        const quick = performance.now() - downAt < 220;
        if (drag) {
            if (quick) pinned = pinned === drag ? null : drag;
            drag.vx = (Math.random() - 0.5) * 0.3;
            drag.vy = (Math.random() - 0.5) * 0.3;
            drag = null;
            return;
        }
        if (quick) shock(mouse.x, mouse.y);
    }
    function onCancel() {
        touchDown = null;
        drag = null;
    }

    // ---- nodes + grid ----
    let W = 0;
    let H = 0;
    let N = 0;
    let P: Node[] = [];
    let cols = 0;
    let rows = 0;
    let cells: Node[][] = [];
    const edgeBuckets: number[][] = Array.from({ length: GROUP_COLOR.length * ALPHA_STEPS }, () => []);
    // person edges this frame (parallel arrays), candidates for pulses
    const edgeA: Node[] = [];
    const edgeB: Node[] = [];
    let t = 0;

    function size() {
        W = root.clientWidth;
        H = root.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.max(1, Math.ceil(W / CELL));
        rows = Math.max(1, Math.ceil(H / CELL));
        cells = Array.from({ length: cols * rows }, () => []);
    }
    function targetCount() {
        return Math.max(MIN_NODES, Math.min(MAX_NODES, Math.round((W * H) / AREA_PER_NODE)));
    }
    function build() {
        N = targetCount();
        P = [];
        const keepOut = Math.min(260, W * 0.22); // keep counsellors out of the band where the card sits
        for (let i = 0; i < N; i++) {
            const person = people[i] ?? null;
            const z = 0.3 + Math.random() * 0.7;
            let x = Math.random() * W;
            if (person && Math.abs(x - W / 2) < keepOut) {
                x += x < W / 2 ? -keepOut : keepOut;
                x = Math.max(20, Math.min(W - 20, x));
            }
            P.push({
                i,
                x,
                y: Math.random() * H,
                ox: 0,
                oy: 0,
                vx: (Math.random() - 0.5) * 0.28,
                vy: (Math.random() - 0.5) * 0.28,
                z,
                r: person ? 5 : 1.2 + Math.random() * 1.8,
                sx: 0,
                sy: 0,
                cx: 0,
                cy: 0,
                p: person,
                ini: person ? initials(person.name) : "",
                ab: Math.min(STAR_STEPS - 1, Math.floor(((z - 0.3) / 0.7) * STAR_STEPS)),
            });
        }
        pulses = [];
        drag = pinned = hover = null;
    }
    function onResize() {
        size();
        if (!P.length || Math.abs(targetCount() - N) > N * 0.3) build();
        else {
            for (const n of P) {
                n.x = Math.min(W, Math.max(0, n.x));
                n.y = Math.min(H, Math.max(0, n.y));
            }
        }
        if (reduced) frame();
        else start();
    }

    // ---- draw ----
    let shownLabel: Node | null = null;
    let cursor = "";

    function frame() {
        const g = ctx;
        t++;
        g.clearRect(0, 0, W, H);
        const bend = finePointer && mouse.in && !reduced;

        if (drag) {
            drag.x += (mouse.x - drag.x) * 0.35;
            drag.y += (mouse.y - drag.y) * 0.35;
        }
        for (const w of ripples) w.r += 7;
        ripples = ripples.filter((w) => w.r < RIPPLE_MAX);

        // move
        for (const n of P) {
            if (!reduced) {
                if (n !== drag) {
                    n.x += n.vx;
                    n.y += n.vy;
                    if (n.x < 0 || n.x > W) n.vx *= -1;
                    if (n.y < 0 || n.y > H) n.vy *= -1;
                }
                for (const w of ripples) {
                    const rx = n.x - w.x;
                    const ry = n.y - w.y;
                    const rd = Math.sqrt(rx * rx + ry * ry) || 1;
                    const band = Math.abs(rd - w.r);
                    if (band < 46) {
                        const push = ((46 - band) / 46) * 3.2;
                        n.ox += (rx / rd) * push;
                        n.oy += (ry / rd) * push;
                    }
                }
                const dx = mouse.x - n.x;
                const dy = mouse.y - n.y;
                const d2 = dx * dx + dy * dy;
                if (bend && d2 < BEND_RADIUS * BEND_RADIUS && d2 > 1) {
                    const f = (1 - Math.sqrt(d2) / BEND_RADIUS) * 0.6;
                    n.ox += (dx * f * 0.12 - n.ox) * 0.08;
                    n.oy += (dy * f * 0.12 - n.oy) * 0.08;
                } else {
                    n.ox *= 0.92;
                    n.oy *= 0.92;
                }
            }
            n.sx = n.x + n.ox;
            n.sy = n.y + n.oy;
        }

        // bucket nodes into the grid
        for (const cell of cells) cell.length = 0;
        for (const n of P) {
            n.cx = Math.min(cols - 1, Math.max(0, Math.floor(n.sx / CELL)));
            n.cy = Math.min(rows - 1, Math.max(0, Math.floor(n.sy / CELL)));
            cells[n.cy * cols + n.cx]?.push(n);
        }

        // edges: each pair once (b.i > a.i), sorted into colour × alpha buckets
        edgeA.length = 0;
        edgeB.length = 0;
        for (const a of P) {
            for (let dy = -1; dy <= 1; dy++) {
                const yy = a.cy + dy;
                if (yy < 0 || yy >= rows) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const xx = a.cx + dx;
                    if (xx < 0 || xx >= cols) continue;
                    const cell = cells[yy * cols + xx];
                    if (!cell) continue;
                    for (const b of cell) {
                        if (b.i <= a.i) continue;
                        const ex = a.sx - b.sx;
                        const ey = a.sy - b.sy;
                        const d2 = ex * ex + ey * ey;
                        const lim = a.p || b.p ? PEOPLE_LINK : PLAIN_LINK;
                        if (d2 >= lim * lim) continue;
                        const s = 1 - Math.sqrt(d2) / lim;
                        const step = Math.min(ALPHA_STEPS - 1, Math.floor(s * ALPHA_STEPS));
                        let group = 0;
                        if (a.p && b.p) group = 1;
                        else if (a.p) group = BAND_GROUP[a.p.band];
                        else if (b.p) group = BAND_GROUP[b.p.band];
                        edgeBuckets[group * ALPHA_STEPS + step]?.push(a.sx, a.sy, b.sx, b.sy);
                        if (group) {
                            edgeA.push(a);
                            edgeB.push(b);
                        }
                    }
                }
            }
        }
        for (const [group, colorKey] of GROUP_COLOR.entries()) {
            g.strokeStyle = C[colorKey];
            g.lineWidth = group ? 1.2 : 1;
            const base = group ? PEOPLE_ALPHA : PLAIN_ALPHA;
            for (let step = 0; step < ALPHA_STEPS; step++) {
                const bucket = edgeBuckets[group * ALPHA_STEPS + step];
                if (!bucket?.length) continue;
                g.globalAlpha = (base * (step + 0.5)) / ALPHA_STEPS;
                g.beginPath();
                for (let k = 0; k + 3 < bucket.length; k += 4) {
                    g.moveTo(bucket[k] ?? 0, bucket[k + 1] ?? 0);
                    g.lineTo(bucket[k + 2] ?? 0, bucket[k + 3] ?? 0);
                }
                g.stroke();
                bucket.length = 0;
            }
        }

        // shockwaves + sparks
        for (const w of ripples) {
            const a = 1 - w.r / RIPPLE_MAX;
            g.strokeStyle = C.accent;
            g.beginPath();
            g.arc(w.x, w.y, w.r, 0, TAU);
            g.globalAlpha = a * 0.45;
            g.lineWidth = 1.5;
            g.stroke();
            g.globalAlpha = a * 0.12;
            g.lineWidth = 18;
            g.stroke();
        }
        if (bursts.length) {
            g.fillStyle = C.good;
            for (const b of bursts) {
                b.k += 0.03;
                if (b.k >= 1) continue;
                b.x += Math.cos(b.a) * b.v;
                b.y += Math.sin(b.a) * b.v;
                b.v *= 0.96;
                g.globalAlpha = 1 - b.k;
                g.beginPath();
                g.arc(b.x, b.y, 2, 0, TAU);
                g.fill();
            }
            bursts = bursts.filter((b) => b.k < 1);
        }

        // successful application pulses along counsellor edges
        if (!reduced && edgeA.length && t % 28 === 0 && pulses.length < MAX_PULSES) {
            const e = Math.floor(Math.random() * edgeA.length);
            const a = edgeA[e];
            const b = edgeB[e];
            if (a && b) pulses.push({ a, b, k: 0 });
        }
        if (pulses.length) {
            g.fillStyle = C.good;
            for (const u of pulses) {
                u.k += 0.022;
                if (u.k >= 1) continue;
                const x = u.a.sx + (u.b.sx - u.a.sx) * u.k;
                const y = u.a.sy + (u.b.sy - u.a.sy) * u.k;
                g.globalAlpha = 0.9;
                g.beginPath();
                g.arc(x, y, 2.2, 0, TAU);
                g.fill();
                g.globalAlpha = 0.25;
                g.beginPath();
                g.arc(x, y, 6, 0, TAU);
                g.fill();
            }
            pulses = pulses.filter((u) => u.k < 1);
        }

        // plain stars, one fill per brightness bucket
        g.fillStyle = C.accent;
        for (let step = 0; step < STAR_STEPS; step++) {
            const z = 0.3 + (0.7 * (step + 0.5)) / STAR_STEPS;
            g.globalAlpha = 0.5 * z + 0.15;
            g.beginPath();
            for (const s of P) {
                if (s.p || s.ab !== step) continue;
                g.moveTo(s.sx + s.r, s.sy);
                g.arc(s.sx, s.sy, s.r, 0, TAU);
            }
            g.fill();
        }

        // counsellors
        hover = null;
        g.font = font;
        g.textAlign = "center";
        for (const s of P) {
            const person = s.p;
            if (!person) continue;
            const col = bandColor(person.band);
            const dxm = mouse.x - s.sx;
            const dym = mouse.y - s.sy;
            const near = drag ? s === drag : finePointer && dxm * dxm + dym * dym < HIT_RADIUS * HIT_RADIUS;
            if (near) hover = s;
            if (s === pinned && !near) {
                g.globalAlpha = 0.9;
                g.strokeStyle = col;
                g.lineWidth = 1.5;
                g.beginPath();
                g.arc(s.sx, s.sy, s.r + 11, 0, TAU);
                g.stroke();
            }
            const pr = s.r + Math.sin((t + s.i * 9) / 22) * 0.8 + (near ? 3 : 0);
            g.fillStyle = col;
            g.globalAlpha = 0.16;
            g.beginPath();
            g.arc(s.sx, s.sy, pr + 7, 0, TAU);
            g.fill();
            g.globalAlpha = 1;
            g.beginPath();
            g.arc(s.sx, s.sy, pr, 0, TAU);
            g.fill();
            g.globalAlpha = 0.9;
            g.fillStyle = C.ink3;
            g.fillText(s.ini, s.sx, s.sy + pr + 11);
        }
        g.globalAlpha = 1;

        // label: content only when the target changes, position every frame
        const target = hover ?? pinned;
        if (target !== shownLabel) {
            shownLabel = target;
            const person = target?.p;
            if (target && person) {
                const col = bandColor(person.band);
                const hint = pinned === target ? "pinned · click to unpin" : "drag me · click to pin";
                label.innerHTML =
                    `<span class="avatar" style="width:24px;height:24px;font-size:9px;background:${col};color:#fff">${escapeHtml(target.ini)}</span>` +
                    `<span><b>${escapeHtml(person.name)}</b>${escapeHtml(person.team)} · <span style="opacity:.6">${hint}</span></span>` +
                    `<span style="font-weight:600;font-variant-numeric:tabular-nums;margin-left:4px;color:${col}">${String(Math.round(person.pct * 100))}%</span>`;
                label.classList.add(labelOnClass);
            } else label.classList.remove(labelOnClass);
        }
        if (target)
            label.style.transform = `translate(${px2(target.sx)},${px2(target.sy)}) translate(-50%,-100%) translateY(-14px)`;
        const wantCursor = drag ? "grabbing" : hover ? "grab" : "";
        if (wantCursor !== cursor) {
            cursor = wantCursor;
            canvas.style.cursor = cursor;
        }
    }

    // ---- loop: runs only while visible and on-screen ----
    let raf = 0;
    let visible = !document.hidden;
    let onScreen = true;
    function tick() {
        raf = 0;
        frame();
        if (visible && onScreen) raf = requestAnimationFrame(tick);
    }
    function start() {
        if (reduced || raf || !visible || !onScreen) return;
        raf = requestAnimationFrame(tick);
    }
    function onVisibility() {
        visible = !document.hidden;
        start();
    }
    const io = new IntersectionObserver(([entry]) => {
        onScreen = entry?.isIntersecting ?? true;
        start();
    });
    const ro = new ResizeObserver(onResize);
    const darkMedia = matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => {
        readColors();
        if (reduced) frame();
    };
    const mo = new MutationObserver(onTheme);

    readColors();
    size();
    build();
    ro.observe(root);
    io.observe(canvas);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    darkMedia.addEventListener("change", onTheme);
    document.addEventListener("visibilitychange", onVisibility);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onCancel);
    if (reduced) frame();
    else start();

    return () => {
        cancelAnimationFrame(raf);
        raf = 0;
        ro.disconnect();
        io.disconnect();
        mo.disconnect();
        darkMedia.removeEventListener("change", onTheme);
        document.removeEventListener("visibilitychange", onVisibility);
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
        root.removeEventListener("pointerdown", onDown);
        root.removeEventListener("pointerup", onUp);
        root.removeEventListener("pointercancel", onCancel);
    };
}
