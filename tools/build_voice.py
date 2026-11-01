#!/usr/bin/env python3
"""Generate the bundled Arabic voice clips for MICROVERSE ESCAPE.

Reads every voiced line from js/data/content.js (plus the mission reaction
lines that are hardcoded inside js/missions/*.js), renders it with edge-tts
into assets/voice/<who>/<hash>.mp3 and writes js/core/voice-manifest.js with
the exact text -> file/duration map.

Run from the project root:
    python tools/build_voice.py
Requires: edge-tts, mutagen (pip install edge-tts mutagen) and internet.
"""
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'js', 'data', 'content.js')
MISSIONS_DIR = os.path.join(ROOT, 'js', 'missions')
OUT_DIR = os.path.join(ROOT, 'assets', 'voice')
MANIFEST = os.path.join(ROOT, 'js', 'core', 'voice-manifest.js')

# NOVA leads and encourages, PIP is the small bright companion,
# ORBIT is the analytical drone — three clearly different timbres.
PROFILES = {
    'nova': {'voice': 'ar-SA-ZariyahNeural', 'rate': '-2%', 'pitch': '+0Hz'},
    'pip': {'voice': 'ar-SY-AmanyNeural', 'rate': '+8%', 'pitch': '+42Hz'},
    'orbit': {'voice': 'ar-LB-RamiNeural', 'rate': '+2%', 'pitch': '+22Hz'},
}

NARRATOR_VOICE = 'nova'

# Reaction lines spoken straight from the mission scripts, so they never
# appear in CV.LINES.  Anything built from a template is listed per variant.
EXTRA = [
    ('pip', 'المحطات الثلاث تعمل. اربطوا كل محطة بما شاهدتموه، لا بما تتوقعونه.'),
    ('nova', 'المحطة أ ما زالت بلا آلية. راجعوا ما شاهدتموه.'),
    ('nova', 'المحطة ب ما زالت بلا آلية. راجعوا ما شاهدتموه.'),
    ('nova', 'المحطة ج ما زالت بلا آلية. راجعوا ما شاهدتموه.'),
    ('orbit', 'الآلية لا تطابق ما شاهدتم في هذه المحطة. أعيدوا قراءة الملاحظة.'),
    ('nova', 'عيّنة واحدة بقيت. قارنوا اتجاه الماء فيها.'),
    ('orbit', 'الاتجاه الذي شاهدتموه لا يطابق هذا النوع. أعيدوا الملاحظة.'),
    ('orbit', 'الماء ما زال يتحرك في اتجاه واحد. اضبطوا التركيز ليتعادل في الاتجاهين.'),
]


def mission_lines():
    """Pull the strings mission 6 speaks from its own SYSTEMS table.

    Reading them from the source keeps the manifest in sync if the science
    wording changes, instead of duplicating it here.
    """
    path = os.path.join(MISSIONS_DIR, 'm6-final.js')
    src = open(path, encoding='utf-8').read()
    out = []
    for scan in re.findall(r"scan:\s*'([^']+)'", src):
        out.append(('pip', scan))
    for cause in re.findall(r"\{\s*t:\s*'([^']+)',\s*ok:\s*true\s*\}", src):
        out.append(('nova', cause))
    return out



def load_lines():
    """Evaluate CV.LINES in node and return [(who, text)]."""
    js = r"""
      global.window = {};
      require(process.argv[1]);
      const CV = global.window.CV;
      const out = Object.keys(CV.LINES).map(k => ({ who: CV.LINES[k].who, text: CV.LINES[k].text }));
      process.stdout.write(JSON.stringify(out));
    """
    code = subprocess.check_output(['node', '-e', js, CONTENT])
    rows = json.loads(code.decode('utf-8'))
    lines = []
    for row in rows:
        who = NARRATOR_VOICE if row['who'] == 'narrator' else row['who']
        lines.append((who, row['text']))
    lines.extend(EXTRA)
    lines.extend(mission_lines())
    seen = set()
    unique = []
    for who, text in lines:
        key = (who, text)
        if key in seen:
            continue
        seen.add(key)
        unique.append(key)
    return unique


def clip_name(who, text):
    digest = hashlib.sha1((who + '|' + text).encode('utf-8')).hexdigest()[:10]
    return who, digest + '.mp3'


async def render(who, text, path, sem, errors):
    import edge_tts
    prof = PROFILES[who]
    async with sem:
        for attempt in range(3):
            tmp = path + '.part'
            try:
                communicate = edge_tts.Communicate(
                    text, prof['voice'], rate=prof['rate'], pitch=prof['pitch']
                )
                await communicate.save(tmp)
                if not os.path.getsize(tmp):
                    raise RuntimeError('empty file')
                os.replace(tmp, path)
                print('  ok %-8s %s' % (who, os.path.basename(path)), flush=True)
                return
            except Exception as exc:  # network hiccups are common
                try:
                    os.remove(tmp)
                except OSError:
                    pass
                if attempt == 2:
                    errors.append((who, text, str(exc)))
                    print('  FAIL %-8s %s (%s)' % (who, text[:40], exc), flush=True)
                    return
                await asyncio.sleep(1.5 * (attempt + 1))


async def main():
    try:
        from mutagen.mp3 import MP3
    except ImportError:
        sys.exit('mutagen is required: pip install edge-tts mutagen')
    lines = load_lines()
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = []
    for who, text in lines:
        folder = os.path.join(OUT_DIR, who)
        os.makedirs(folder, exist_ok=True)
        _, name = clip_name(who, text)
        jobs.append((who, text, os.path.join(folder, name)))
    pending = [job for job in jobs if not os.path.exists(job[2])]
    print('voice clips: %d total, %d to render' % (len(jobs), len(pending)), flush=True)
    sem = asyncio.Semaphore(4)
    errors = []
    await asyncio.gather(*(render(who, text, path, sem, errors) for who, text, path in pending))
    if errors:
        print('\n%d clips failed; rerun to retry them.' % len(errors))
    manifest = {}
    missing = []
    for who, text, path in jobs:
        if not os.path.exists(path):
            missing.append(path)
            continue
        try:
            duration = round(MP3(path).info.length, 2)
        except Exception:
            duration = 0
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        manifest.setdefault(who, {})[text] = {'f': rel, 'd': duration}
    body = json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True)
    header = (
        '/* =========================================================\n'
        '   MICROVERSE ESCAPE — bundled Arabic voice clips\n'
        '   Generated locally with edge-tts (see tools/build_voice.py).\n'
        '   Shape: { nova: { "line text": { f: "assets/voice/nova/xx.mp3", d: 2.4 } }, ... }\n'
        '   The game works without this file (system voice / cartoon fallback).\n'
        '   ========================================================= */\n'
    )
    with open(MANIFEST, 'w', encoding='utf-8') as fh:
        fh.write(header + 'window.CV_VOICE_CLIPS = ' + body + ';\n')
    total = sum(len(v) for v in manifest.values())
    print('manifest: %d clips, %d characters, %d missing' % (total, len(manifest), len(missing)))
    if missing:
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
