package login

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
	UserExists(ctx context.Context, username string) (bool, error)
	CreateUser(ctx context.Context, username string) error
	CreateSession(ctx context.Context, id string, userID string) error
}

var ErrNotFound = errors.New("user not found")

type MongoRepository struct {
	coll        *mongo.Collection
	sessionColl *mongo.Collection
}

func NewMongoRepository(database string) *MongoRepository {
	uri := os.Getenv("MONGODB_URI")
	coll := "users"
	if uri == "" {
		log.Fatal("$MONGODB_URI must be set")
	}
	slog.Info("Connecting to database...")
	c, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	return &MongoRepository{
		coll:        c.Database(database).Collection(coll),
		sessionColl: c.Database(database).Collection("sessions"),
	}
}

func (r *MongoRepository) UserExists(ctx context.Context, username string) (bool, error) {
	result := r.coll.FindOne(ctx, bson.M{"username": username})
	if errors.Is(result.Err(), mongo.ErrNoDocuments) {
		return false, ErrNotFound
	}
	if result.Err() != nil {
		return false, result.Err()
	}
	return true, nil
}

func (r *MongoRepository) CreateUser(ctx context.Context, username string) error {
	if _, err := r.coll.InsertOne(ctx, bson.M{"username": username, "created_at": time.Now(), "updated_at": time.Now()}); err != nil {
		return err
	}
	return nil
}

func (r *MongoRepository) CreateSession(ctx context.Context, id string, userID string) error {
	filter := bson.M{"id": id, "user_id": userID}
	update := bson.M{"$set": bson.M{
		"id":         id,
		"user_id":    userID,
		"created_at": time.Now(),
		"expires_at": time.Now().Add(72 * time.Hour),
	}}
	if _, err := r.sessionColl.UpdateMany(ctx, filter, update); err != nil {
		return err
	}
	return nil
}
