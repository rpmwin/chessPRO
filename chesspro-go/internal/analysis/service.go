package analysis

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"
)

type Service struct {
	repo   *Repository
	client *asynq.Client
}

func NewService(repo *Repository, client *asynq.Client) *Service {
	return &Service{repo: repo, client: client}
}

// Submit creates a DB record and enqueues the analysis job (async).
func (s *Service) Submit(ctx context.Context, userID, pgn string) (*Analysis, error) {
	a, err := s.repo.Create(ctx, userID, pgn)
	if err != nil {
		return nil, fmt.Errorf("create analysis record: %w", err)
	}

	task, err := NewAnalysisTask(a.ID)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}

	if _, err := s.client.EnqueueContext(ctx, task); err != nil {
		return nil, fmt.Errorf("enqueue task: %w", err)
	}

	return a, nil
}

// CreateRecord creates a DB record without enqueuing (for sync/inline processing).
func (s *Service) CreateRecord(ctx context.Context, userID, pgn string) (*Analysis, error) {
	return s.repo.Create(ctx, userID, pgn)
}
