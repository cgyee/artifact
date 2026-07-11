package login

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"glitch/internal/middleware"
	"net/http"
	"net/url"
	"os"
	"time"
)

type Handler struct {
	repo        Repository
	credentials Credentials
}

type Credentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
}

type GithubOAuthResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

type GitHubUser struct {
	Login  string `json:"login"`
	UserID int64  `json:"id"`
	Email  string `json:"email"`
}

func NewHandler(repo Repository) *Handler {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	if clientID == "" {
		panic("Must set GITHUB_CLIENT_ID")
	}
	if clientSecret == "" {
		panic("Must set GITHUB_CLIENT_SECRET")
	}
	credentials := Credentials{ClientID: clientID, ClientSecret: clientSecret}
	return &Handler{repo: repo, credentials: credentials}
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("/api/login", h.login)
	mux.HandleFunc("/api/callback", h.callback)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	logger := middleware.LoggerFromContext(r.Context())
	state := GenerateSecureToken(32)
	cookie := http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		Expires:  time.Now().Add(10 * time.Minute),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, &cookie)
	params := url.Values{
		"client_id":    {h.credentials.ClientID},
		"scope":        {"user:email read:user"},
		"state":        {state},
		"redirect_uri": {"http://glitch.local:8080/api/callback"},
	}

	authURL := "https://github.com/login/oauth/authorize?" + params.Encode()
	logger.Info("redirecting to github")
	http.Redirect(w, r, authURL, http.StatusFound)
}

func (h *Handler) callback(w http.ResponseWriter, r *http.Request) {
	logger := middleware.LoggerFromContext(r.Context())
	cookie, err := r.Cookie("oauth_state")
	if err != nil {
		logger.Error("no oauth state cookie")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	githubTokenURL := fmt.Sprintf("https://github.com/login/oauth/access_token")
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if cookie == nil || state != cookie.Value {
		logger.Error("invalid state", "cookie_state", cookie.Value, "url_state", state)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	body, err := json.Marshal(map[string]string{
		"client_id":     h.credentials.ClientID,
		"client_secret": h.credentials.ClientSecret,
		"code":          code,
	})
	if err != nil {
		logger.Error("error marshaling request body", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	req, err := http.NewRequest("POST", githubTokenURL, bytes.NewBuffer(body))
	if err != nil {
		logger.Error("error creating request", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Error("error posting request", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	oauthResp := GithubOAuthResponse{}
	if err := json.NewDecoder(resp.Body).Decode(&oauthResp); err != nil {
		logger.Error("error decoding response", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if oauthResp.AccessToken == "" {
		logger.Error("no access token in response")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	req, _ = http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+oauthResp.AccessToken)
	req.Header.Set("Accept", "application/json")
	resp, _ = http.DefaultClient.Do(req)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.Error("error getting user", "status", resp.StatusCode)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	ghUser := GitHubUser{}
	if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
		logger.Error("error decoding user", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	logger.Info("github user fetched", "username", ghUser.Login, "github_id", ghUser.UserID)
	username := ghUser.Login
	_, err = h.repo.GetUser(r.Context(), username)
	if errors.Is(err, ErrNotFound) {
		if err := h.repo.CreateUser(r.Context(), username); err != nil {
			logger.Error("error creating user", "user", username, "error", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		logger.Error("error checking if user exists", "user", username, "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	id := GenerateSecureToken(32)
	if err := h.repo.CreateSession(r.Context(), id, username); err != nil {
		logger.Error("error creating session", "user", username, "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	logger.Info("created session", "user", username)
	c := http.Cookie{
		Name:     "session_id",
		Value:    id,
		Path:     "/",
		Expires:  time.Now().Add(72 * time.Hour),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, &c)
	http.SetCookie(w, &http.Cookie{
		Name:   "oauth_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	logger.Info("logged in", "user", username)
	http.Redirect(w, r, "http://glitch.local:5173/dashboard", http.StatusFound)
	return

}

func GenerateSecureToken(length int) string {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return base64.URLEncoding.EncodeToString(b)
}
