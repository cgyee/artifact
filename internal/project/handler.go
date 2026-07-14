package project

import (
	"context"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"glitch/internal/middleware"
	"glitch/internal/utils"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type repository interface {
	Save(ctx context.Context, project Project) error
	Get(ctx context.Context, projectID string) (Project, error)
	GetAll(ctx context.Context, ownerID string) ([]Project, error)
}

type Handler struct {
	repo   repository
	script string
}

//go:embed preview_script.js
var previewScript string

const maxFileSize int64 = 2 * 1024 * 1024

func NewProjectHandler(repo repository) *Handler {
	clientUrl := os.Getenv("CLIENT_URL")
	var script string
	if clientUrl == "" {
		script = strings.ReplaceAll(previewScript, "CLIENT_URL", "http://glitch.test:5173")
	} else {
		script = strings.ReplaceAll(previewScript, "CLIENT_URL", clientUrl)
	}
	return &Handler{repo, script}
}

func (h *Handler) Routes(mux *http.ServeMux, middleware ...func(http.Handler) http.Handler) {
	mux.Handle("GET /api/projects", utils.ApplyMiddleware(http.HandlerFunc(h.getProjects), middleware...))
	mux.Handle("GET /api/project/new", utils.ApplyMiddleware(http.HandlerFunc(h.create), middleware...))
	mux.Handle("GET /api/project/{projectID}", utils.ApplyMiddleware(http.HandlerFunc(h.get), middleware...))
	mux.Handle("POST /api/project/{projectID}", utils.ApplyMiddleware(http.HandlerFunc(h.save), middleware...))
	mux.Handle("POST /api/project/{projectID}/images", utils.ApplyMiddleware(http.HandlerFunc(h.saveImg), middleware...))
	mux.Handle("GET /api/project/{projectID}/render", utils.ApplyMiddleware(http.HandlerFunc(h.render), middleware...))
	mux.Handle("GET /api/project/{projectID}/{fileName...}", utils.ApplyMiddleware(http.HandlerFunc(h.file), middleware...))
	mux.Handle("GET /view/project/{projectID}/render", http.HandlerFunc(h.render))
	mux.Handle("GET /view/project/{projectID}/{fileName...}", http.HandlerFunc(h.viewFile))

}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var projectID string
	if id, err := uuid.NewUUID(); err == nil {
		projectID = id.String()
	}
	url := fmt.Sprintf("/project/%s", projectID)
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		logger.Error("user not logged in")
		w.WriteHeader(http.StatusForbidden)
		return
	}
	project := Project{ID: projectID, OwnerID: userID}
	defaults := map[string]File{
		"index.html": {Content: "<h1>Hello, world!</h1>"},
		"styles.css": {Content: "body { color: red }"},
		"app.js":     {Content: "console.log('Hello, world!')"},
	}
	project.Files = defaults
	logger.Info("creating new project", "userID", userID)
	if err := h.repo.Save(r.Context(), project); err != nil {
		logger.Error("error creating new project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, url, http.StatusSeeOther)
	logger.Info("created new project", "projectID", projectID)
	return
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		logger.Error("user not logged in")
		w.WriteHeader(http.StatusForbidden)
		return
	}
	logger.Info("getting project")
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		logger.Error("project not found")
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		logger.Error("error getting project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if project.OwnerID != userID {
		logger.Error("user is not owner of project", "userID", userID)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	data, err := json.Marshal(project)
	if err != nil {
		logger.Error("error marshaling project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.Write(data)
	logger.Info("got project")
	return
}

func (h *Handler) save(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		logger.Error("user not logged in")
		w.WriteHeader(http.StatusForbidden)
		return
	}
	logger.Info("saving project")
	body := r.Body
	project := Project{
		ID: projectID,
	}
	defer body.Close()
	data, err := io.ReadAll(body)
	if err != nil {
		logger.Error("error reading request body", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := json.Unmarshal(data, &project); err != nil {
		logger.Error("error unmarshaling request body", "error", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	p, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		logger.Error("project not found")
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		logger.Error("error getting project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if p.OwnerID != userID {
		logger.Error("user is not owner of project", "userID", userID)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	p.Files = project.Files
	p.Name = project.Name
	if err := h.repo.Save(r.Context(), p); err != nil {
		logger.Error("error saving project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	logger.Info("saved project")
	return
}

func (h *Handler) saveImg(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	userID, ok := middleware.UserIDFromContext(r.Context())
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	if !ok {
		logger.Error("user not logged in")
		w.WriteHeader(http.StatusForbidden)
		return
	}
	logger.Info("saving image", "projectID", projectID)
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		logger.Error("project not found")
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		logger.Error("error getting project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if project.OwnerID != userID {
		logger.Error("user is not owner of project", "userID", userID)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize)
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		logger.Error("error parsing form", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Header().Set("Content-Type", "application/json")
		res, _ := json.Marshal(ErrorResponse{Error: "Error parsing form"})
		w.Write(res)
		return
	}
	file, header, err := r.FormFile("imgFile")
	if err != nil {
		logger.Error("error getting file", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer file.Close()
	fileName := header.Filename
	if header.Size > maxFileSize {
		logger.Error("image is too large", "error", err, "size", header.Size, "max", maxFileSize)
		res := ErrorResponse{Error: "Image is too large"}
		w.WriteHeader(http.StatusBadRequest)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(res.Error))
		return
	}
	contents, err := io.ReadAll(file)
	if err != nil {
		logger.Error("error reading file", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	project.Files[fileName] = File{
		Content: base64.StdEncoding.EncodeToString(contents),
	}
	if err = h.repo.Save(r.Context(), project); err != nil {
		logger.Error("error saving project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	logger.Info("saved image", "fileName", fileName)
	return
}

func (h *Handler) file(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	logger.Info("serving file", "projectID", projectID)
	file := r.PathValue("fileName")
	if file == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		logger.Error("project not found", "projectID", projectID)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		logger.Error("error getting project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if project.OwnerID != userID {
		logger.Error("user is not owner of project", "userID", userID)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	content, err := h.parseFileContent(file, project.Files)
	if err != nil {
		logger.Error("error parsing file", "error", err, "file", file)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	contentType := h.parseContentType(file)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
	w.Write(content)
	logger.Info("served file", "fileName", file)
	return
}

func (h *Handler) viewFile(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	logger.Info("serving file", "projectID", projectID)
	file := r.PathValue("fileName")
	if file == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		logger.Error("project not found", "projectID", projectID)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		logger.Error("error getting project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	content, err := h.parseFileContent(file, project.Files)
	if err != nil {
		logger.Error("error parsing file", "error", err, "file", file)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	contentType := h.parseContentType(file)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
	w.Write(content)
	logger.Info("served file", "fileName", file)
	return
}

func (h *Handler) parseFileContent(fileName string, files map[string]File) ([]byte, error) {
	ext := filepath.Ext(fileName)
	var content []byte
	if !(ext == ".html" || ext == ".js" || ext == ".css") {
		c, err := base64.StdEncoding.DecodeString(files[fileName].Content)
		if err != nil {
			return []byte{}, err
		}
		content = c
	} else {
		content = []byte(files[fileName].Content)
	}
	return content, nil
}

func (h *Handler) parseContentType(fileName string) string {
	ext := filepath.Ext(fileName)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	return contentType
}

func (h *Handler) getProjects(w http.ResponseWriter, r *http.Request) {
	logger := middleware.LoggerFromContext(r.Context())
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		logger.Error("user not logged in")
		w.WriteHeader(http.StatusForbidden)
		return
	}
	logger.Info("getting projects", "userID", userID)

	projects, err := h.repo.GetAll(r.Context(), userID)
	if err != nil {
		logger.Error("error getting projects", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(projects)
	if err != nil {
		logger.Error("error marshaling projects", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.Write(data)

}

func (h *Handler) render(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	logger.Info("rendering project", "projectID", projectID)
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		logger.Error("project not found", "projectID", projectID)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		logger.Error("error getting project", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	file := "<script>" + h.script + "</script>" + project.Files["index.html"].Content
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(file)))
	w.Write([]byte(file))
	logger.Info("rendered project", "file", "index.html")
	return
}
