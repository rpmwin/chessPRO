package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/iamrpm/chesspro-go/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const refreshCookieName = "jid"

type Handler struct {
	svc         *Service
	cfg         *config.Config
	oauthConfig *oauth2.Config
}

func NewHandler(svc *Service, cfg *config.Config) *Handler {
	oauthCfg := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURI,
		Scopes:       []string{"profile", "email"},
		Endpoint:     google.Endpoint,
	}
	return &Handler{svc: svc, cfg: cfg, oauthConfig: oauthCfg}
}

func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Name == "" || body.Email == "" || body.Password == "" {
		writeErr(w, http.StatusBadRequest, "name, email and password are required")
		return
	}

	u, pair, err := h.svc.Signup(r.Context(), body.Name, body.Email, body.Password)
	if errors.Is(err, ErrEmailInUse) {
		writeErr(w, http.StatusConflict, "email already in use")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "signup failed")
		return
	}

	h.setRefreshCookie(w, pair.RefreshToken)
	writeJSON(w, http.StatusCreated, map[string]any{"user": u, "access_token": pair.AccessToken})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Email == "" || body.Password == "" {
		writeErr(w, http.StatusBadRequest, "email and password are required")
		return
	}

	u, pair, err := h.svc.Login(r.Context(), body.Email, body.Password)
	if errors.Is(err, ErrInvalidCreds) {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "login failed")
		return
	}

	h.setRefreshCookie(w, pair.RefreshToken)
	writeJSON(w, http.StatusOK, map[string]any{"user": u, "access_token": pair.AccessToken})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "missing refresh token")
		return
	}

	_, pair, err := h.svc.RefreshTokens(r.Context(), cookie.Value)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	h.setRefreshCookie(w, pair.RefreshToken)
	writeJSON(w, http.StatusOK, map[string]any{"access_token": pair.AccessToken})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	u := UserFromCtx(r.Context())
	if u != nil {
		_ = h.svc.Logout(r.Context(), u.ID)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/auth/refresh",
		MaxAge:   -1,
		HttpOnly: true,
	})
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (h *Handler) GoogleRedirect(w http.ResponseWriter, r *http.Request) {
	url := h.oauthConfig.AuthCodeURL("state", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		writeErr(w, http.StatusBadRequest, "missing oauth code")
		return
	}

	token, err := h.oauthConfig.Exchange(r.Context(), code)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "oauth exchange failed")
		return
	}

	client := h.oauthConfig.Client(r.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to fetch user info")
		return
	}
	defer resp.Body.Close()

	var info struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to decode user info")
		return
	}

	u, pair, err := h.svc.UpsertGoogleUser(r.Context(), info.ID, info.Email, info.Name, info.Picture)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "google login failed")
		return
	}

	h.setRefreshCookie(w, pair.RefreshToken)
	http.Redirect(w, r, h.cfg.ClientHomeURL+"/oauth-success?access_token="+pair.AccessToken, http.StatusTemporaryRedirect)
	_ = u
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	u := UserFromCtx(r.Context())
	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/auth/refresh",
		HttpOnly: true,
		Secure:   h.cfg.IsProduction(),
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
