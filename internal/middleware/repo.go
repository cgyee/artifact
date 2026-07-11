package middleware

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Repository interface {
	ValidSession(ctx context.Context, id string) error
}

type Session struct {
	ID        string    `bson:"id"`
	UserID    string    `bson:"user_id"`
	CreatedAt time.Time `bson:"created_at"`
	ExpiresAt time.Time `bson:"expires_at"`
}

type MongoRepository struct {
	coll *mongo.Collection
}

var ErrNotFound = errors.New("session not found")

func NewMongoRepository(database string) *MongoRepository {

	uri := os.Getenv("MONGODB_URI")
	coll := "sessions"
	if uri == "" {
		log.Fatal("$MONGODB_URI must be set")
	}
	slog.Info("Connecting to database...")
	c, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	return &MongoRepository{coll: c.Database(database).Collection(coll)}
}

func (r *MongoRepository) ValidSession(ctx context.Context, id string) error {
	res := r.coll.FindOne(ctx, bson.M{"id": id})
	if res.Err() != nil {
		if errors.Is(res.Err(), mongo.ErrNoDocuments) {
			return ErrNotFound
		}
		return res.Err()
	}
	session := Session{}
	if err := res.Decode(&session); err != nil {
		return err
	}
	if time.Now().After(session.ExpiresAt) {
		return ErrNotFound
	}
	return nil
}

func (r *MongoRepository) revokeSession(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"id": id})
	return err
}
