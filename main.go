package main

import (
	"fmt"
	"net/http"

	"glitch/internal/project"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

var client *mongo.Client

func main() {
	fmt.Println("Starting server...")

	p := project.NewProjectHandler(project.NewMongoRepository("glitch"))
	mux := http.NewServeMux()
	p.Routes(mux)

	fmt.Println("Listening on port http://localhost:8080")
	http.ListenAndServe(":8080", mux)
}
