package main

import (
	"fmt"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("api-gateway healthy"))
	})

	fmt.Println("API Gateway running on port 8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}