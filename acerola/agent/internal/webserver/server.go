// Package webserver serve o painel local estilo btop: os arquivos estáticos
// via HTTP simples e as métricas ao vivo via WebSocket, ambos amarrados só
// ao localhost — nesta fase, nada conversa com fora da máquina.
package webserver

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/internal/metrics"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/web"
)

// Server serve a interface do painel e transmite valores de metrics.Snapshot
// pra ela.
type Server struct {
	addr        string
	broadcaster *metrics.Broadcaster
	upgrader    websocket.Upgrader
}

func New(addr string, broadcaster *metrics.Broadcaster) *Server {
	return &Server{
		addr:        addr,
		broadcaster: broadcaster,
		upgrader: websocket.Upgrader{
			// O painel só é servido em localhost (ver New/ListenAndServe do
			// chamador); não há origem cruzada real a filtrar nesta fase.
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServerFS(web.FS))
	mux.HandleFunc("/ws", s.handleWebSocket)
	return mux
}

// ListenAndServe bloqueia servindo o painel. addr deve ser um endereço só de
// localhost (ex: "127.0.0.1:7890").
func (s *Server) ListenAndServe() error {
	server := &http.Server{
		Addr:              s.addr,
		Handler:           s.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	return server.ListenAndServe()
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("webserver: websocket upgrade failed: %v", err)
		return
	}
	defer func() { _ = conn.Close() }() // a aba já fechou ou a rede caiu; não há o que fazer com o erro

	updates, unsubscribe := s.broadcaster.Subscribe()
	defer unsubscribe()

	// Encerra a conexão assim que o navegador fechar a aba: ReadMessage
	// bloqueia até isso acontecer (ou até um erro de rede), e é a única
	// forma de detectar o fechamento do lado do cliente numa conexão que,
	// do nosso lado, só escreve.
	closed := make(chan struct{})
	go func() {
		defer close(closed)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	if latest := s.broadcaster.Latest(); latest.Host.Hostname != "" {
		if err := writeSnapshot(conn, latest); err != nil {
			return
		}
	}

	for {
		select {
		case <-closed:
			return
		case snap := <-updates:
			if err := writeSnapshot(conn, snap); err != nil {
				return
			}
		}
	}
}

func writeSnapshot(conn *websocket.Conn, snap metrics.Snapshot) error {
	data, err := json.Marshal(snap)
	if err != nil {
		log.Printf("webserver: failed to marshal snapshot: %v", err)
		return nil
	}
	return conn.WriteMessage(websocket.TextMessage, data)
}
