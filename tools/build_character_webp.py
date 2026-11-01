#!/usr/bin/env python3
"""Assemble the rendered PNG frames into animated WebP character loops.

Reads tools/.frames/<char>/<state>/*.png (produced by tools/render_characters.js)
and writes assets/characters/<char>-<state>.webp with transparency preserved.

    python tools/build_character_webp.py
Requires: Pillow (pip install pillow).
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES_DIR = os.path.join(ROOT, 'tools', '.frames')
OUT_DIR = os.path.join(ROOT, 'assets', 'characters')
SIZE = (480, 640)
DURATION = {'idle': 90, 'talk': 80, 'happy': 80, 'sad': 110, 'surprised': 90, 'wave': 90}
CHARS = {'nova': ['idle', 'talk', 'happy', 'sad', 'surprised', 'wave'],
         'pip': ['idle', 'talk', 'happy', 'sad', 'surprised'],
         'orbit': ['idle', 'talk', 'happy', 'sad', 'surprised']}


def load_state(char, state):
    folder = os.path.join(FRAMES_DIR, char, state)
    if not os.path.isdir(folder):
        return []
    files = sorted(f for f in os.listdir(folder) if f.endswith('.png'))
    frames = []
    for name in files:
        with Image.open(os.path.join(folder, name)) as im:
            if im.size != SIZE:
                im = im.resize(SIZE, Image.LANCZOS)
            frames.append(im.convert('RGBA'))
    return frames


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    missing = []
    for char, states in CHARS.items():
        for state in states:
            frames = load_state(char, state)
            if len(frames) < 4:
                missing.append('%s/%s (%d frames)' % (char, state, len(frames)))
                continue
            out = os.path.join(OUT_DIR, '%s-%s.webp' % (char, state))
            frames[0].save(
                out, format='WEBP', save_all=True, append_images=frames[1:],
                duration=DURATION.get(state, 90), loop=0, quality=82,
                alpha_quality=92, method=6, minimize_size=True
            )
            with Image.open(out) as check:
                count = getattr(check, 'n_frames', 1)
            print('  %-6s %-11s %2d frames  %6.1f KB' % (
                char, state, count, os.path.getsize(out) / 1024.0))
    if missing:
        print('\nmissing frame sets: ' + ', '.join(missing))
        sys.exit(1)


if __name__ == '__main__':
    main()
