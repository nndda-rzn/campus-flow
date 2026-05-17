package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

type requestIDKey struct{}

const RequestIDHeader = "X-Request-ID"

// RequestIDMiddleware ensures every request has a unique X-Request-ID. It
// honors an inbound header (e.g. from an upstream load balancer) and otherwise
// generates a 16-byte hex value. The ID is mirrored back on the response and
// pushed into the request context so downstream handlers can include it in
// logs.
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(RequestIDHeader)
		if id == "" {
			id = newRequestID()
		}
		w.Header().Set(RequestIDHeader, id)
		ctx := context.WithValue(r.Context(), requestIDKey{}, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetRequestID returns the request ID stored in the context, or "" when
// the request did not pass through RequestIDMiddleware.
func GetRequestID(ctx context.Context) string {
	v, _ := ctx.Value(requestIDKey{}).(string)
	return v
}

func newRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "00000000000000000000000000000000"
	}
	return hex.EncodeToString(b)
}
