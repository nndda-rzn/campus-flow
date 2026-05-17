package middleware

import (
	"log/slog"
	"net/http"
	"os"
	"time"
)

var defaultLogger *slog.Logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
	Level: slog.LevelInfo,
}))

// statusRecorder captures the HTTP status so we can log it after the handler
// finishes. Defaults to 200 if the handler never explicitly writes a header.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	n, err := s.ResponseWriter.Write(b)
	s.bytes += n
	return n, err
}

// LoggingMiddleware emits one structured log line per HTTP request. Pairs
// nicely with RequestIDMiddleware so request_id flows into every log line.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(recorder, r)

		duration := time.Since(start)
		// Skip CORS preflight noise.
		if r.Method == http.MethodOptions {
			return
		}

		level := slog.LevelInfo
		if recorder.status >= 500 {
			level = slog.LevelError
		} else if recorder.status >= 400 {
			level = slog.LevelWarn
		}

		defaultLogger.LogAttrs(r.Context(), level, "http_request",
			slog.String("request_id", GetRequestID(r.Context())),
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", recorder.status),
			slog.Int("bytes", recorder.bytes),
			slog.Duration("duration", duration),
			slog.String("remote", r.RemoteAddr),
		)
	})
}
