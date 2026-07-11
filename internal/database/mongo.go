package database

import (
	"context"
	"log"
	"log/slog"
	"os"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func Connect(database string) (conn *mongo.Database, cleanup func()) {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		log.Fatal("$MONGODB_URI must be set")
	}
	slog.Info("Connecting to database...")
	c, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	cleanup = func() {
		slog.Info("closing mongo connection")
		if err := c.Disconnect(context.Background()); err != nil {
			slog.Error("mongo disconnect failed", "error", err)
		}
	}
	return c.Database(database), cleanup
}
