package project

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"glitch/internal/middleware"
	"io"
	"mime"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type Handler struct {
	repo Repository
}

//go:embed preview_script.js
var previewScript string

const maxFileSize int64 = 2 * 1024 * 1024

func NewProjectHandler(repo Repository) *Handler {
	return &Handler{repo}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/project/new", h.create)
	mux.HandleFunc("GET /api/project/{projectID}", h.get)
	mux.HandleFunc("POST /api/project/{projectID}", h.save)
	mux.HandleFunc("POST /api/project/{projectID}/images", h.saveImg)
	mux.HandleFunc("GET /api/project/{projectID}/render", h.render)
	mux.HandleFunc("GET /api/project/{projectID}/{fileName...}", h.file)
	mux.HandleFunc("GET /view/project/{projectID}", h.render)
	mux.HandleFunc("GET /view/project/{projectID}/{fileName...}", h.file)

}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var projectID string
	if id, err := uuid.NewUUID(); err == nil {
		projectID = id.String()
	}
	url := fmt.Sprintf("/project/%s", projectID)
	project := Project{ID: projectID}
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
	defaults := map[string]File{
		"index.html": {Content: "<h1>Hello, world!</h1>"},
		"styles.css": {Content: "body { color: red }"},
		"app.js":     {Content: "console.log('Hello, world!')"},
	}
	project.Files = defaults
	logger.Info("creating new project", "projectID", projectID)
	if err := h.repo.Save(r.Context(), project); err != nil {
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
	project, err := h.repo.Get(r.Context(), projectID)
	logger.Info("getting project")
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

	if err := h.repo.Save(r.Context(), project); err != nil {
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
	logger := middleware.LoggerFromContext(r.Context()).With("projectID", projectID)
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
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		logger.Error("error parsing form", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
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
	ext := filepath.Ext(file)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	var content []byte
	if !(ext == ".html" || ext == ".js" || ext == ".css") {
		content, err = base64.StdEncoding.DecodeString(project.Files[file].Content)
		if err != nil {
			logger.Error("error decoding file", "error", err, "file", file)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	} else {
		content = []byte(project.Files[file].Content)
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
	w.Write(content)
	logger.Info("served file", "fileName", file)
	return
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
	file := "<script>" + previewScript + "</script>" + project.Files["index.html"].Content
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(file)))
	w.Write([]byte(file))
	logger.Info("rendered project", "file", "index.html")
	return
}
