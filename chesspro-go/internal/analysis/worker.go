package analysis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/notnil/chess"
)

const TaskTypeAnalysis = "analysis:run"
const analysisDepth = 15

type TaskPayload struct {
	AnalysisID string `json:"analysis_id"`
}

func NewAnalysisTask(analysisID string) (*asynq.Task, error) {
	payload, err := json.Marshal(TaskPayload{AnalysisID: analysisID})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TaskTypeAnalysis, payload), nil
}

type Worker struct {
	repo     *Repository
	sf       *Stockfish
	gemini   *GeminiClient
}

func NewWorker(repo *Repository, sf *Stockfish, gemini *GeminiClient) *Worker {
	return &Worker{repo: repo, sf: sf, gemini: gemini}
}

func (w *Worker) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload TaskPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}

	a, err := w.repo.FindByID(ctx, payload.AnalysisID)
	if err != nil {
		return fmt.Errorf("find analysis: %w", err)
	}

	if err := w.repo.SetStatus(ctx, a.ID, StatusProcessing); err != nil {
		return fmt.Errorf("set processing: %w", err)
	}

	results, err := w.analyze(ctx, a)
	if err != nil {
		log.Printf("analysis %s failed: %v", a.ID, err)
		_ = w.repo.SaveError(ctx, a.ID, err.Error())
		return err
	}

	if err := w.repo.SaveResults(ctx, a.ID, results); err != nil {
		return fmt.Errorf("save results: %w", err)
	}

	log.Printf("analysis %s done: %d moves", a.ID, len(results.Moves))
	return nil
}

func (w *Worker) analyze(ctx context.Context, a *Analysis) (*Results, error) {
	// Parse PGN → ordered list of (FEN before move, played move SAN)
	game, err := parsePGN(a.PGN)
	if err != nil {
		return nil, fmt.Errorf("parse PGN: %w", err)
	}

	moves := game.Moves()
	positions := game.Positions()
	if len(moves) == 0 {
		return nil, fmt.Errorf("no moves in PGN")
	}

	// Build FEN list (position BEFORE each move)
	fens := make([]string, len(moves))
	for i := range moves {
		fens[i] = positions[i].String()
	}

	// Stockfish: analyze all positions in one process
	sfResults, err := w.sf.AnalyzeGame(fens, analysisDepth)
	if err != nil {
		return nil, fmt.Errorf("stockfish: %w", err)
	}

	moveResults := make([]MoveResult, len(moves))
	for i, move := range moves {
		mr := MoveResult{
			MoveNumber: i + 1,
			PlayedMove: move.String(),
			Depth:      sfResults[i].Depth,
			Eval:       sfResults[i].Eval,
		}
		// Convert UCI best move to SAN using the position
		if sfResults[i].BestMove != "" {
			mr.BestMove = sfResults[i].BestMove // keep UCI for now; frontend can render
		}
		moveResults[i] = mr
	}

	// Gemini commentary
	commentary, err := w.gemini.GetCommentary(ctx, moveResults)
	if err != nil {
		// Non-fatal: save results without commentary
		log.Printf("gemini commentary failed for %s: %v", a.ID, err)
		commentary = []Comment{}
	}

	return &Results{
		Moves:      moveResults,
		Commentary: commentary,
	}, nil
}

func parsePGN(pgn string) (*chess.Game, error) {
	reader, err := chess.PGN(strings.NewReader(pgn))
	if err != nil {
		return nil, err
	}
	game := chess.NewGame(reader)
	return game, nil
}
