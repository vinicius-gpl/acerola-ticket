// Package reporting envia os snapshots do agente para o painel central pelo
// WebSocket de `/agent` do dashboard. O agente continua funcionando sozinho
// sem isto: sem configuração, nada aqui sobe e a bandeja segue local.
//
// O protocolo está descrito em
// `acerola/dashboard/shared/src/schemas/agent-snapshot.schema.ts` — as tags
// `json` da `metrics.Snapshot` são exatamente os campos que o servidor valida,
// e por isso nada é remodelado antes de sair daqui.
package reporting

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/secret"
)

const (
	// DefaultInterval é a cadência de envio. Bem mais espaçada que o 1s da
	// tela do próprio agente: o painel central guarda uma amostra por
	// snapshot recebido, e um segundo por máquina encheria a tabela de
	// histórico sem responder nenhuma pergunta que meio minuto já responda.
	DefaultInterval = 30 * time.Second

	// Abaixo de MinInterval o envio vira ruído e custo; acima de
	// MaxInterval a máquina fica tempo demais parecendo offline depois de
	// uma queda, porque "online" é ter conexão aberta agora.
	MinInterval = 5 * time.Second
	MaxInterval = 5 * time.Minute

	// O caminho do WebSocket do dashboard (`@WebSocketGateway({ path })`).
	// Quem configura o agente informa só o endereço do servidor; repetir
	// este detalhe em cada máquina seria uma chance a mais de errar.
	agentPath = "/agent"

	configDirName  = "Acerola Agent"
	configFileName = "config.json"
)

// ErrNotConfigured é devolvido por Load quando não há nem variável de
// ambiente nem arquivo de configuração. Não é falha: é uma máquina que só
// usa o agente localmente, e quem chama trata isso como "não reportar".
var ErrNotConfigured = errors.New("reporting: agent is not configured to report")

// Config diz para onde o agente reporta e com que identidade.
type Config struct {
	// ServerURL já normalizado em ws:// ou wss://, com o caminho do gateway.
	ServerURL string
	// Token provisionado na instalação. Vai no corpo do `hello`, nunca na
	// URL — endereço aparece em log de proxy, e token em log é token vazado.
	Token    string
	Interval time.Duration
}

// fileConfig é o formato do config.json, em inglês como todo identificador
// do projeto. Quem escreve este arquivo é a própria tela do agente.
//
// O token NÃO mora mais aqui — vive no cofre do sistema (ver src-go/secret).
// TokenCipher continua existindo só para LER o que uma instalação anterior
// a este cofre gravou; Save nunca mais escreve nele (ver migrateLegacyToken).
type fileConfig struct {
	ServerURL       string `json:"serverUrl"`
	TokenCipher     string `json:"tokenCipher,omitempty"`
	IntervalSeconds int    `json:"intervalSeconds"`
}

// rawConfig é a configuração já com o token LEGÍVEL, só em memória, vinda do
// arquivo (decifrada) ou do ambiente.
type rawConfig struct {
	ServerURL       string
	Token           string
	IntervalSeconds int
}

// Environment é a leitura de variáveis de ambiente, injetável para teste.
type Environment func(key string) string

// Load monta a configuração a partir do ambiente e, faltando ele, do
// arquivo em %APPDATA%\Acerola Agent\config.json.
//
// O ambiente vence o arquivo de propósito: é o que permite apontar uma
// máquina para outro servidor (teste, homologação) sem reescrever o arquivo
// que o instalador gravou.
func Load(lookupEnv Environment, configPath string) (Config, error) {
	fromEnvironment := readEnvironment(lookupEnv)
	if fromEnvironment.ServerURL != "" || fromEnvironment.Token != "" {
		return normalize(fromEnvironment)
	}

	fromFile, readError := readFile(configPath)
	if readError != nil {
		return Config{}, readError
	}

	return normalize(fromFile)
}

// DefaultConfigPath é onde o instalador grava a configuração desta máquina.
func DefaultConfigPath() (string, error) {
	base, configDirError := os.UserConfigDir()
	if configDirError != nil {
		return "", fmt.Errorf("reporting: no config directory: %w", configDirError)
	}

	return filepath.Join(base, configDirName, configFileName), nil
}

func readEnvironment(lookupEnv Environment) rawConfig {
	if lookupEnv == nil {
		return rawConfig{}
	}

	seconds, _ := strconv.Atoi(strings.TrimSpace(lookupEnv("ACEROLA_REPORT_INTERVAL_SECONDS")))

	return rawConfig{
		ServerURL:       lookupEnv("ACEROLA_SERVER_URL"),
		Token:           lookupEnv("ACEROLA_AGENT_TOKEN"),
		IntervalSeconds: seconds,
	}
}

func readFile(configPath string) (rawConfig, error) {
	stored, readError := readStored(configPath)
	if readError != nil {
		return rawConfig{}, readError
	}

	raw := rawConfig{ServerURL: stored.ServerURL, IntervalSeconds: stored.IntervalSeconds}

	/* Máquina vinda de uma versão anterior a este cofre: o token ainda está
	   cifrado no arquivo. Migra para o cofre AGORA, na primeira leitura, e só
	   então apaga do arquivo — sem isto, atualizar o agente desconectaria o
	   parque inteiro até alguém reconfigurar cada máquina à mão. */
	if stored.TokenCipher != "" {
		token, migrateError := migrateLegacyToken(configPath, stored)
		if migrateError != nil {
			return rawConfig{}, migrateError
		}

		raw.Token = token

		return raw, nil
	}

	token, loadError := loadSecret()
	if loadError != nil {
		if errors.Is(loadError, secret.ErrNotFound) {
			return raw, nil
		}

		return rawConfig{}, fmt.Errorf("reporting: cannot read the saved key: %w", loadError)
	}

	raw.Token = token

	return raw, nil
}

// migrateLegacyToken desfaz a cifra antiga, grava o resultado no cofre do
// sistema e só então reescreve o arquivo sem o campo. Se qualquer passo
// falhar antes da reescrita, o arquivo fica como estava e a próxima partida
// tenta de novo — a migração é segura de repetir.
func migrateLegacyToken(configPath string, stored fileConfig) (string, error) {
	token, unprotectError := legacyUnprotect(stored.TokenCipher)
	if unprotectError != nil {
		/* O segredo existe mas não abre: foi cifrado por outro usuário, veio de
		   outra máquina, ou o arquivo foi mexido. Dizer isso é melhor do que
		   fingir que a máquina nunca foi configurada. */
		return "", fmt.Errorf("reporting: the saved key cannot be read on this machine: %w", unprotectError)
	}

	if saveError := saveSecret(token); saveError != nil {
		return "", fmt.Errorf("reporting: cannot move the saved key to the system vault: %w", saveError)
	}

	stored.TokenCipher = ""

	content, marshalError := json.MarshalIndent(stored, "", "  ")
	if marshalError != nil {
		return "", marshalError
	}

	if writeError := os.WriteFile(configPath, content, 0o600); writeError != nil {
		return "", fmt.Errorf("reporting: cannot update %s after moving the key: %w", configPath, writeError)
	}

	return token, nil
}

func readStored(configPath string) (fileConfig, error) {
	if configPath == "" {
		return fileConfig{}, ErrNotConfigured
	}

	content, readError := os.ReadFile(configPath)
	if errors.Is(readError, os.ErrNotExist) {
		return fileConfig{}, ErrNotConfigured
	}
	if readError != nil {
		return fileConfig{}, fmt.Errorf("reporting: cannot read %s: %w", configPath, readError)
	}

	var parsed fileConfig
	if unmarshalError := json.Unmarshal(content, &parsed); unmarshalError != nil {
		return fileConfig{}, fmt.Errorf("reporting: %s is not valid JSON: %w", configPath, unmarshalError)
	}

	return parsed, nil
}

func normalize(raw rawConfig) (Config, error) {
	token := strings.TrimSpace(raw.Token)
	address := strings.TrimSpace(raw.ServerURL)

	if token == "" && address == "" {
		return Config{}, ErrNotConfigured
	}
	if token == "" {
		return Config{}, errors.New("reporting: token is missing")
	}
	if address == "" {
		return Config{}, errors.New("reporting: server URL is missing")
	}

	endpoint, addressError := normalizeURL(address)
	if addressError != nil {
		return Config{}, addressError
	}

	return Config{ServerURL: endpoint, Token: token, Interval: normalizeInterval(raw.IntervalSeconds)}, nil
}

// normalizeURL aceita o endereço do jeito que a pessoa tem na mão.
//
// Quem instala o agente copia o endereço do painel do navegador, que começa
// com http. Recusar isso trocaria uma instalação que funciona por um erro
// que só quem conhece WebSocket saberia corrigir — então o esquema é
// convertido, e o caminho do gateway é completado quando falta.
func normalizeURL(address string) (string, error) {
	parsed, parseError := url.Parse(address)
	if parseError != nil {
		return "", fmt.Errorf("reporting: server URL is invalid: %w", parseError)
	}

	scheme, schemeKnown := map[string]string{
		"ws": "ws", "wss": "wss", "http": "ws", "https": "wss",
	}[strings.ToLower(parsed.Scheme)]
	if !schemeKnown {
		return "", fmt.Errorf("reporting: server URL must start with ws://, wss://, http:// or https://, got %q", address)
	}
	if parsed.Host == "" {
		return "", fmt.Errorf("reporting: server URL has no host: %q", address)
	}

	parsed.Scheme = scheme
	parsed.RawQuery = ""
	parsed.Fragment = ""
	if path := strings.TrimRight(parsed.Path, "/"); path == "" {
		parsed.Path = agentPath
	}

	return parsed.String(), nil
}

// normalizeInterval prende a cadência na faixa que faz sentido em vez de
// recusar o valor: um número fora da faixa no arquivo não pode ser motivo
// para a máquina inteira parar de reportar.
func normalizeInterval(seconds int) time.Duration {
	if seconds <= 0 {
		return DefaultInterval
	}

	interval := time.Duration(seconds) * time.Second
	if interval < MinInterval {
		return MinInterval
	}
	if interval > MaxInterval {
		return MaxInterval
	}

	return interval
}

/*
O cofre do sistema e a cifra antiga, em variável para o teste conseguir

	simular o cofre indisponível e o arquivo de uma instalação anterior que
	não abre mais — veio de outra máquina, ou foi cifrado por outro usuário.
*/
var (
	saveSecret      = secret.Save
	loadSecret      = secret.Load
	legacyUnprotect = secret.LegacyUnprotect
)

// Settings é o que a TELA do agente mostra e grava.
//
// O token só entra, nunca sai: a tela informa se existe um salvo (`HasToken`),
// e não o valor. Devolvê-lo ao frontend recolocaria em texto puro, na memória
// do navegador embutido, o segredo que acabamos de guardar no cofre.
type Settings struct {
	ServerURL       string `json:"serverUrl"`
	HasToken        bool   `json:"hasToken"`
	IntervalSeconds int    `json:"intervalSeconds"`
}

// Current lê o que está configurado hoje, sem o segredo.
func Current(configPath string) Settings {
	stored, readError := readStored(configPath)
	if readError != nil {
		return Settings{IntervalSeconds: int(DefaultInterval.Seconds())}
	}

	seconds := stored.IntervalSeconds
	if seconds <= 0 {
		seconds = int(DefaultInterval.Seconds())
	}

	/* O token pode estar no arquivo (instalação antiga, ainda não migrada,
	   ver migrateLegacyToken) ou no cofre — Current só informa SE existe,
	   nunca o valor, então não importa onde. */
	_, loadError := loadSecret()
	hasToken := stored.TokenCipher != "" || loadError == nil

	return Settings{
		ServerURL:       stored.ServerURL,
		HasToken:        hasToken,
		IntervalSeconds: seconds,
	}
}

// Save grava o endereço desta máquina no arquivo e o token no cofre do
// sistema — nunca os dois juntos no mesmo lugar.
//
// A configuração é VALIDADA antes de ir para o disco: um endereço impossível
// ou um token vazio param aqui, com o motivo, em vez de virarem um agente que
// tenta para sempre sem ninguém entender por quê.
func Save(configPath string, serverURL string, token string, intervalSeconds int) (Config, error) {
	config, validationError := normalize(rawConfig{
		ServerURL:       serverURL,
		Token:           token,
		IntervalSeconds: intervalSeconds,
	})
	if validationError != nil {
		return Config{}, validationError
	}

	if saveError := saveSecret(config.Token); saveError != nil {
		return Config{}, fmt.Errorf("reporting: cannot protect the key: %w", saveError)
	}

	content, marshalError := json.MarshalIndent(fileConfig{
		ServerURL:       config.ServerURL,
		IntervalSeconds: int(config.Interval.Seconds()),
	}, "", "  ")
	if marshalError != nil {
		return Config{}, marshalError
	}

	if directoryError := os.MkdirAll(filepath.Dir(configPath), 0o700); directoryError != nil {
		return Config{}, fmt.Errorf("reporting: cannot create %s: %w", filepath.Dir(configPath), directoryError)
	}

	/* 0600: só o dono lê. O arquivo não guarda mais segredo nenhum — quem
	   protege o token agora é o cofre do sistema —, mas o endereço do
	   servidor continua sendo só desta máquina, e não custa manter o hábito. */
	if writeError := os.WriteFile(configPath, content, 0o600); writeError != nil {
		return Config{}, fmt.Errorf("reporting: cannot write %s: %w", configPath, writeError)
	}

	return config, nil
}
