package model

import "time"

type File struct {
	ID               string
	OriginalName     string
	StoredName       string
	StoragePath      string
	MimeType         string
	SizeBytes        int64
	UploadedByUserID string
	OwnerType        string
	OwnerID          string
	Purpose          string
	Status           string
	CreatedAt        time.Time
}