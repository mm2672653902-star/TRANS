#!/usr/bin/env python3
"""Build dist/trans-single.html — a single self-contained TRANS file.

Why: opening index.html alone in the Muse/Android file viewer serves only
that one file. Relative links to styles.css / config.js / app.js (and Google
Fonts, blocked without a VPN) then fail, so the page renders as unstyled
default HTML. This build inlines everything, so the file works opened alone.

Usage: python3 scripts/build-single.py   (run from ~/workspace/live-translator)
Output: dist/trans-single.html (public defaults: enableBalance=false, no keys)
No API keys are read or written by this script.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "trans-single.html"


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def main():
    html = read("index.html")
    css = read("styles.css")
    config = read("config.js")
    app = read("app.js")

    # Safety: never inline a real key. config.js must stay empty in the repo.
    if "gsk_" in config or re.search(r"[0-9a-f]{40}", config):
        sys.exit("ABORT: config.js looks like it contains a real key — refusing to inline it.")

    # No literal </script> or </style> inside the inlined JS/CSS (would break the file).
    assert "</script" not in app.lower(), "app.js contains </script>"
    assert "</style" not in css.lower(), "styles.css contains </style>"

    # 1. Drop external font links (already removed from index.html; belt & braces).
    html = re.sub(r'<link[^>]*fonts\.googleapis\.com[^>]*>\s*', '', html)
    html = re.sub(r'<link[^>]*fonts\.gstatic\.com[^>]*>\s*', '', html)

    # 2. Inline the stylesheet.
    html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        '<style>\n' + css + '\n</style>', 1)
    assert '<link rel="stylesheet"' not in html, "styles.css link was not inlined"
    assert 'href="styles.css"' not in html, "styles.css href remains"

    # 3. Inline the icon as a data-URI favicon (bright mint version, do not revert
    #    to the old dark navy icon). External icon/manifest links are dropped so
    #    the single file has no sibling dependencies.
    svg = (ROOT / "assets" / "icon.svg").read_bytes()
    assert b"#101828" not in svg, "icon.svg is still the dark version — aborting"
    data_uri = "data:image/svg+xml;base64," + base64.b64encode(svg).decode()
    html = re.sub(r'<link rel="icon"[^>]*>\s*', f'<link rel="icon" href="{data_uri}">\n', html, count=1)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\s*', '', html)
    html = re.sub(r'<link rel="manifest"[^>]*>\s*', '', html)

    # 4. Inline config + app JS, in load order.
    html = html.replace(
        '<script src="config.js"></script>',
        '<script>\n' + config + '\n</script>', 1)
    html = html.replace(
        '<script src="app.js"></script>',
        '<script>\n' + app + '\n</script>', 1)
    assert 'src="config.js"' not in html and 'src="app.js"' not in html, "JS was not inlined"

    # 5. No remaining external font loads (the string may still appear in an
    #    explanatory HTML comment — that is not a load). Only <link> tags count.
    assert 'href="https://fonts.googleapis.com' not in html, "Google Fonts link remains"
    assert 'href="https://fonts.gstatic.com' not in html, "Google Fonts preconnect remains"
    assert not re.search(r'<link[^>]*fonts\.g(?:oogleapis|static)\.com', html), "Google Fonts <link> remains"

    # 6. Update the mic note: file:// still cannot give mic access in most
    #    browsers, so say so plainly in the single-file build (tolerant:
    #    the note text changed in the redesign — only replace if present).
    html = html.replace(
        "页面须用 https 或 localhost 打开才能用麦克风。",
        "页面须用 https 或 localhost 打开才能用麦克风。直接用文件打开只能看界面、填设置，开始同传会提示无麦克风。")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
    print(f"  css inlined: {len(css)} chars, config: {len(config)} chars, app.js: {len(app)} chars")
    print("  checks: no styles.css/app.js/config.js links, no Google Fonts, bright icon inlined")


if __name__ == "__main__":
    main()
