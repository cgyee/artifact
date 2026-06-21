package project

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Project struct {
	ID    string          `bson:"id" json:"projectID"`
	Files map[string]File `bson:"files" json:"files"`
}
type File struct {
	FileType string `bson:"fileType" json:"type"`
	Content  string `bson:"content" json:"content"`
}

var ErrNotFound = errors.New("project not found")

type Repository interface {
	Get(ctx context.Context, id string) (Project, error)
	Save(ctx context.Context, project Project) error
}

type MongoRepository struct {
	coll *mongo.Collection
}

func NewMongoRepository(database string) *MongoRepository {
	uri := os.Getenv("MONGODB_URI")
	coll := "projects"
	if uri == "" {
		log.Fatal("$MONGODB_URI must be set")
	}
	fmt.Println("Connecting to MongoDB...", uri)
	c, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	fmt.Println("Connected to MongoDB")
	return &MongoRepository{coll: c.Database(database).Collection(coll)}
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
	models := []mongo.WriteModel{mongo.NewUpdateOneModel().SetUpsert(true).SetUpdate(bson.M{"$set": project}).SetFilter(bson.M{"id": project.ID})}
	_, err := r.coll.BulkWrite(ctx, models)
	if err != nil {
		return err
	}
	return nil
}
