package main

import (
	"reflect"
	"testing"
)

func TestParseSizes(t *testing.T) {
	// feliz: lista de tamanhos separada por vírgula, com espaços tolerados
	got, err := parseSizes("16, 32,48 ,256")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	want := []int{16, 32, 48, 256}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("parseSizes = %v, want %v", got, want)
	}
}

func TestParseSizesInvalido(t *testing.T) {
	// triste: um dos tamanhos não é número
	_, err := parseSizes("16,trinta e dois,48")
	if err == nil {
		t.Fatal("esperava erro para tamanho não numérico, não veio nenhum")
	}
}
