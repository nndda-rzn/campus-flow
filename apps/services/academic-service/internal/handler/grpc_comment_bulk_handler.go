package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func toProtoComment(c *model.RequestComment) *academicv1.RequestCommentItem {
	return &academicv1.RequestCommentItem{
		Id:           c.ID,
		RequestId:    c.RequestID,
		RequestType:  c.RequestType,
		AuthorUserId: c.AuthorUserID,
		AuthorName:   c.AuthorName,
		AuthorRole:   c.AuthorRole,
		Body:         c.Body,
		CreatedAt:    c.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}

func mapCommentError(err error) error {
	if errors.Is(err, service.ErrCommentInvalid) {
		return status.Error(codes.InvalidArgument, "invalid comment payload")
	}
	if errors.Is(err, service.ErrInvalidInput) {
		return status.Error(codes.InvalidArgument, "invalid input")
	}
	return status.Error(codes.Internal, err.Error())
}

func (h *AcademicHandler) ListRequestComments(
	ctx context.Context,
	req *academicv1.ListRequestCommentsRequest,
) (*academicv1.ListRequestCommentsResponse, error) {
	items, err := h.academicService.ListRequestComments(ctx, req.RequestType, req.RequestId)
	if err != nil {
		return nil, mapCommentError(err)
	}
	out := make([]*academicv1.RequestCommentItem, 0, len(items))
	for _, it := range items {
		c := it
		out = append(out, toProtoComment(&c))
	}
	return &academicv1.ListRequestCommentsResponse{Items: out}, nil
}

func (h *AcademicHandler) CreateRequestComment(
	ctx context.Context,
	req *academicv1.CreateRequestCommentRequest,
) (*academicv1.RequestCommentResponse, error) {
	c, err := h.academicService.CreateRequestComment(ctx, model.RequestComment{
		RequestID:    req.RequestId,
		RequestType:  req.RequestType,
		AuthorUserID: req.AuthorUserId,
		AuthorName:   req.AuthorName,
		AuthorRole:   req.AuthorRole,
		Body:         req.Body,
	})
	if err != nil {
		return nil, mapCommentError(err)
	}
	return &academicv1.RequestCommentResponse{Comment: toProtoComment(c)}, nil
}

func (h *AcademicHandler) BulkVerifyAcademicRequests(
	ctx context.Context,
	req *academicv1.BulkVerifyAcademicRequestsRequest,
) (*academicv1.BulkVerifyAcademicRequestsResponse, error) {
	results, err := h.academicService.BulkVerifyAcademicRequests(
		ctx, req.RequestIds, req.ActorUserId, req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	out := make([]*academicv1.BulkVerifyResultItem, 0, len(results))
	var ok, fail int32
	for _, r := range results {
		if r.Success {
			ok++
		} else {
			fail++
		}
		out = append(out, &academicv1.BulkVerifyResultItem{
			RequestId: r.RequestID,
			Success:   r.Success,
			Error:     r.Error,
		})
	}
	return &academicv1.BulkVerifyAcademicRequestsResponse{
		Results:   out,
		Succeeded: ok,
		Failed:    fail,
	}, nil
}
