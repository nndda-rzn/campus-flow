package service

import "testing"

// TestAcademicTransitions_Matrix exhaustively verifies the academic state
// machine. For every (from, to) pair we assert whether the transition is
// allowed, matching the FR-137 specification.
func TestAcademicTransitions_Matrix(t *testing.T) {
	allStatuses := []string{
		"DRAFT",
		"SUBMITTED",
		"VERIFIED",
		"APPROVED",
		"REJECTED",
		"REVISION_REQUIRED",
		"COMPLETED",
		"CANCELLED",
	}

	allowed := map[string]map[string]bool{
		"DRAFT": {
			"SUBMITTED": true,
			"CANCELLED": true,
		},
		"SUBMITTED": {
			"VERIFIED":          true,
			"REVISION_REQUIRED": true,
			"CANCELLED":         true,
		},
		"VERIFIED": {
			"APPROVED": true,
			"REJECTED": true,
		},
		"APPROVED": {
			"COMPLETED": true,
		},
		"REVISION_REQUIRED": {
			"SUBMITTED": true,
			"CANCELLED": true,
		},
		// terminal: REJECTED, COMPLETED, CANCELLED have no outgoing transitions
	}

	for _, from := range allStatuses {
		for _, to := range allStatuses {
			expected := allowed[from][to]
			got := CanTransition(AcademicTransitions, from, to)
			if got != expected {
				t.Errorf("CanTransition(%s -> %s) = %v, want %v", from, to, got, expected)
			}
		}
	}
}

func TestSupervisorTransitions_Matrix(t *testing.T) {
	allStatuses := []string{
		"SUBMITTED",
		"VERIFIED",
		"REVISION_REQUIRED",
		"ASSIGNED",
		"ACCEPTED",
		"REJECTED",
		"COMPLETED",
		"CANCELLED",
	}

	allowed := map[string]map[string]bool{
		"SUBMITTED": {
			"VERIFIED":          true,
			"REVISION_REQUIRED": true,
			"CANCELLED":         true,
		},
		"VERIFIED": {
			"ASSIGNED": true,
		},
		"REVISION_REQUIRED": {
			"SUBMITTED": true,
			"CANCELLED": true,
		},
		"ASSIGNED": {
			"ACCEPTED": true,
			"REJECTED": true,
		},
		"ACCEPTED": {
			"COMPLETED": true,
		},
	}

	for _, from := range allStatuses {
		for _, to := range allStatuses {
			expected := allowed[from][to]
			got := CanTransition(SupervisorTransitions, from, to)
			if got != expected {
				t.Errorf("CanTransition(%s -> %s) = %v, want %v", from, to, got, expected)
			}
		}
	}
}

func TestAllowedFrom_Academic(t *testing.T) {
	cases := map[string][]string{
		"SUBMITTED":         {"DRAFT", "REVISION_REQUIRED"},
		"VERIFIED":          {"SUBMITTED"},
		"APPROVED":          {"VERIFIED"},
		"REJECTED":          {"VERIFIED"},
		"REVISION_REQUIRED": {"SUBMITTED"},
		"COMPLETED":         {"APPROVED"},
		"CANCELLED":         {"DRAFT", "SUBMITTED", "REVISION_REQUIRED"},
	}

	for to, expectedSources := range cases {
		got := AllowedFrom(AcademicTransitions, to)

		gotSet := make(map[string]bool, len(got))
		for _, s := range got {
			gotSet[s] = true
		}
		expectedSet := make(map[string]bool, len(expectedSources))
		for _, s := range expectedSources {
			expectedSet[s] = true
		}

		if len(gotSet) != len(expectedSet) {
			t.Errorf("AllowedFrom(_, %s) returned %v, expected %v", to, got, expectedSources)
			continue
		}
		for s := range expectedSet {
			if !gotSet[s] {
				t.Errorf("AllowedFrom(_, %s) missing %s; got %v", to, s, got)
			}
		}
	}
}
