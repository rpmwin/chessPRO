package analysis

import (
	"context"
	"os"
	"testing"
)

func TestGeminiGetCommentary(t *testing.T) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		t.Skip("GEMINI_API_KEY not set")
	}

	ctx := context.Background()
	client, err := NewGeminiClient(ctx, apiKey)
	if err != nil {
		t.Fatalf("NewGeminiClient: %v", err)
	}

	moves := []GeminiInput{
		{MoveNumber: 1, PlayedMove: "e4", BestMove: "e4", CentipawnLoss: 0, Classification: ClassBest, IsBestMove: true},
		{MoveNumber: 2, PlayedMove: "e5", BestMove: "e5", CentipawnLoss: 20, Classification: ClassGood, IsBestMove: false},
	}

	comments, err := client.GetCommentary(ctx, moves)
	if err != nil {
		t.Fatalf("GetCommentary: %v", err)
	}
	if len(comments) == 0 {
		t.Fatal("expected at least one comment")
	}
	for _, c := range comments {
		t.Logf("move %d: %s", c.MoveNumber, c.Comment)
	}
}
