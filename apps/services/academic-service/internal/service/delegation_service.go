package service

import (
	"context"
	"strings"
	"time"

	"campus-flow/apps/services/academic-service/internal/repository"
)

func (s *AcademicService) ListDelegations(
	ctx context.Context,
	delegatorUserID string,
	includeExpired bool,
) ([]repository.Delegation, error) {
	if strings.TrimSpace(delegatorUserID) == "" {
		return nil, ErrInvalidInput
	}
	repo := repository.NewDelegationRepository(s.repo.DB())
	return repo.List(ctx, delegatorUserID, includeExpired)
}

func (s *AcademicService) CreateDelegation(
	ctx context.Context,
	delegatorUserID, delegateUserID, delegateName, reason string,
	startsAt, endsAt time.Time,
) (*repository.Delegation, error) {
	delegatorUserID = strings.TrimSpace(delegatorUserID)
	delegateUserID = strings.TrimSpace(delegateUserID)
	delegateName = strings.TrimSpace(delegateName)
	reason = strings.TrimSpace(reason)

	if delegatorUserID == "" || delegateUserID == "" || delegateName == "" {
		return nil, ErrInvalidInput
	}
	if endsAt.Before(startsAt) || endsAt.Before(time.Now()) {
		return nil, ErrInvalidInput
	}

	repo := repository.NewDelegationRepository(s.repo.DB())
	d, err := repo.Create(ctx, delegatorUserID, delegateUserID, delegateName, reason, startsAt, endsAt)
	if err != nil {
		if err == repository.ErrDelegationOverlap {
			return nil, ErrDelegationOverlap
		}
		return nil, err
	}
	return d, nil
}

func (s *AcademicService) RevokeDelegation(
	ctx context.Context,
	id, actorUserID string,
) (*repository.Delegation, error) {
	if strings.TrimSpace(id) == "" || strings.TrimSpace(actorUserID) == "" {
		return nil, ErrInvalidInput
	}
	repo := repository.NewDelegationRepository(s.repo.DB())
	d, err := repo.Revoke(ctx, id, actorUserID)
	if err != nil {
		if err == repository.ErrDelegationNotFound {
			return nil, ErrAcademicRequestNotFound
		}
		return nil, err
	}
	return d, nil
}

func (s *AcademicService) CheckDelegation(
	ctx context.Context,
	userID string,
) (*repository.Delegation, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, ErrInvalidInput
	}
	repo := repository.NewDelegationRepository(s.repo.DB())
	return repo.CheckActive(ctx, userID)
}
