package main

import (
	_ "embed"
	"glitch/internal/middleware"
	"log/slog"
	"net/http"
	"os"

	"glitch/internal/project"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

var client *mongo.Client
var handler slog.Handler

//go:embed public/frontend/dist/index.html
var index string

func main() {
	if os.Getenv("ENV") == "production" {
		handler = slog.NewJSONHandler(os.Stderr, nil)
	} else {
		handler = slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	}
	slog.SetDefault(slog.New(handler))

	slog.Info("server starting", "port", 8080)
	slog.Info("Starting server...")
	p := project.NewProjectHandler(project.NewMongoRepository("glitch"))
	mux := http.NewServeMux()
	p.Routes(mux)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(index))
	})

	slog.Info("Listening on port http://localhost:8080")
	http.ListenAndServe(":8080", middleware.RequestLogger(mux))
}
