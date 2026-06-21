package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
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

var client *mongo.Client

func root(w http.ResponseWriter, r *http.Request) {
	var projectID string
	if id, err := uuid.NewUUID(); err == nil {
		projectID = id.String()
	}
	url := fmt.Sprintf("/project/%s", projectID)
	http.Redirect(w, r, url, http.StatusMovedPermanently)
}

func files(w http.ResponseWriter, r *http.Request) {
	project := Project{}
	project.ID = r.PathValue("projectID")
	fileName := r.PathValue("fileName")
	fmt.Println("Files - GET Project ID:", project.ID)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	switch r.Method {
	case "GET":
		coll := client.Database("test").Collection("projects")
		if err := coll.FindOne(context.TODO(), bson.M{"id": project.ID}).Decode(&project); err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				project.Files = make(map[string]File)
				project.Files["html"] = File{FileType: "html", Content: ""}
				project.Files["css"] = File{FileType: "css", Content: ""}
				w.WriteHeader(http.StatusNotFound)
			}
			fmt.Println(err)
		}
		json.Marshal(project)
		switch fileName {
		case "style.css":
			w.Header().Set("Content-Type", "text/css")
			w.Header().Set("Content-Length", fmt.Sprintf("%d", len(project.Files["css"].Content)))
			w.Write([]byte(project.Files["css"].Content))
			return
		case "index.html":
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Content-Length", fmt.Sprintf("%d", len(project.Files["html"].Content)))
			w.Write([]byte(project.Files["html"].Content))
			return
		}
	}
}

func edit(w http.ResponseWriter, r *http.Request) {
	project := Project{}
	project.ID = r.PathValue("projectID")
	fmt.Println("GET Project ID:", project.ID)
	w.Header().Set("Access-Control-Allow-Origin", "*")

	switch r.Method {
	case "GET":
		coll := client.Database("test").Collection("projects")
		if err := coll.FindOne(context.TODO(), bson.M{"id": project.ID}).Decode(&project); err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				project.Files = make(map[string]File)
				project.Files["html"] = File{FileType: "html", Content: ""}
				project.Files["css"] = File{FileType: "css", Content: ""}
				w.WriteHeader(http.StatusNotFound)
			}
			fmt.Println(err)
		}
		data, err := json.Marshal(project)
		if err != nil {
			fmt.Println(err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.Write(data)

	case "POST", "PUT":
		fmt.Println("POST")
		body := r.Body
		defer body.Close()
		data, err := io.ReadAll(body)
		if err != nil {
			panic(err)
		}
		fmt.Println(string(data))

		project := Project{
			ID:    r.PathValue("projectID"),
			Files: make(map[string]File),
		}
		if err := json.Unmarshal(data, &project); err != nil {
			panic(err)
		}

		fmt.Printf("Project, %#v\n", project)
		coll := client.Database("test").Collection("projects")
		doc := project
		models := []mongo.WriteModel{mongo.NewUpdateOneModel().SetUpsert(true).SetUpdate(bson.M{"$set": doc}).SetFilter(bson.M{"id": project.ID})}
		result, err := coll.BulkWrite(context.TODO(), models)
		if err != nil {
			panic(err)
		}
		fmt.Println(result.Acknowledged)
		fmt.Printf("%#v\n", result)
		w.WriteHeader(http.StatusCreated)
	}
}

func render(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	fmt.Println("Render - GET Project ID:", r.PathValue("projectID"))

	switch r.Method {
	case "GET":
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		project := Project{
			ID: r.PathValue("projectID"),
		}
		fmt.Println(project)
		coll := client.Database("test").Collection("projects")
		doc := coll.FindOne(context.TODO(), bson.M{"id": project.ID})
		if errors.Is(doc.Err(), mongo.ErrNoDocuments) {
			project.Files = make(map[string]File)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		doc.Decode(&project)
		fmt.Println(project)
		fmt.Println("content", project.Files["html"].Content)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(project.Files["html"].Content)))
		w.Write([]byte(project.Files["html"].Content))
		return
	}
}

func main() {
	fmt.Println("Starting server...")
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		log.Fatal("$MONGODB_URI must be set")
	}
	fmt.Println("Connecting to MongoDB...", uri)
	c, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	client = c
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			panic(err)
		}
	}()
	if err := client.Ping(context.TODO(), nil); err != nil {
		fmt.Println("Error pinging MongoDB")
		panic(err)
	}
	fmt.Println("Connected to MongoDB")
	mux := http.NewServeMux()
	mux.HandleFunc("/", root)
	mux.HandleFunc("/project/{projectID}", edit)
	mux.HandleFunc("/project/{projectID}/render", render)
	mux.HandleFunc("/project/{projectID}/render/{fileName}", files)
	mux.HandleFunc("/project/{projectID}/{fileName}", files)

	fmt.Println("Listening on port http://localhost:8080")
	http.ListenAndServe(":8080", mux)
}
