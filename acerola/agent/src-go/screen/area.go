// Package screen descreve a área útil de um monitor. O tipo Area vale em
// qualquer sistema; a leitura nativa (ActiveArea) só existe no Windows — ver
// workarea_windows.go. Fora dele quem monta a Area é o próprio app, a partir
// do que o Wails informa (ver app_other.go).
package screen

// Area é o retângulo útil de um monitor em pixels físicos e coordenadas
// absolutas da área de trabalho: com dois monitores lado a lado, o da
// direita começa onde o da esquerda termina (X = 1920, por exemplo), e um
// monitor à esquerda do principal tem X negativo.
type Area struct {
	X, Y, Width, Height int

	// Scale é o zoom configurado naquele monitor (1 = 100%, 1.5 = 150%).
	// Cada tela pode ter o seu — um notebook a 150% ligado a um monitor
	// externo a 100% é comum — então tamanho escrito em pixel lógico (o
	// número que o CSS enxerga) precisa ser multiplicado por este fator
	// antes de virar pixel físico.
	Scale float64
}
