package model

import "time"

type RequestComment struct {
	ID           string
	RequestID    string
	RequestType  string // ACADEMIC | SUPERVISOR
	AuthorUserID string
	AuthorName   string
	AuthorRole   string
	Body         string
	CreatedAt    time.Time
}
