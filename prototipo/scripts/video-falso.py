# Gera um vídeo .y4m (formato que o Chromium aceita como "câmera falsa") a partir de uma foto,
# com um leve balanço de cabeça para testar o espelho ao vivo. Uso: python3 scripts/video-falso.py foto.png saida.y4m
import sys, math
from PIL import Image
foto, saida = sys.argv[1], sys.argv[2]
W, H, N = 640, 480, 60
base = Image.open(foto).convert("RGB")
esc = H / base.height * 1.05
base = base.resize((int(base.width * esc), int(base.height * esc)), Image.LANCZOS)
with open(saida, "wb") as f:
    f.write(f"YUV4MPEG2 W{W} H{H} F30:1 Ip A1:1 C420jpeg\n".encode())
    for i in range(N):
        dx = int(6 * math.sin(i / N * 2 * math.pi))
        quadro = Image.new("RGB", (W, H), (230, 222, 214))
        quadro.paste(base, ((W - base.width) // 2 + dx, (H - base.height) // 2))
        y, u, v = quadro.convert("YCbCr").split()
        f.write(b"FRAME\n")
        f.write(y.tobytes())
        f.write(u.resize((W // 2, H // 2)).tobytes())
        f.write(v.resize((W // 2, H // 2)).tobytes())
print("ok", saida)
