package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

// RateLimiter implements a simple in-memory rate limiter
type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientRateLimit
	limit   int           // requests per window
	window  time.Duration // window duration
}

type clientRateLimit struct {
	count     int
	resetTime time.Time
}

// NewRateLimiter creates a new rate limiter
// limit: max requests per window
// window: duration of the rate limiting window
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		clients: make(map[string]*clientRateLimit),
		limit:   limit,
		window:  window,
	}
}

// Allow checks if a request from the given IP is allowed
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	client, exists := rl.clients[ip]
	if !exists {
		rl.clients[ip] = &clientRateLimit{
			count:     1,
			resetTime: now.Add(rl.window),
		}
		return true
	}

	// Check if window has expired
	if now.After(client.resetTime) {
		client.count = 1
		client.resetTime = now.Add(rl.window)
		return true
	}

	// Check if limit exceeded
	if client.count >= rl.limit {
		return false
	}

	client.count++
	return true
}

// RateLimitMiddleware creates a middleware that limits requests per IP
func RateLimitMiddleware(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getClientIP(r)

			if !rl.Allow(ip) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-RateLimit-Limit", "100")
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"success":false,"message":"rate limit exceeded"}`))
				return
			}

			w.Header().Set("X-RateLimit-Limit", "100")
			w.Header().Set("X-RateLimit-Remaining", "99") // Approximate

			next.ServeHTTP(w, r)
		})
	}
}

// getClientIP extracts the client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxied requests)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP in the list
		for i := 0; i < len(xff); i++ {
			if xff[i] == ',' {
				return xff[:i]
			}
		}
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	// RemoteAddr is in the format "IP:port", so we need to extract just the IP
	addr := r.RemoteAddr
	if colonIdx := strings.LastIndex(addr, ":"); colonIdx != -1 {
		return addr[:colonIdx]
	}
	return addr
}
