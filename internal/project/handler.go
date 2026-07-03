package project

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
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
	defaults := map[string]File{
		"index.html": {Content: "<h1>Hello, world!</h1>"},
		"styles.css": {Content: "body { color: red }"},
		"app.js":     {Content: "console.log('Hello, world!')"},
	}
	project.Files = defaults
	if err := h.repo.Save(r.Context(), project); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
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

func (h *Handler) saveImg(w http.ResponseWriter, r *http.Request) {
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
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		res, _ := json.Marshal(ErrorResponse{Error: "Error parsing form"})
		w.Write(res)
		return
	}
	file, header, err := r.FormFile("imgFile")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer file.Close()
	fileName := header.Filename
	if header.Size > maxFileSize {
		res := ErrorResponse{Error: "Image is too large"}
		w.WriteHeader(http.StatusBadRequest)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(res.Error))
		return
	}
	contents, err := io.ReadAll(file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	project.Files[fileName] = File{
		Content: base64.StdEncoding.EncodeToString(contents),
	}
	if err = h.repo.Save(r.Context(), project); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	return
}

func (h *Handler) file(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectID")
	file := r.PathValue("fileName")
	if file == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	// Remove trailing slash if present
	project, err := h.repo.Get(r.Context(), projectID)

	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
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
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	} else {
		content = []byte(project.Files[file].Content)
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
	w.Write(content)
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
	file := script + project.Files["index.html"].Content
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(file)))
	w.Write([]byte(file))
	return
}

const script = `<script>
    (() => {
	  const safeStringify = a => {
		try {
		  const result = JSON.stringify(a)
		  return result === undefined ? String(a) : result  // "undefined", "function () {...}", etc.
		} catch {
		  return String(a)  // catches circular refs too
		}
	  }
      const send = (level, args, extra) => {
        try {
          window.parent.postMessage({
            source: "preview",
            level,
            args: args.map(a => safeStringify(a)),
            timestamp: Date.now(),
			...extra,
          }, "*")
        } catch (e) {
          console.error(e)
        }
      }

      const originalLog = console.log
      const originalInfo = console.info
      const originalWarn = console.warn
      const originalError = console.error

      console.log = (...args) => { send("log", args); originalLog.apply(console, args) }
      console.info = (...args) => { send("info", args); originalInfo.apply(console, args) }
      console.warn = (...args) => { send("warn", args); originalWarn.apply(console, args) }
      console.error = (...args) => { send("error", args); originalError.apply(console, args) }

      window.addEventListener("error", (e) => {
        send("error", [e.message], { stack: e.error?.stack })
      })

      window.addEventListener("unhandledrejection", (e) => {
        send("error", [e.reason], { stack: e.reason?.stack })
      })
    })()
	
  </script>`
