package project

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Project struct {
	ID    string          `bson:"id" json:"id"`
	Files map[string]File `bson:"files" json:"files"`
	Name  string          `bson:"name" json:"name"`
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
	models := []mongo.WriteModel{mongo.NewUpdateOneModel().SetUpsert(true).SetUpdate(bson.M{"$set": bson.M{"files": project.Files}, "$setOnInsert": bson.M{"id": project.ID}}).SetFilter(bson.M{"id": project.ID})}
	_, err := r.coll.BulkWrite(ctx, models)
	if err != nil {
		return err
	}
	return nil
}
