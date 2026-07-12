package project

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Project struct {
	ID        string          `bson:"id" json:"id"`
	Files     map[string]File `bson:"files" json:"files"`
	Name      string          `bson:"name" json:"name"`
	OwnerID   string          `bson:"ownerId" json:"ownerId"`
	CreatedAt time.Time       `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time       `bson:"updatedAt" json:"updatedAt"`
}
type File struct {
	Content string `bson:"content" json:"content"`
}

var ErrNotFound = errors.New("project not found")

type MongoRepository struct {
	coll *mongo.Collection
}

const coll = "projects"

func NewMongoRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{coll: db.Collection(coll)}
}

func (r *MongoRepository) Get(ctx context.Context, id string) (Project, error) {
	var p Project
	err := r.coll.FindOne(ctx, bson.M{"id": id}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return Project{}, ErrNotFound
	}
	return p, err
}

func (r *MongoRepository) Save(ctx context.Context, project Project) error {
	update := bson.M{"$set": bson.M{
		"id":        project.ID,
		"files":     project.Files,
		"ownerId":   project.OwnerID,
		"createdAt": project.CreatedAt,
		"updatedAt": time.Now(),
	},
	}
	opts := options.UpdateOne().SetUpsert(true)
	_, err := r.coll.UpdateOne(ctx, bson.M{"id": project.ID}, update, opts)
	if err != nil {
		return err
	}
	return nil
}
