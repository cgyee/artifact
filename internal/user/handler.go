package user

import (
	"context"
	"encoding/json"
	"errors"
	"glitch/internal/middleware"
	"glitch/internal/utils"
	"net/http"
)

type Repository interface {
	GetUser(ctx context.Context, username string) (User, error)
}
type Handler struct {
	userRepo Repository
}

func NewHandler(userRepo Repository) *Handler {
	return &Handler{userRepo: userRepo}
}

func (h *Handler) Routes(mux *http.ServeMux, middleware ...func(http.Handler) http.Handler) {
	mux.Handle("GET /api/me", utils.ApplyMiddleware(http.HandlerFunc(h.me), middleware...))
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	logger := middleware.LoggerFromContext(r.Context())
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	u, err := h.userRepo.GetUser(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			logger.Error("user not found", "userID", userID)
			w.WriteHeader(http.StatusNotFound)
		} else {
			logger.Error("error getting user", "error", err)
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	logger.Info("getting user", "userID", userID)
	data, err := json.Marshal(struct {
		Username  string `json:"username"`
		CreatedAt string `json:"createdAt"`
	}{
		Username:  u.Username,
		CreatedAt: u.CreatedAt.String(),
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}
