#!/usr/bin/env python3
"""Met à jour les numéros de version des fichiers dans index.html.

GitHub Pages garde les fichiers en cache une dizaine de minutes : sans version,
un visiteur pourrait mélanger d'anciens et de nouveaux modules juste après une
mise à jour. Chaque fichier reçoit ?v=<empreinte de son contenu>, et la carte
d'import redirige chaque module de la scène vers sa version.

Usage : python3 tools/version.py   (à lancer avant chaque commit)
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'


def stamp(path):
    return hashlib.sha1((ROOT / path).read_bytes()).hexdigest()[:8]


def main():
    html = INDEX.read_text(encoding='utf-8')
    html = re.sub(r'href="public/css/style\.css(\?v=\w+)?"', f'href="public/css/style.css?v={stamp("public/css/style.css")}"', html)
    html = re.sub(r'src="public/js/book\.js(\?v=\w+)?"', f'src="public/js/book.js?v={stamp("public/js/book.js")}"', html)
    html = re.sub(r'src="public/js/scene/main\.js(\?v=\w+)?"', f'src="public/js/scene/main.js?v={stamp("public/js/scene/main.js")}"', html)
    imports = {'three': './public/vendor/three.module.min.js'}
    modules = sorted(p for p in (ROOT / 'public/js/scene').glob('*.js') if p.name not in ('main.js', 'head-worker.js'))
    modules.append(ROOT / 'public/vendor/RoundedBoxGeometry.js')
    for p in modules:
        rel = p.relative_to(ROOT).as_posix()
        imports['./' + rel] = f'./{rel}?v={stamp(rel)}'
    importmap = '<script type="importmap">' + json.dumps({'imports': imports}, ensure_ascii=False) + '</script>'
    html = re.sub(r'<script type="importmap">.*?</script>', importmap, html, flags=re.S)
    INDEX.write_text(html, encoding='utf-8')
    print(f'{len(imports)} entrées dans la carte d\'import')


if __name__ == '__main__':
    main()
