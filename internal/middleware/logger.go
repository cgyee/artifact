package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type ctxKey struct{}

var loggerKey = ctxKey{}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		//correlationID := r.Header.Get("X-Correlation-ID")
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}

		logger := slog.With(
			"method", r.Method,
			"path", path,
			"requestID", requestID,
			//"correlationID", correlationID,
		)
		ctx := context.WithValue(r.Context(), loggerKey, logger)
		start := time.Now()
		logger.Info("request started")

		rw := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rw, r.WithContext(ctx))

		logger.Info("request completed",
			"status", rw.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

func LoggerFromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(loggerKey).(*slog.Logger); ok {
		return logger
	}
	return slog.Default()
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
