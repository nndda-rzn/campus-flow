// Hand-written extension for history types.
// These are plain Go structs (not protobuf-generated) used for the
// GetAcademicRequestHistory gRPC method added manually.
package academicv1

// GetAcademicRequestHistoryRequest is the request message for GetAcademicRequestHistory.
type GetAcademicRequestHistoryRequest struct {
	RequestId string `json:"request_id"`
}

// RequestStatusHistoryItem represents a single status-change entry.
type RequestStatusHistoryItem struct {
	Id          string `json:"id"`
	RequestId   string `json:"request_id"`
	OldStatus   string `json:"old_status"`
	NewStatus   string `json:"new_status"`
	ActorUserId string `json:"actor_user_id"`
	Note        string `json:"note"`
	CreatedAt   string `json:"created_at"`
}

// GetAcademicRequestHistoryResponse is the response message for GetAcademicRequestHistory.
type GetAcademicRequestHistoryResponse struct {
	Histories []*RequestStatusHistoryItem `json:"histories"`
}
