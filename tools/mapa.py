# Generador del mapa vectorial del club (datos © OpenStreetMap, licencia ODbL).
# Uso: descargar la zona con
#   curl -A "static-map-builder/1.0" "https://api.openstreetmap.org/api/0.6/map?bbox=-4.0072,40.5780,-4.0026,40.5806" -o osm.xml
# y generar:
#   python tools/mapa.py osm.xml assets/mapa.svg 380 300 1.2
import sys, math, xml.etree.ElementTree as ET
src, out, W, H, SCALE = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5])
lat0, lon0 = 40.5793361, -4.0049057
def proj(lat, lon):
    return ((lon - lon0) * 111320 * math.cos(math.radians(lat0)) * SCALE + W / 2,
            -(lat - lat0) * 110540 * SCALE + H / 2)
root = ET.parse(src).getroot()
nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}
ways = []
for w in root.iter("way"):
    tags = {t.get("k"): t.get("v") for t in w.iter("tag")}
    pts = [proj(*nodes[nd.get("ref")]) for nd in w.iter("nd") if nd.get("ref") in nodes]
    if len(pts) >= 2 and any(-40 < x < W + 40 and -40 < y < H + 40 for x, y in pts):
        ways.append((tags, pts))
P = lambda pts: "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
widths = {"primary": 10, "secondary": 9, "tertiary": 8.5, "residential": 7, "living_street": 6, "unclassified": 7,
          "pedestrian": 5.5, "service": 3.5, "footway": 1.6, "path": 1.4, "steps": 1.4}
cx, cy = W / 2, H / 2
# zonas ocupadas: punto y etiqueta dorada
TAG = (cx + 14, cy - 52, 112, 46)
def blocked(x, y, pad=6):
    if math.dist((x, y), (cx, cy)) < 20 + pad: return True
    tx, ty, tw, th = TAG
    return tx - pad < x < tx + tw + pad and ty - pad < y < ty + th + pad
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Mapa de la zona del club">',
       f'<rect width="{W}" height="{H}" fill="#0B1626"/>']
for tags, pts in ways:
    if "building" in tags:
        svg.append(f'<path d="{P(pts)}Z" fill="#15233a" stroke="#22365a" stroke-width=".8"/>')
roads = sorted([w for w in ways if w[0].get("highway") in widths], key=lambda w: widths[w[0]["highway"]])
for tags, pts in roads:
    wd = widths[tags["highway"]]
    if wd <= 2: svg.append(f'<path d="{P(pts)}" fill="none" stroke="#3a4d6b" stroke-width="{wd}" stroke-dasharray="3 3"/>')
    else: svg.append(f'<path d="{P(pts)}" fill="none" stroke="#071020" stroke-width="{wd+2}" stroke-linecap="round" stroke-linejoin="round"/>')
for tags, pts in roads:
    wd = widths[tags["highway"]]
    if wd > 2: svg.append(f'<path d="{P(pts)}" fill="none" stroke="#33476a" stroke-width="{wd}" stroke-linecap="round" stroke-linejoin="round"/>')
# --- etiquetas: todas las calles con nombre visibles ---
def short(n):
    for a, b in (("Calle de la ", "C. la "), ("Calle de La ", "C. La "), ("Calle de los ", "C. los "), ("Calle del ", "C. del "), ("Calle de ", "C. "), ("Calle ", "C. "), ("Plaza de ", "Pza. "), ("Plaza ", "Pza. "), ("Avenida de ", "Av. "), ("Avenida ", "Av. "), ("Travesía de ", "Trav. "), ("Camino de ", "Cno. ")):
        if n.startswith(a): return b + n[len(a):]
    return n
def runs(pts):  # tramos dentro del lienzo y fuera de las zonas ocupadas
    out, cur = [], []
    for q in pts:
        ok = 12 < q[0] < W - 12 and 12 < q[1] < H - 12 and not blocked(*q)
        if ok: cur.append(q)
        elif cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return [r for r in out if len(r) >= 2]
length = lambda r: sum(math.dist(r[i], r[i+1]) for i in range(len(r) - 1))
def chains(polys):
    polys = [list(pl) for pl in polys]
    key = lambda q: (round(q[0], 1), round(q[1], 1))
    merged = True
    while merged:
        merged = False
        for a in range(len(polys)):
            for b in range(a + 1, len(polys)):
                A, B = polys[a], polys[b]
                if key(A[-1]) == key(B[0]): polys[a] = A + B[1:]
                elif key(A[-1]) == key(B[-1]): polys[a] = A + B[::-1][1:]
                elif key(A[0]) == key(B[-1]): polys[a] = B + A[1:]
                elif key(A[0]) == key(B[0]): polys[a] = B[::-1] + A[1:]
                else: continue
                del polys[b]; merged = True; break
            if merged: break
    return polys
by = {}
for tags, pts in roads:
    if tags.get("name"): by.setdefault(tags["name"], []).append(pts)
cand = {}; allruns = {}
for n, polys in by.items():
    for ch in chains(polys):
        for r in runs(ch):
            allruns.setdefault(n, []).append(r)
            if length(r) > cand.get(n, (0, None))[0]: cand[n] = (length(r), r)
def obox(cx_, cy_, w, h, ang):
    c, s_ = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return [(cx_ + dx * c - dy * s_, cy_ + dx * s_ + dy * c) for dx, dy in ((-w/2, -h/2), (w/2, -h/2), (w/2, h/2), (-w/2, h/2))]
def rect(x, y, w, h): return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
def hit(A, B):
    for poly in (A, B):
        for k in range(4):
            x1, y1 = poly[k]; x2, y2 = poly[(k + 1) % 4]; nx, ny = y1 - y2, x2 - x1
            pa = [nx * x + ny * y for x, y in A]; pb = [nx * x + ny * y for x, y in B]
            if max(pa) < min(pb) or max(pb) < min(pa): return False
    return True
def overlaps(P_): return sum(1 for Q in placed if hit(P_, Q))
def free(x, y, w, h): return overlaps(rect(x, y, w, h)) == 0
defs, labels, placed = [], [], [rect(TAG[0] - 4, TAG[1] - 4, TAG[2] + 8, TAG[3] + 8), rect(cx - 16, cy - 16, 32, 32), rect(W - 70, H - 15, 70, 15)]

def pt_at(r, frac):
    tot = length(r); goal = tot * frac; acc = 0
    for k in range(len(r) - 1):
        d = math.dist(r[k], r[k+1])
        if acc + d >= goal:
            u = (goal - acc) / d if d else 0
            return (r[k][0] + (r[k+1][0] - r[k][0]) * u, r[k][1] + (r[k+1][1] - r[k][1]) * u)
        acc += d
    return r[-1]
def sub(r, a, b):  # tramo entre las fracciones a y b
    tot = length(r); out = [pt_at(r, a)]; acc = 0
    for k in range(len(r) - 1):
        acc += math.dist(r[k], r[k+1])
        if a * tot < acc < b * tot: out.append(r[k+1])
    out.append(pt_at(r, b)); return out
skipped = []
i = 0
for n, (L, r) in sorted(cand.items(), key=lambda kv: (0 if "Guadarrama" in kv[0] else 1, -kv[1][0])):
    t = short(n); key = "Guadarrama" in n
    base = 11.5 if key else 10
    if r[0][0] > r[-1][0]: r = r[::-1]
    need = lambda f: len(t) * f * 0.6 + 8
    done = False
    tries = [(r, L)]
    if key:
        tries = sorted(((rr, length(rr)) for rr in allruns.get(n, [r])), key=lambda x: min(math.dist(q, (cx, cy)) for q in x[0]))
    for r, L in tries:
      if done: break
      if r[0][0] > r[-1][0]: r = r[::-1]
      for fs in (base, base - 1, base - 2, 8, 7, 6.5):
        if need(fs) > L: continue
        half = need(fs) / 2 / L
        cs = [k / 20 for k in range(1, 20)] if key else [0.5, 0.35, 0.65, 0.25, 0.75]
        if key: cs.sort(key=lambda c: math.dist(pt_at(r, c), (cx, cy)))
        for c in cs:
            a, b = c - half, c + half
            if a < 0 or b > 1: continue
            seg = sub(r, a, b)
            chord = math.dist(seg[0], seg[-1])
            if chord < need(fs) * 0.7: continue          # tramo demasiado curvo
            if length(seg) / max(chord, 1) > 1.15: seg = [seg[0], seg[-1]]
            if seg[0][0] > seg[-1][0]: seg = seg[::-1]
            ang = math.degrees(math.atan2(seg[-1][1] - seg[0][1], seg[-1][0] - seg[0][0]))
            mid = pt_at(seg, 0.5)
            box = obox(mid[0], mid[1], need(fs), fs + 3, ang)
            if overlaps(box): continue
            placed.append(box)
            defs.append(f'<path id="l{i}" d="{P(seg)}"/>')
            labels.append(f'<text font-family="Arial, Helvetica, sans-serif" font-size="{fs:.1f}" font-weight="{700 if key else 400}" fill="{"#F4EFE4" if key else "#b9c3d2"}" paint-order="stroke" stroke="#0B1626" stroke-opacity=".75" stroke-width="1.6" stroke-linejoin="round" dy="3.5"><textPath href="#l{i}" startOffset="50%" text-anchor="middle">{t}</textPath></text>')
            i += 1; done = True; break
        if done: break
    if not done:  # último recurso: rótulo girado sobre la propia calle
        best = None
        for fs in (7.5, 6.8, 6.2):
            w = len(t) * fs * 0.6
            for frac in (0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9):
                mx, my = pt_at(r, frac); a0 = pt_at(r, max(frac - 0.08, 0)); a1 = pt_at(r, min(frac + 0.08, 1))
                ang = math.degrees(math.atan2(a1[1] - a0[1], a1[0] - a0[0]))
                if ang > 90: ang -= 180
                if ang < -90: ang += 180
                box = obox(mx, my, w + 2, fs + 2, ang)
                over = overlaps(box)
                if best is None or over < best[0]: best = (over, mx, my, ang, box, 0, 0, 0, fs)
                if over == 0: break
            if best[0] == 0: break
        if best[0] > 0 or any(not (0 <= qx <= W and 0 <= qy <= H) for qx, qy in best[4]):
            skipped.append(t); continue
        _, mx, my, ang, box, _x, _y, _z, fs = best
        placed.append(box)
        labels.append(f'<text transform="translate({mx:.1f},{my:.1f}) rotate({ang:.1f})" text-anchor="middle" dy="{fs * 0.35:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="{fs}" fill="#b9c3d2" paint-order="stroke" stroke="#0B1626" stroke-opacity=".75" stroke-width="1.6" stroke-linejoin="round">{t}</text>')
svg.append('<defs>' + ''.join(defs) + '</defs>')
svg += labels
svg.append(f'<circle cx="{cx}" cy="{cy}" r="13" fill="#E3A72F" fill-opacity=".25"/><circle cx="{cx}" cy="{cy}" r="7" fill="#E3A72F"/><circle cx="{cx}" cy="{cy}" r="2.8" fill="#0B1626"/>')
tx, ty, tw, th = TAG
svg.append(f'<g transform="translate({tx},{ty})"><rect width="{tw}" height="36" fill="#E3A72F"/><path d="M6 36 L2 46 L16 36 Z" fill="#E3A72F"/><text x="10" y="15" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2" fill="#0B1626">SOUTHPAW</text><text x="10" y="29" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#0B1626">C. Guadarrama, 25</text></g>')
svg.append(f'<text x="{W - 5}" y="{H - 5}" text-anchor="end" font-family="Arial, sans-serif" font-size="7.5" fill="#F4EFE4" fill-opacity=".55" paint-order="stroke" stroke="#0B1626" stroke-opacity=".6" stroke-width="2">© OpenStreetMap</text>')
svg.append('</svg>')
open(out, "w", encoding="utf-8").write("\n".join(svg))
print("calles con nombre en el mapa:", len(cand), "| sin rótulo:", skipped); print(", ".join(sorted(short(n) for n in cand)))
