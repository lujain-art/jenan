# -*- coding: utf-8 -*-
"""One-shot: replace the lab background in index.html with the microscopic
world + escape portal scene. Regenerable, kept under tools/ for reference."""
import io
import math
import random

CX, CY, R = 800, 430, 172


def arc(cx, cy, r, a0, a1):
    x0 = cx + r * math.cos(math.radians(a0))
    y0 = cy + r * math.sin(math.radians(a0))
    x1 = cx + r * math.cos(math.radians(a1))
    y1 = cy + r * math.sin(math.radians(a1))
    return "M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f" % (x0, y0, r, r, x1, y1)


segs = []
for i in range(6):
    a0 = -90 + i * 60 + 5
    a1 = -90 + (i + 1) * 60 - 5
    segs.append('        <path class="pseg" d="%s"/>' % arc(CX, CY, R, a0, a1))
segs_html = "\n".join(segs)

nodes = []
for i in range(6):
    a = -90 + i * 60 + 30
    x = CX + (R - 34) * math.cos(math.radians(a))
    y = CY + (R - 34) * math.sin(math.radians(a))
    nodes.append('        <circle class="portal-node" cx="%.1f" cy="%.1f" r="9"/>' % (x, y))
nodes_html = "\n".join(nodes)

sparks = []
for i in range(8):
    a = i * 45 + 11
    x = CX + (R + 34) * math.cos(math.radians(a))
    y = CY + (R + 34) * math.sin(math.radians(a))
    sparks.append('        <circle class="portal-spark" cx="%.1f" cy="%.1f" r="5"/>' % (x, y))
sparks_html = "\n".join(sparks)

mitos = []
for (mx, my, mr, rot, cls) in [(250, 640, 1.0, 18, ''), (1330, 250, 0.82, -26, 'd2'), (1450, 690, 0.7, 40, 'd3')]:
    mitos.append('      <g class="drift %s" transform="translate(%d %d) rotate(%d) scale(%.2f)">' % (cls, mx, my, rot, mr))
    mitos.append('        <ellipse rx="86" ry="40" fill="url(#g-mito)" stroke="#3ad2c8" stroke-opacity=".28" stroke-width="2"/>')
    mitos.append('        <path class="mito-ring" d="M-62 6q22-26 44-4t44-4" fill="none" stroke="#7ff0e0" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/>')
    mitos.append('        <path class="mito-ring" d="M-58 -12q24-20 46 0t44-2" fill="none" stroke="#7ff0e0" stroke-opacity=".26" stroke-width="3.4" stroke-linecap="round"/>')
    mitos.append('      </g>')
mitos_html = "\n".join(mitos)

ribs = []
for i in range(7):
    ribs.append('        <path class="er-rib" d="M150 %d q34 -26 68 0 t68 0" fill="none" stroke="#6fd8ff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"/>' % (200 + i * 34))
ribs_html = "\n".join(ribs)

random.seed(7)
dots = []
for i in range(46):
    x = random.randint(60, 1540)
    y = random.randint(60, 840)
    r = round(random.uniform(1.6, 4.2), 1)
    dots.append('      <circle class="twinkle" cx="%d" cy="%d" r="%.1f" fill="#c9f6ff" opacity=".4"/>' % (x, y, r))
dots_html = "\n".join(dots)

BLOCK = '''  <div class="world" id="world" data-keys="0" aria-hidden="true">
    <svg class="world-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="g-cyto" cx=".5" cy=".42" r=".78">
          <stop offset="0" stop-color="#0d2b52"/>
          <stop offset=".45" stop-color="#0a1c3d"/>
          <stop offset="1" stop-color="#04081a"/>
        </radialGradient>
        <radialGradient id="g-cyto-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#5ff8e6" stop-opacity=".3"/>
          <stop offset="1" stop-color="#5ff8e6" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="g-mito" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1d6f8a" stop-opacity=".8"/>
          <stop offset="1" stop-color="#0d3550" stop-opacity=".7"/>
        </linearGradient>
        <radialGradient id="g-nucleus" cx=".36" cy=".3" r=".8">
          <stop offset="0" stop-color="#2f6fa8" stop-opacity=".8"/>
          <stop offset="1" stop-color="#122a52" stop-opacity=".72"/>
        </radialGradient>
        <radialGradient id="g-portal" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".92"/>
          <stop offset=".32" stop-color="#7ef7ff" stop-opacity=".7"/>
          <stop offset=".68" stop-color="#5ff8e6" stop-opacity=".3"/>
          <stop offset="1" stop-color="#2b7fd6" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g-halo" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#9ffcff" stop-opacity=".55"/>
          <stop offset="1" stop-color="#9ffcff" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="g-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#8ff9ff" stop-opacity=".55"/>
          <stop offset="1" stop-color="#8ff9ff" stop-opacity="0"/>
        </linearGradient>
        <filter id="f-soft" x="-40%%" y="-40%%" width="180%%" height="180%%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
      </defs>

      <!-- cytoplasm field -->
      <rect width="1600" height="900" fill="url(#g-cyto)"/>
      <ellipse class="cytoglow" cx="800" cy="400" rx="720" ry="430" fill="url(#g-cyto-glow)"/>

      <!-- cell membrane boundary -->
      <path d="M80 450c0-190 260-350 720-350s720 160 720 350-250 380-720 380S80 640 80 450z"
        fill="none" stroke="#4fe6ff" stroke-opacity=".16" stroke-width="7"/>
      <path d="M104 450c0-176 246-328 696-328s696 152 696 328-242 356-696 356S104 626 104 450z"
        fill="none" stroke="#7be7ff" stroke-opacity=".09" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>

      <!-- endoplasmic reticulum -->
      <g class="drift d4" opacity=".75">
%s
      </g>

      <!-- nucleus -->
      <g class="drift d2" transform="translate(1290 720)">
        <circle r="118" fill="url(#g-nucleus)" stroke="#6fd8ff" stroke-opacity=".22" stroke-width="4"/>
        <circle r="118" fill="none" stroke="#9ffcff" stroke-opacity=".14" stroke-width="2" stroke-dasharray="4 10"/>
        <circle class="nucleolus" r="34" cx="14" cy="-10" fill="#ffd166" opacity=".5"/>
      </g>

      <!-- mitochondria -->
%s

      <!-- cytoskeleton fibres -->
      <g stroke="#5ff8e6" stroke-opacity=".1" stroke-width="2.4" fill="none">
        <path d="M0 760q420-140 820-40t780-120"/>
        <path d="M0 300q380 150 800 60t800 130"/>
        <path d="M180 900q240-320 200-640"/>
        <path d="M1240 0q-120 340 60 660"/>
      </g>

      <!-- ================= THE ESCAPE PORTAL ================= -->
      <g class="portal">
        <circle class="portal-halo" cx="%d" cy="%d" r="330" fill="url(#g-halo)" filter="url(#f-soft)"/>
        <rect class="portal-beam" x="%d" y="0" width="150" height="%d" fill="url(#g-beam)"/>
        <circle class="portal-ring" cx="%d" cy="%d" r="%d" fill="none" stroke="#2e6f9c" stroke-opacity=".5" stroke-width="3"/>
        <circle class="portal-ring" cx="%d" cy="%d" r="%d" fill="none" stroke="#2e6f9c" stroke-opacity=".28" stroke-width="2" stroke-dasharray="6 12"/>
        <g fill="none" stroke="url(#g-portal)" stroke-width="15" stroke-linecap="round">
%s
        </g>
        <g fill="#0a2340" stroke="#7ef7ff" stroke-opacity=".5" stroke-width="2.5">
%s
        </g>
        <circle class="portal-core" cx="%d" cy="%d" r="104" fill="url(#g-portal)"/>
        <g class="portal-spin">
          <circle cx="%d" cy="%d" r="58" fill="none" stroke="#d6feff" stroke-opacity=".55" stroke-width="3" stroke-dasharray="18 12"/>
        </g>
        <g fill="#eaffff">
%s
        </g>
        <g class="portal-lock" transform="translate(%d %d)">
          <rect x="-26" y="-4" width="52" height="40" rx="10" fill="#122a52" stroke="#8fb6d8" stroke-width="3"/>
          <path d="M-14 -4v-12a14 14 0 0 1 28 0v12" fill="none" stroke="#8fb6d8" stroke-width="5"/>
          <circle cx="0" cy="15" r="5" fill="#ffd166"/>
        </g>
      </g>

      <!-- suspended matter -->
%s
    </svg>

    <div class="world-vignette"></div>
    <div class="world-wash"></div>
    <canvas id="dust" class="dust-canvas"></canvas>
    <div class="ambient-bubbles" id="ambient-bubbles"></div>
  </div>''' % (ribs_html, mitos_html,
              CX, CY, CX - 75, CY,
              CX, CY, R + 22, CX, CY, R - 58,
              segs_html, nodes_html, CX, CY, CX, CY,
              sparks_html, CX, CY - 6, dots_html)

lines = io.open('index.html', encoding='utf-8').read().split('\n')
assert 'lab-bg' in lines[51], lines[51]
assert lines[344].strip() == '</div>', lines[344]
new = lines[:51] + BLOCK.split('\n') + lines[345:]
io.open('index.html', 'w', encoding='utf-8', newline='').write('\n'.join(new))
print('world block replaced; line count', len(new))
