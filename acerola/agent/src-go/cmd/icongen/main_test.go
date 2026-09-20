package main

import (
	"reflect"
	"testing"
)

func TestParseSizesHappyPath(testingContext *testing.T) {
	// feliz: lista de tamanhos separada por vírgula, com espaços tolerados
	parsedSizes, parseError := parseSizes("16, 32,48 ,256")
	if parseError != nil {
		testingContext.Fatalf("erro inesperado: %v", parseError)
	}
	expectedSizes := []int{16, 32, 48, 256}
	if !reflect.DeepEqual(parsedSizes, expectedSizes) {
		testingContext.Errorf("parseSizes = %v, want %v", parsedSizes, expectedSizes)
	}
}

func TestParseSizesInvalidFormat(testingContext *testing.T) {
	// triste: um dos tamanhos não é número e deve gerar erro
	_, parseError := parseSizes("16,trinta e dois,48")
	if parseError == nil {
		testingContext.Fatal("esperava erro para tamanho não numérico, não veio nenhum")
	}
}
