// Command icongen transforma um SVG de origem num .ico do Windows com várias
// resoluções. Existe porque a bandeja (fyne.io/systray) exige um .ico, mas os
// ícones de origem são SVG. É uma ferramenta avulsa, não uma dependência do
// binário final — assim o agente em si nunca precisa de um rasterizador de
// SVG em tempo de execução. A justificativa completa está em docs/ICONES.md.
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
	"strconv"
	"strings"

	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
)

func main() {
	src := flag.String("src", "", "caminho do arquivo .svg de origem")
	out := flag.String("out", "", "caminho do arquivo .ico de destino")
	sizesFlag := flag.String("sizes", "16,32,48,256", "tamanhos (px) a incluir no .ico, separados por vírgula")
	flag.Parse()

	if *src == "" || *out == "" {
		log.Fatal("usage: icongen -src file.svg -out file.ico [-sizes 16,32,48,256]")
	}

	sizes, err := parseSizes(*sizesFlag)
	if err != nil {
		log.Fatalf("invalid sizes: %v", err)
	}

	icon, err := loadSVG(*src)
	if err != nil {
		log.Fatalf("error reading svg: %v", err)
	}

	var pngs [][]byte
	for _, size := range sizes {
		img := rasterize(icon, size)
		var buf bytes.Buffer
		if err := png.Encode(&buf, img); err != nil {
			log.Fatalf("error encoding png %dx%d: %v", size, size, err)
		}
		pngs = append(pngs, buf.Bytes())
	}

	if err := writeICO(*out, sizes, pngs); err != nil {
		log.Fatalf("error writing ico: %v", err)
	}

	fmt.Printf("generated %s with sizes %v\n", *out, sizes)
}

func parseSizes(raw string) ([]int, error) {
	parts := strings.Split(raw, ",")
	sizes := make([]int, 0, len(parts))
	for _, part := range parts {
		size, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil {
			return nil, fmt.Errorf("tamanho inválido %q: %w", part, err)
		}
		sizes = append(sizes, size)
	}
	return sizes, nil
}

func loadSVG(path string) (*oksvg.SvgIcon, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = file.Close() }() // leitura; erro no close não muda o resultado já lido
	return oksvg.ReadIconStream(file)
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
	file, err := os.Create(path)
	if err != nil {
		return err
	}

	count := len(sizes)
	header := make([]byte, 6)
	binary.LittleEndian.PutUint16(header[0:2], 0) // reservado
	binary.LittleEndian.PutUint16(header[2:4], 1) // tipo: ícone
	binary.LittleEndian.PutUint16(header[4:6], uint16(count))
	if _, err := file.Write(header); err != nil {
		return err
	}

	offset := uint32(6 + count*16)
	for index, size := range sizes {
		entry := make([]byte, 16)
		dim := byte(size)
		if size >= 256 {
			dim = 0 // 0 significa 256 no formato ICO
		}
		entry[0] = dim                                // largura
		entry[1] = dim                                // altura
		entry[2] = 0                                  // contagem de cores (0 = mais de 256 cores)
		entry[3] = 0                                  // reservado
		binary.LittleEndian.PutUint16(entry[4:6], 1)  // planos de cor
		binary.LittleEndian.PutUint16(entry[6:8], 32) // bits por pixel
		binary.LittleEndian.PutUint32(entry[8:12], uint32(len(pngs[index])))
		binary.LittleEndian.PutUint32(entry[12:16], offset)
		if _, err := file.Write(entry); err != nil {
			return err
		}
		offset += uint32(len(pngs[index]))
	}

	for _, data := range pngs {
		if _, err := file.Write(data); err != nil {
			return err
		}
	}
	return file.Close() // aqui o erro importa: é onde uma falha de flush em disco apareceria
}
