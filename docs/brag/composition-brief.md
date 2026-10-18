# Hyperframes Composition Brief: Acerola Ticket (PT-BR)

Derivado do brief do acerola-reader (`acerola-reader/docs/github/ptbr/brag/composition-brief.md`).
A identidade visual, os tempos de cena, a trilha, os SFX e as transições seguem aquele brief; a
diferença está no conteúdo das cenas (ver `brag-plan.md`).

## Diferenças em relação ao reader

- Os cards usam a proporção dos prints (1568x766, 2.047:1) em vez de telefone/desktop.
- Em vez da varredura de QR, os prints têm movimento próprio: push-in no Painel e nos Chamados,
  panorâmica lateral no Kanban e push-in no Cronograma.
- O hero empilha dois cards (Projetos atrás, Cronograma na frente) com a legenda à direita.
- Ícones dos três fatos: escudo (acesso), relógio com seta (auto-update), documento (relatórios).

## Render

O `ffmpeg` do Fedora (`ffmpeg-free`) não tem `libx264`, e o `render` em MP4 do HyperFrames falha.
O caminho usado:

```sh
cd docs/brag/composition
npx --yes hyperframes@0.8.86 check
npx --yes hyperframes@0.8.86 render --format webm -q delivery -f 30 -o /tmp/brag.webm
# o WebM sai com alfa: compor sobre o fundo #11111b antes de codificar em H.264
ffmpeg -c:v libvpx-vp9 -i /tmp/brag.webm -f lavfi -i color=c=0x11111b:s=1920x1080:r=30:d=23.517 \
  -filter_complex "[1:v][0:v]overlay=format=auto:shortest=1,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libopenh264 -b:v 10M -maxrate 14M -c:a aac -b:a 192k \
  -movflags +faststart ../brag.mp4
ffmpeg -ss 12.5 -i ../brag.mp4 -frames:v 1 -q:v 2 ../brag.jpg
```
