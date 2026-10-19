// Package window cuida da janela nativa do agente. O que fala com a API de
// janelas só existe no Windows — ver window_windows.go; aqui fica o que o
// main.go precisa em qualquer sistema.
package window

// ClassName é o nome de classe registrado para a janela do agente (ver
// `WindowClassName` em main.go). É por ele que encontramos o handle da
// janela: o Wails não expõe esse handle em nenhum ponto da API pública.
const ClassName = "AcerolaAgentWindow"
