package middleware

import (
	"context"
	"glitch/internal/session"
	"net/http"
	"strings"
)

type ctxUserIDKey struct{}

var UserIDKey = ctxUserIDKey{}

type sessionRepository interface {
	GetSession(ctx context.Context, id string) (session.Session, error)
}

type SessionStore struct {
	repo sessionRepository
}

func NewSessionStore(repo sessionRepository) *SessionStore {
	return &SessionStore{repo: repo}
}

func (s *SessionStore) Session(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger := LoggerFromContext(r.Context())
		cookie, err := r.Cookie("session_id")
		if err != nil {
			logger.Info("no session cookie")
			if strings.HasPrefix(r.URL.Path, "/api/") {
				w.WriteHeader(http.StatusUnauthorized)
			} else {
				http.Redirect(w, r, "/login", http.StatusSeeOther)
			}
			return
		}
		sessionId := cookie.Value
		sess, err := s.repo.GetSession(r.Context(), sessionId)
		if err != nil {
			logger.Info("invalid session state")
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		ctx := context.WithValue(r.Context(), UserIDKey, sess.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
		return
	})
}

func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(UserIDKey).(string)
	return id, ok
}
