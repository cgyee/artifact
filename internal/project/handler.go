package project

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"
)

type Handler struct {
	repo Repository
}

func NewProjectHandler(repo Repository) *Handler {
	return &Handler{repo}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/project/new", h.create)
	mux.HandleFunc("GET /api/project/{projectID}", h.get)
	mux.HandleFunc("POST /api/project/{projectID}", h.save)
	mux.HandleFunc("GET /api/project/{projectID}/{fileName}", h.file)
	mux.HandleFunc("GET /api/project/{projectID}/render", h.render)
	mux.HandleFunc("GET /view/project/{projectID}", h.render)
	mux.HandleFunc("GET /view/project/{projectID}/{fileName}", h.file)

}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var projectID string
	if id, err := uuid.NewUUID(); err == nil {
		projectID = id.String()
	}
	url := fmt.Sprintf("/project/%s", projectID)
	http.Redirect(w, r, url, http.StatusSeeOther)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(project)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.Write(data)
	return
}

func (h *Handler) save(w http.ResponseWriter, r *http.Request) {
	body := r.Body
	project := Project{
		ID: r.PathValue("projectID"),
	}
	defer body.Close()
	data, err := io.ReadAll(body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(data, &project); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := h.repo.Save(r.Context(), project); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	return
}

func (h *Handler) file(w http.ResponseWriter, r *http.Request) {
	fileName := r.PathValue("fileName")
	projectID := r.PathValue("projectID")

	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	ext := filepath.Ext(fileName)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(project.Files[fileName].Content)))
	w.Write([]byte(project.Files[fileName].Content))
	return
}

func (h *Handler) render(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	project, err := h.repo.Get(r.Context(), projectID)
	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(project.Files["index.html"].Content)))
	w.Write([]byte(project.Files["index.html"].Content))
	return
}
