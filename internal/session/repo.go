package session

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Session struct {
	ID        string    `bson:"id"`
	UserID    string    `bson:"user_id"`
	CreatedAt time.Time `bson:"created_at"`
	ExpiresAt time.Time `bson:"expires_at"`
}

type MongoRepository struct {
	coll *mongo.Collection
}

const coll = "sessions"

var ErrNotFound = errors.New("session not found")

func NewMongoRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{coll: db.Collection(coll)}
}

func (r *MongoRepository) GetSession(ctx context.Context, id string) (Session, error) {
	res := r.coll.FindOne(ctx, bson.M{"id": id})
	session := Session{}
	if res.Err() != nil {
		if errors.Is(res.Err(), mongo.ErrNoDocuments) {
			return session, ErrNotFound
		}
		return session, res.Err()
	}
	if err := res.Decode(&session); err != nil {
		return session, err
	}
	if time.Now().After(session.ExpiresAt) {
		return session, ErrNotFound
	}
	return session, nil
}

func (r *MongoRepository) CreateSession(ctx context.Context, id string, userID string) error {
	filter := bson.M{"id": id, "user_id": userID}
	update := bson.M{"$set": bson.M{
		"id":         id,
		"user_id":    userID,
		"created_at": time.Now(),
		"expires_at": time.Now().Add(72 * time.Hour),
	}}
	opts := options.UpdateOne().SetUpsert(true)
	if _, err := r.coll.UpdateOne(ctx, filter, update, opts); err != nil {
		return err
	}
	return nil
}

func (r *MongoRepository) RevokeSession(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"id": id})
	return err
}
