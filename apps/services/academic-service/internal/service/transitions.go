package service

// AcademicTransitions defines the allowed state transitions for academic
// service requests. Key = current status, value = list of statuses the request
// can move to.
//
// Terminal statuses (no outgoing transitions): REJECTED, COMPLETED, CANCELLED.
//
// Note: DRAFT is kept as a legacy initial value but is not user-facing in the
// current MVP — newly created requests are inserted directly as SUBMITTED.
var AcademicTransitions = map[string][]string{
	"DRAFT":             {"SUBMITTED", "CANCELLED"},
	"SUBMITTED":         {"VERIFIED", "REVISION_REQUIRED", "CANCELLED"},
	"VERIFIED":          {"APPROVED", "REJECTED"},
	"APPROVED":          {"COMPLETED"},
	"REVISION_REQUIRED": {"SUBMITTED", "CANCELLED"},
}

// SupervisorTransitions defines the allowed state transitions for supervisor
// requests.
//
// Terminal statuses: REJECTED, COMPLETED, CANCELLED.
//
// ACCEPTED is treated as a transient status: it is immediately followed by
// COMPLETED in the same database transaction (see supervisor_repository).
var SupervisorTransitions = map[string][]string{
	"SUBMITTED":         {"VERIFIED", "REVISION_REQUIRED", "CANCELLED"},
	"VERIFIED":          {"ASSIGNED"},
	"REVISION_REQUIRED": {"SUBMITTED", "CANCELLED"},
	"ASSIGNED":          {"ACCEPTED", "REJECTED"},
	"ACCEPTED":          {"COMPLETED"},
}

// CanTransition reports whether a transition from `from` to `to` is allowed by
// the given table.
func CanTransition(table map[string][]string, from, to string) bool {
	allowed, ok := table[from]
	if !ok {
		return false
	}
	for _, candidate := range allowed {
		if candidate == to {
			return true
		}
	}
	return false
}

// AllowedFrom returns the source statuses that can transition into the given
// target status. Useful when calling repository helpers that take an
// allowedCurrentStatuses slice.
func AllowedFrom(table map[string][]string, to string) []string {
	var sources []string
	for from, targets := range table {
		for _, candidate := range targets {
			if candidate == to {
				sources = append(sources, from)
				break
			}
		}
	}
	return sources
}
