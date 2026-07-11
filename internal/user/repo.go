package user

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type User struct {
	Username  string    `bson:"username" json:"username"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

var ErrNotFound = errors.New("user not found")

const (
	coll = "users"
)

type MongoRepository struct {
	coll *mongo.Collection
}

func NewMongoRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{
		coll: db.Collection(coll),
	}
}

func (r *MongoRepository) GetUser(ctx context.Context, username string) (User, error) {
	result := r.coll.FindOne(ctx, bson.M{"username": username})
	if errors.Is(result.Err(), mongo.ErrNoDocuments) {
		return User{}, ErrNotFound
	}
	if result.Err() != nil {
		return User{}, result.Err()
	}
	u := User{}
	if err := result.Decode(&u); err != nil {
		return User{}, err
	}
	return u, nil
}

func (r *MongoRepository) CreateUser(ctx context.Context, username string) error {
	if _, err := r.coll.InsertOne(ctx, bson.M{"username": username, "created_at": time.Now(), "updated_at": time.Now()}); err != nil {
		return err
	}
	return nil
}
