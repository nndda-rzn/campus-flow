package repository_test

// Preservation Property Tests — Property 2
//
// GOAL: Verify that normal operation (both PostgreSQL and RabbitMQ available) is
// unchanged — CreateAcademicRequest persists all four DB rows atomically and the
// outbox event payload stores student_user_id as a plain string.
//
// EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve after fix).
//
// These are integration tests that require a real PostgreSQL connection.
// They are skipped when TEST_DATABASE_URL is not set.
//
// Validates: Requirements 3.1, 3.2, 3.4

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"testing"
	"testing/quick"
	"time"
	"unicode"

	"campus-flow/apps/services/academic-service/internal/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

// knownServiceCodes are the service codes seeded in the migration.
var knownServiceCodes = []string{
	"SURAT_AKTIF_KULIAH",
	"SURAT_MAGANG",
	"IZIN_PENELITIAN",
	"SURAT_REKOMENDASI",
}

// connectTestDB opens a pgxpool connection using TEST_DATABASE_URL.
// Returns nil if the env var is not set (caller should skip).
func connectTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Fatalf("failed to ping test database: %v", err)
	}

	return pool
}

// generateUUID generates a random UUID v4 string.
func generateUUID(r *rand.Rand) string {
	b := make([]byte, 16)
	_, _ = r.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant bits
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// generateNonEmptyTitle generates a non-empty printable ASCII title.
func generateNonEmptyTitle(r *rand.Rand) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 "
	length := 1 + r.Intn(80) // 1..80 chars
	sb := strings.Builder{}
	for i := 0; i < length; i++ {
		sb.WriteByte(charset[r.Intn(len(charset))])
	}
	title := strings.TrimSpace(sb.String())
	if title == "" {
		title = "Test Request"
	}
	return title
}

// isValidUUIDString checks that s looks like a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
func isValidUUIDString(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		} else {
			if !unicode.Is(unicode.ASCII_Hex_Digit, c) {
				return false
			}
		}
	}
	return true
}

// TestPreservation_CreateAcademicRequest_ReturnsCorrectFields verifies that
// CreateAcademicRequest returns a non-nil *model.AcademicRequest with fields
// matching the inputs for randomly generated valid inputs.
//
// Property: For all valid (studentUserID UUID, serviceCode from known set, title non-empty),
// CreateAcademicRequest returns a request where:
//   - StudentUserID == studentUserID (input)
//   - ServiceCode == serviceCode (input)
//   - ServiceName is non-empty
//   - Title == title (input, after trimming)
//   - Status == "SUBMITTED"
//
// **Validates: Requirements 3.1, 3.2**
func TestPreservation_CreateAcademicRequest_ReturnsCorrectFields(t *testing.T) {
	pool := connectTestDB(t)
	defer pool.Close()

	repo := repository.NewAcademicRepository(pool)

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// property: for random valid inputs, returned request has correct fields
	property := func() bool {
		studentUserID := generateUUID(rng)
		serviceCode := knownServiceCodes[rng.Intn(len(knownServiceCodes))]
		title := generateNonEmptyTitle(rng)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		req, err := repo.CreateAcademicRequest(ctx, studentUserID, serviceCode, title, "")
		if err != nil {
			t.Logf("CreateAcademicRequest error (studentUserID=%s, serviceCode=%s, title=%q): %v",
				studentUserID, serviceCode, title, err)
			return false
		}
		if req == nil {
			t.Logf("CreateAcademicRequest returned nil request (studentUserID=%s, serviceCode=%s)",
				studentUserID, serviceCode)
			return false
		}

		if req.StudentUserID != studentUserID {
			t.Logf("StudentUserID mismatch: got %q, want %q", req.StudentUserID, studentUserID)
			return false
		}
		if req.ServiceCode != serviceCode {
			t.Logf("ServiceCode mismatch: got %q, want %q", req.ServiceCode, serviceCode)
			return false
		}
		if req.ServiceName == "" {
			t.Logf("ServiceName is empty for serviceCode=%q", serviceCode)
			return false
		}
		if req.Title != title {
			t.Logf("Title mismatch: got %q, want %q", req.Title, title)
			return false
		}
		if req.Status != "SUBMITTED" {
			t.Logf("Status mismatch: got %q, want %q", req.Status, "SUBMITTED")
			return false
		}

		return true
	}

	cfg := &quick.Config{
		MaxCount: 5, // 5 random inputs — each inserts a DB row, keep it reasonable
		Rand:     rng,
	}

	// quick.Check expects func(...) bool; wrap our zero-arg property
	if err := quick.Check(func(_ struct{}) bool { return property() }, cfg); err != nil {
		t.Errorf("preservation property failed: %v", err)
	}
}

// TestPreservation_CreateAcademicRequest_AllFourRowsInserted verifies that
// CreateAcademicRequest inserts all four rows atomically:
// service_requests, request_status_histories, audit_logs, outbox_events.
//
// Property: For all valid inputs, after CreateAcademicRequest succeeds,
// exactly one row exists in each of the four tables for the returned request ID.
//
// **Validates: Requirements 3.1, 3.2**
func TestPreservation_CreateAcademicRequest_AllFourRowsInserted(t *testing.T) {
	pool := connectTestDB(t)
	defer pool.Close()

	repo := repository.NewAcademicRepository(pool)

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	property := func() bool {
		studentUserID := generateUUID(rng)
		serviceCode := knownServiceCodes[rng.Intn(len(knownServiceCodes))]
		title := generateNonEmptyTitle(rng)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		req, err := repo.CreateAcademicRequest(ctx, studentUserID, serviceCode, title, "")
		if err != nil {
			t.Logf("CreateAcademicRequest error: %v", err)
			return false
		}

		// Check service_requests row
		var srCount int
		if err := pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM service_requests WHERE id = $1::uuid`, req.ID,
		).Scan(&srCount); err != nil || srCount != 1 {
			t.Logf("service_requests row missing for id=%s (count=%d, err=%v)", req.ID, srCount, err)
			return false
		}

		// Check request_status_histories row
		var rshCount int
		if err := pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM request_status_histories WHERE request_id = $1::uuid`, req.ID,
		).Scan(&rshCount); err != nil || rshCount != 1 {
			t.Logf("request_status_histories row missing for request_id=%s (count=%d, err=%v)", req.ID, rshCount, err)
			return false
		}

		// Check audit_logs row
		var alCount int
		if err := pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM audit_logs WHERE entity_id = $1::uuid AND action = 'ACADEMIC_REQUEST_CREATED'`, req.ID,
		).Scan(&alCount); err != nil || alCount != 1 {
			t.Logf("audit_logs row missing for entity_id=%s (count=%d, err=%v)", req.ID, alCount, err)
			return false
		}

		// Check outbox_events row
		var oeCount int
		if err := pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM outbox_events WHERE aggregate_id = $1::uuid AND event_type = 'academic_request.created'`, req.ID,
		).Scan(&oeCount); err != nil || oeCount != 1 {
			t.Logf("outbox_events row missing for aggregate_id=%s (count=%d, err=%v)", req.ID, oeCount, err)
			return false
		}

		return true
	}

	cfg := &quick.Config{
		MaxCount: 5,
		Rand:     rng,
	}

	if err := quick.Check(func(_ struct{}) bool { return property() }, cfg); err != nil {
		t.Errorf("atomic insert property failed: %v", err)
	}
}

// TestPreservation_OutboxEvent_StudentUserIDIsPlainString verifies that the
// outbox_events payload stores student_user_id as a plain JSON string, not a
// UUID object or any other type.
//
// Property: For all valid inputs, the outbox event payload's student_user_id
// field is a JSON string equal to the input studentUserID.
//
// This catches the secondary bug: `$3::uuid` inside jsonb_build_object would
// cause PostgreSQL to store the value as a UUID type rather than plain text,
// or fail with a cast error depending on driver behavior.
//
// **Validates: Requirements 3.2, 3.4**
func TestPreservation_OutboxEvent_StudentUserIDIsPlainString(t *testing.T) {
	pool := connectTestDB(t)
	defer pool.Close()

	repo := repository.NewAcademicRepository(pool)

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	property := func() bool {
		studentUserID := generateUUID(rng)
		serviceCode := knownServiceCodes[rng.Intn(len(knownServiceCodes))]
		title := generateNonEmptyTitle(rng)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		req, err := repo.CreateAcademicRequest(ctx, studentUserID, serviceCode, title, "")
		if err != nil {
			t.Logf("CreateAcademicRequest error: %v", err)
			return false
		}

		// Fetch the outbox event payload
		var payloadBytes []byte
		if err := pool.QueryRow(ctx,
			`SELECT payload FROM outbox_events WHERE aggregate_id = $1::uuid AND event_type = 'academic_request.created'`,
			req.ID,
		).Scan(&payloadBytes); err != nil {
			t.Logf("failed to fetch outbox event payload for aggregate_id=%s: %v", req.ID, err)
			return false
		}

		// Parse the JSONB payload
		var payload map[string]interface{}
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			t.Logf("failed to unmarshal outbox payload: %v", err)
			return false
		}

		// Assert student_user_id is a plain JSON string
		rawValue, ok := payload["student_user_id"]
		if !ok {
			t.Logf("outbox payload missing student_user_id field; payload=%s", string(payloadBytes))
			return false
		}

		strValue, isString := rawValue.(string)
		if !isString {
			t.Logf("outbox payload student_user_id is not a string — got %T (%v); payload=%s",
				rawValue, rawValue, string(payloadBytes))
			return false
		}

		if strValue != studentUserID {
			t.Logf("outbox payload student_user_id mismatch: got %q, want %q", strValue, studentUserID)
			return false
		}

		// Extra: confirm it looks like a UUID string (not some other encoding)
		if !isValidUUIDString(strValue) {
			t.Logf("outbox payload student_user_id is a string but not UUID format: %q", strValue)
			return false
		}

		return true
	}

	cfg := &quick.Config{
		MaxCount: 5,
		Rand:     rng,
	}

	if err := quick.Check(func(_ struct{}) bool { return property() }, cfg); err != nil {
		t.Errorf("outbox student_user_id string property failed: %v", err)
	}
}
