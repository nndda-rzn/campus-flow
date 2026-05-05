package main

import (
	"fmt"
	"net/http"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/handler"
)

func main() {
	authClient := client.NewAuthClient("localhost:50051")
	defer authClient.Close()

	authHandler := handler.NewAuthHandler(authClient)

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("api-gateway healthy"))
	})

	mux.HandleFunc("/api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("/api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("/api/v1/auth/refresh", authHandler.RefreshToken)
	mux.HandleFunc("/api/v1/auth/validate", authHandler.ValidateToken)
	mux.HandleFunc("/api/v1/auth/logout", authHandler.Logout)

	fmt.Println("API Gateway running on port 8080")
	fmt.Println("Auth Service target: localhost:50051")

	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}