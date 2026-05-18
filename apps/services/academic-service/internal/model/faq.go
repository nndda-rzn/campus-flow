package model

import "time"

type FAQCategory struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Icon          string    `json:"icon"`
	SequenceOrder int       `json:"sequence_order"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
}

type FAQ struct {
	ID            string    `json:"id"`
	CategoryID    string    `json:"category_id"`
	Question      string    `json:"question"`
	Answer        string    `json:"answer"`
	SequenceOrder int       `json:"sequence_order"`
	IsActive      bool      `json:"is_active"`
	ViewCount     int       `json:"view_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Derived
	CategoryName string `json:"category_name"`
}
