#!/usr/bin/env bash
# Baixa fotos públicas de teste do próprio MediaPipe (Google) e cria variações de luz.
# As fotos NÃO vão para o git (testes/fixtures está no .gitignore) e só servem para teste local.
set -euo pipefail
cd "$(dirname "$0")/.."
D=testes/fixtures/fotos
mkdir -p "$D"
for f in portrait.jpg business-person.png face_stylizer_raw_face_demo.png man-woman-okay.jpg portrait_rotated.jpg portrait_small.jpg; do
  [ -f "$D/$f" ] || curl -sSf -o "$D/$f" "https://storage.googleapis.com/mediapipe-assets/$f"
done
python3 - <<'PY'
from PIL import Image, ImageFilter
import json, os
D = "testes/fixtures/fotos"
R = "testes/fixtures/raw"
os.makedirs(R, exist_ok=True)
base = Image.open(f"{D}/face_stylizer_raw_face_demo.png").convert("RGB").resize((768, 768), Image.LANCZOS)
base.save(f"{D}/rosto-frontal.png")
# Variações de luz: mesma pessoa, com dominante de cor (para testar o balanço de branco)
def tingir(im, ganho):
    r, g, b = im.split()
    return Image.merge("RGB", [c.point(lambda v, k=k: min(255, int(v * k))) for c, k in zip((r, g, b), ganho)])
tingir(base, (0.88, 0.95, 1.12)).save(f"{D}/rosto-luz-fria.png")
tingir(base, (1.10, 1.00, 0.80)).save(f"{D}/rosto-luz-quente.png")
base.point(lambda v: int(v * 0.45)).save(f"{D}/rosto-escuro.png")
base.filter(ImageFilter.GaussianBlur(6)).save(f"{D}/rosto-desfocado.png")
# Pixels crus (RGB) para os testes em Node
for nome in sorted(os.listdir(D)):
    im = Image.open(f"{D}/{nome}").convert("RGB")
    stem = os.path.splitext(nome)[0]
    open(f"{R}/{stem}.rgb", "wb").write(im.tobytes())
    json.dump({"largura": im.width, "altura": im.height}, open(f"{R}/{stem}.json", "w"))
print("fixtures prontas:", len(os.listdir(D)), "fotos")
PY
