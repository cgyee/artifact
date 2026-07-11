package user

import "net/http"

type Handler struct {
}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {

}
