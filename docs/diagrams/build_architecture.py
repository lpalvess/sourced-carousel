"""Gera docs/diagrams/architecture.<lang>.excalidraw a partir de um único layout.

Uso: python3 docs/diagrams/build_architecture.py
"""

import json
from pathlib import Path

LABELS = {
    "pt": {
        "zone_out": "Fora do container (com rede)",
        "zone_in": "Container sem rede (--network none, somente leitura)",
        "zone_res": "Única pasta gravável",
        "source": "Fonte original\n(artigo, relatório)",
        "author": "Você ou o agente\n(skill)",
        "facts": "fatos.md\nnúmero + trecho literal + link",
        "slides": "slides.json\ntexto dos slides",
        "validate": "validate\nregras + cada número\ncontra os fatos",
        "render": "render\nSatori (SVG)\nresvg (PNG)",
        "pdf": "pdf\nmonta o carrossel",
        "out": "out/\nPNGs + carousel.pdf",
        "fail": "Número fora dos fatos:\nreprova, sem PDF",
                "a_ok": "ok",
        "a_err": "erro",
    },
    "en": {
        "zone_out": "Outside the container (with network)",
        "zone_in": "Container with no network (--network none, read-only)",
        "zone_res": "Only writable folder",
        "source": "Original source\n(article, report)",
        "author": "You or the agent\n(skill)",
        "facts": "facts.md\nnumber + literal quote + link",
        "slides": "slides.json\nslide text",
        "validate": "validate\nrules + every number\nagainst the facts",
        "render": "render\nSatori (SVG)\nresvg (PNG)",
        "pdf": "pdf\nbuilds the carousel",
        "out": "out/\nPNGs + carousel.pdf",
        "fail": "Number not in facts:\nrejected, no PDF",
                "a_ok": "ok",
        "a_err": "error",
    },
}

DARK = "#1e1e1e"
BLUE, GREEN, YELLOW, RED, CYAN = "#a5d8ff", "#b2f2bb", "#ffd43b", "#ffc9c9", "#96f2d7"

# id: (x, y, w, h, cor)
BOXES = {
    "source": (80, 100, 240, 100, BLUE),
    "author": (420, 100, 240, 100, BLUE),
    "facts": (240, 300, 300, 100, YELLOW),
    "slides": (600, 300, 300, 100, YELLOW),
    "validate": (240, 600, 660, 100, GREEN),
    "fail": (80, 780, 260, 90, RED),
    "render": (420, 780, 240, 100, GREEN),
    "pdf": (740, 780, 240, 100, GREEN),
    "out": (1100, 780, 260, 100, CYAN),
}

# (id, x, y, w, h, contorno, fundo, título embaixo)
ZONES = [
    ("zone_out", 40, 40, 1000, 420, "#4c6ef5", "#dbe4ff", False),
    ("zone_in", 40, 520, 1000, 440, "#2f9e44", "#d3f9d8", True),
    ("zone_res", 1060, 700, 340, 260, "#0c8599", "#c5f6fa", True),
]

# (id, de, para, ponto de saída, ponto de chegada, rótulo, tracejada)
ARROWS = [
    ("a1", "source", "author", (320, 150), (420, 150), None, False),
    ("a2", "author", "facts", (540, 200), (390, 300), None, False),
    ("a3", "author", "slides", (540, 200), (750, 300), None, False),
    ("a4", "facts", "validate", (390, 400), (390, 600), None, False),
    ("a5", "slides", "validate", (750, 400), (750, 600), None, False),
    ("a6", "validate", "fail", (300, 700), (210, 780), "a_err", True),
    ("a7", "validate", "render", (540, 700), (540, 780), "a_ok", False),
    ("a8", "render", "pdf", (660, 830), (740, 830), None, False),
    ("a9", "pdf", "out", (980, 830), (1100, 830), None, False),
]

INDEX_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def base(eid, etype, x, y, w, h, n):
    return {
        "id": eid, "type": etype, "x": x, "y": y, "width": w, "height": h,
        "angle": 0, "strokeColor": DARK, "backgroundColor": "transparent",
        "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
        "roughness": 1, "opacity": 100, "groupIds": [], "frameId": None,
        "index": "a" + INDEX_CHARS[n], "roundness": {"type": 3},
        "seed": 1000 + n * 7919, "version": 1, "versionNonce": 2000 + n * 104729,
        "isDeleted": False, "boundElements": [], "updated": 1760486400000,
        "link": None, "locked": False,
    }


def text(eid, x, y, w, h, value, size, n, container=None, align="center"):
    t = base(eid, "text", x, y, w, h, n)
    t.update({
        "strokeColor": DARK, "roundness": None, "text": value,
        "originalText": value, "fontSize": size, "fontFamily": 5,
        "textAlign": align, "verticalAlign": "middle" if container else "top",
        "containerId": container, "lineHeight": 1.25, "autoResize": True,
    })
    return t


def build(lang):
    L = LABELS[lang]
    shapes, arrows, texts = [], [], []
    n = 0

    for zid, x, y, w, h, stroke, fill, _ in ZONES:
        z = base(zid, "rectangle", x, y, w, h, n)
        z.update({"strokeColor": stroke, "backgroundColor": fill, "strokeWidth": 1,
                  "strokeStyle": "dashed", "roughness": 0, "opacity": 35})
        shapes.append(z)
        n += 1

    by_id = {}
    for bid, (x, y, w, h, color) in BOXES.items():
        b = base(bid, "rectangle", x, y, w, h, n)
        b["backgroundColor"] = color
        b["boundElements"] = [{"type": "text", "id": f"t-{bid}"}]
        shapes.append(b)
        by_id[bid] = b
        n += 1

    for aid, src, dst, (sx, sy), (dx, dy), label, dashed in ARROWS:
        a = base(aid, "arrow", sx, sy, abs(dx - sx), abs(dy - sy), n)
        a.update({
            "roundness": {"type": 2}, "points": [[0, 0], [dx - sx, dy - sy]],
            "lastCommittedPoint": None, "startArrowhead": None, "endArrowhead": "arrow",
            "startBinding": {"elementId": src, "focus": 0, "gap": 1},
            "endBinding": {"elementId": dst, "focus": 0, "gap": 1},
            "strokeStyle": "dashed" if dashed else "solid",
        })
        if label:
            a["boundElements"] = [{"type": "text", "id": f"t-{aid}"}]
        by_id[src]["boundElements"].append({"type": "arrow", "id": aid})
        by_id[dst]["boundElements"].append({"type": "arrow", "id": aid})
        arrows.append((a, label))
        n += 1

    for zid, x, y, w, h, stroke, _, bottom in ZONES:
        ty = y + h - 40 if bottom else y + 12
        t = text(f"t-{zid}", x + 20, ty, w - 40, 28, L[zid], 22, n, align="left")
        t["strokeColor"] = stroke
        texts.append(t)
        n += 1

    for bid, (x, y, w, h, _) in BOXES.items():
        value = L[bid]
        lines = value.count("\n") + 1
        th = lines * 20 * 1.25
        texts.append(text(f"t-{bid}", x + 10, y + (h - th) / 2, w - 20, th, value, 20, n, container=bid))
        n += 1

    for a, label in arrows:
        if not label:
            continue
        value = L[label]
        tw = max(40, len(value) * 9)
        mx = a["x"] + a["points"][1][0] / 2 - tw / 2
        my = a["y"] + a["points"][1][1] / 2 - 11
        texts.append(text(f"t-{a['id']}", mx, my, tw, 22, value, 16, n, container=a["id"]))
        n += 1

    elements = shapes + [a for a, _ in arrows] + texts
    return {
        "type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
        "elements": elements,
        "appState": {"gridSize": 20, "viewBackgroundColor": "#ffffff"},
        "files": {},
    }


if __name__ == "__main__":
    here = Path(__file__).parent
    for lang in LABELS:
        out = here / f"architecture.{lang}.excalidraw"
        out.write_text(json.dumps(build(lang), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(out)
