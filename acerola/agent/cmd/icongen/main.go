// Command icongen rasterizes an SVG source into a multi-resolution Windows
// .ico file. It exists because the tray (fyne.io/systray) needs an .ico, but
// our source assets are SVG. Kept as a small one-off tool rather than a
// build-time dependency so the agent binary itself never needs an SVG
// rasterizer at runtime — see docs/ICONES.md for the full rationale.
package main

import (
	"bytes"
	"encoding/binary"
	"flag"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"log"
	"os"

	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
)

func main() {
	src := flag.String("src", "", "caminho do arquivo .svg de origem")
	out := flag.String("out", "", "caminho do arquivo .ico de destino")
	sizesFlag := flag.String("sizes", "16,32,48,256", "tamanhos (px) a incluir no .ico, separados por vírgula")
	flag.Parse()

	if *src == "" || *out == "" {
		log.Fatal("uso: icongen -src arquivo.svg -out arquivo.ico [-sizes 16,32,48,256]")
	}

	sizes, err := parseSizes(*sizesFlag)
	if err != nil {
		log.Fatalf("tamanhos inválidos: %v", err)
	}

	icon, err := loadSVG(*src)
	if err != nil {
		log.Fatalf("erro lendo svg: %v", err)
	}

	var pngs [][]byte
	for _, size := range sizes {
		img := rasterize(icon, size)
		var buf bytes.Buffer
		if err := png.Encode(&buf, img); err != nil {
			log.Fatalf("erro codificando png %dx%d: %v", size, size, err)
		}
		pngs = append(pngs, buf.Bytes())
	}

	if err := writeICO(*out, sizes, pngs); err != nil {
		log.Fatalf("erro escrevendo ico: %v", err)
	}

	fmt.Printf("gerado %s com tamanhos %v\n", *out, sizes)
}

func parseSizes(raw string) ([]int, error) {
	var sizes []int
	start := 0
	for i := 0; i <= len(raw); i++ {
		if i == len(raw) || raw[i] == ',' {
			var n int
			if _, err := fmt.Sscanf(raw[start:i], "%d", &n); err != nil {
				return nil, err
			}
			sizes = append(sizes, n)
			start = i + 1
		}
	}
	return sizes, nil
}

func loadSVG(path string) (*oksvg.SvgIcon, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return oksvg.ReadIconStream(f)
}

// rasterize desenha o SVG num quadrado size x size, preservando a proporção
// original e centralizando (letterboxing) quando o viewBox não é quadrado.
func rasterize(icon *oksvg.SvgIcon, size int) image.Image {
	icon.SetTarget(0, 0, float64(size), float64(size))
	rgba := image.NewRGBA(image.Rect(0, 0, size, size))
	draw.Draw(rgba, rgba.Bounds(), image.Transparent, image.Point{}, draw.Src)
	scanner := rasterx.NewScannerGV(size, size, rgba, rgba.Bounds())
	raster := rasterx.NewDasher(size, size, scanner)
	icon.Draw(raster, 1.0)
	return rgba
}

// writeICO grava um .ico no formato moderno (PNG embutido por entrada), que
// o Windows suporta desde o Vista e que evita reimplementar o encoder BMP/DIB.
func writeICO(path string, sizes []int, pngs [][]byte) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	count := len(sizes)
	header := make([]byte, 6)
	binary.LittleEndian.PutUint16(header[0:2], 0) // reserved
	binary.LittleEndian.PutUint16(header[2:4], 1) // type: icon
	binary.LittleEndian.PutUint16(header[4:6], uint16(count))
	if _, err := f.Write(header); err != nil {
		return err
	}

	offset := uint32(6 + count*16)
	for i, size := range sizes {
		entry := make([]byte, 16)
		dim := byte(size)
		if size >= 256 {
			dim = 0 // 0 significa 256 no formato ICO
		}
		entry[0] = dim                                // width
		entry[1] = dim                                // height
		entry[2] = 0                                  // color count (0 = mais de 256 cores)
		entry[3] = 0                                  // reserved
		binary.LittleEndian.PutUint16(entry[4:6], 1)  // color planes
		binary.LittleEndian.PutUint16(entry[6:8], 32) // bits per pixel
		binary.LittleEndian.PutUint32(entry[8:12], uint32(len(pngs[i])))
		binary.LittleEndian.PutUint32(entry[12:16], offset)
		if _, err := f.Write(entry); err != nil {
			return err
		}
		offset += uint32(len(pngs[i]))
	}

	for _, data := range pngs {
		if _, err := f.Write(data); err != nil {
			return err
		}
	}
	return nil
}
