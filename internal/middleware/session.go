package middleware

import (
	"net/http"
	"strings"
)

type SessionStore struct {
	repo Repository
}

func NewSessionStore(repo Repository) *SessionStore {
	return &SessionStore{repo: repo}
}

func (s *SessionStore) Session(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger := LoggerFromContext(r.Context())
		cookie, err := r.Cookie("session_state")
		if err != nil {
			logger.Info("no session cookie")
			if strings.HasPrefix(r.URL.Path, "/api/") {
				w.WriteHeader(http.StatusUnauthorized)
			} else {
				http.Redirect(w, r, "/login", http.StatusSeeOther)
				return
			}
		}
		sessionId := cookie.Value
		if err := s.repo.ValidSession(r.Context(), sessionId); err != nil {
			logger.Info("invalid session state")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
		return
	})

}
