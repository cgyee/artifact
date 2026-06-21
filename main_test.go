package main

import (
	"context"
	"encoding/json"
	"fmt"
	"glitch/internal/project"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	testServer *httptest.Server
	testColl   *mongo.Collection
)

// TestMain runs once before any tests. Sets up the shared server + DB connection.
func TestMain(m *testing.M) {
	uri := os.Getenv("MONGODB_TEST_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	fmt.Println("Connecting to MongoDB...", uri)
	c, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	defer c.Disconnect(context.TODO())

	client = c // assigns the package-level global from main.go
	testColl = client.Database("test").Collection("projects")

	// Build the same mux production uses. When you extract to a package,
	// this becomes: projects.NewHandler(repo).Routes(mux).

	mux := http.NewServeMux()

	p := project.NewProjectHandler(project.NewMongoRepository("test"))
	p.Routes(mux)
	//mux.HandleFunc("/api/project/new", newProject)
	//mux.HandleFunc("/api/project/{projectID}", edit)
	//mux.HandleFunc("/api/project/{projectID}/render", render)
	//mux.HandleFunc("/api/project/{projectID}/{fileName}", files)

	testServer = httptest.NewServer(mux)
	defer testServer.Close()

	code := m.Run()
	testColl.Drop(context.TODO())
	os.Exit(code)
}

// --- Helpers ---

func resetDB(t *testing.T) {
	t.Helper()
	if err := testColl.Drop(context.TODO()); err != nil {
		t.Fatalf("reset db: %v", err)
	}
}

func seedProject(t *testing.T, p project.Project) {
	t.Helper()
	if _, err := testColl.InsertOne(context.TODO(), p); err != nil {
		t.Fatalf("seed: %v", err)
	}
}

// noRedirectClient lets us assert on redirect responses themselves
// instead of following them.
func noRedirectClient() *http.Client {
	return &http.Client{
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

// --- Tests ---

func TestGetProject_Existing_ReturnsJSON(t *testing.T) {
	resetDB(t)
	seedProject(t, project.Project{
		ID: "abc",
		Files: map[string]project.File{
			"html": {FileType: "html", Content: "<h1>hi</h1>"},
		},
	})

	res, err := http.Get(testServer.URL + "/api/project/abc")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", res.StatusCode)
	}
	if ct := res.Header.Get("Content-Type"); ct != "application/json" {
		t.Errorf("content-type = %q, want application/json", ct)
	}

	var got project.Project
	if err := json.NewDecoder(res.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.Files["html"].Content != "<h1>hi</h1>" {
		t.Errorf("html = %q, want %q", got.Files["html"].Content, "<h1>hi</h1>")
	}
}

func TestGetProject_NotFound_Returns404(t *testing.T) {
	resetDB(t)

	res, err := http.Get(testServer.URL + "/api/project/missing")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusNotFound {
		t.Errorf("status = %d, want 404", res.StatusCode)
	}
}

func TestSaveProject_Persists(t *testing.T) {
	resetDB(t)

	body := strings.NewReader(`{"files":{"html":{"type":"html","content":"<p>new</p>"}}}`)
	res, err := http.Post(testServer.URL+"/api/project/xyz", "application/json", body)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()

	if res.StatusCode != http.StatusCreated {
		t.Errorf("status = %d, want 201", res.StatusCode)
	}

	var got project.Project
	if err := testColl.FindOne(context.TODO(), bson.M{"id": "xyz"}).Decode(&got); err != nil {
		t.Fatalf("not in db: %v", err)
	}
	if got.Files["html"].Content != "<p>new</p>" {
		t.Errorf("stored = %q, want %q", got.Files["html"].Content, "<p>new</p>")
	}
}

func TestRender_ReturnsHTML(t *testing.T) {
	resetDB(t)
	seedProject(t, project.Project{
		ID: "abc",
		Files: map[string]project.File{
			"html": {FileType: "html", Content: "<h1>hello</h1>"},
		},
	})

	res, err := http.Get(testServer.URL + "/api/project/abc/render")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	if !strings.HasPrefix(res.Header.Get("Content-Type"), "text/html") {
		t.Errorf("content-type = %q, want text/html prefix", res.Header.Get("Content-Type"))
	}
	body, _ := io.ReadAll(res.Body)
	if string(body) != "<h1>hello</h1>" {
		t.Errorf("body = %q, want %q", body, "<h1>hello</h1>")
	}
}

func TestFile_ServesCSSWithCorrectContentType(t *testing.T) {
	resetDB(t)
	seedProject(t, project.Project{
		ID: "abc",
		Files: map[string]project.File{
			"css": {FileType: "css", Content: "body { color: red }"},
		},
	})

	res, err := http.Get(testServer.URL + "/api/project/abc/style.css")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	if ct := res.Header.Get("Content-Type"); ct != "text/css" {
		t.Errorf("content-type = %q, want text/css", ct)
	}
	body, _ := io.ReadAll(res.Body)
	if string(body) != "body { color: red }" {
		t.Errorf("body = %q", body)
	}
}

func TestNewProject_Redirects(t *testing.T) {
	res, err := noRedirectClient().Get(testServer.URL + "/api/project/new")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusSeeOther {
		t.Errorf("status = %d, want 303", res.StatusCode)
	}
	if loc := res.Header.Get("Location"); !strings.HasPrefix(loc, "/project/") {
		t.Errorf("location = %q, want /project/ prefix", loc)
	}
}
