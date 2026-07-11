package main

import (
	"context"
	_ "embed"
	"errors"
	"glitch/internal/database"
	"glitch/internal/login"
	"glitch/internal/middleware"
	"glitch/internal/session"
	"glitch/internal/user"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"glitch/internal/project"
)

//go:embed public/frontend/dist/index.html
var index string

func main() {
	var handler slog.Handler
	if os.Getenv("ENV") == "production" {
		handler = slog.NewJSONHandler(os.Stderr, nil)
	} else {
		handler = slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	}
	address := ":8080"
	slog.SetDefault(slog.New(handler))
	db, dbCleanup := database.Connect("glitch")
	userStore := user.NewMongoRepository(db)
	sessionStore := session.NewMongoRepository(db)
	u := user.NewHandler(userStore)
	p := project.NewProjectHandler(project.NewMongoRepository(db))
	l := login.NewHandler(userStore, sessionStore)
	s := middleware.NewSessionStore(sessionStore)
	mux := http.NewServeMux()
	u.Routes(mux, s.Session)
	p.Routes(mux, s.Session)
	l.Routes(mux, s.Session)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(index))
	})
	server := &http.Server{
		Addr:    address,
		Handler: middleware.RequestLogger(mux),
	}
	go func() {
		slog.Info("Starting server", "address", server.Addr)
		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Server error ", "error", err)
		}
	}()
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	slog.Info("shutdown signal received")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("Graceful shutdown error", "error", err)
	}
	dbCleanup()
	slog.Info("Server stopped")
}
