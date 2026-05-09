package analysis

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"google.golang.org/genai"
)

const systemPrompt = `You are a chess coach. Given a JSON array of moves with fields:
  move_number, played_move, eval, best_move, depth
Return ONLY a JSON array of objects: [{"move_number": N, "comment": "one-sentence tip"}]
No markdown, no explanation, just raw JSON array.`

type GeminiClient struct {
	client *genai.Client
	model  string
}

func NewGeminiClient(ctx context.Context, apiKey string) (*GeminiClient, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("gemini client: %w", err)
	}
	return &GeminiClient{client: client, model: "gemini-2.5-flash"}, nil
}

func (g *GeminiClient) GetCommentary(ctx context.Context, moves []MoveResult) ([]Comment, error) {
	movesJSON, err := json.Marshal(moves)
	if err != nil {
		return nil, err
	}

	resp, err := g.client.Models.GenerateContent(ctx, g.model, genai.Text(string(movesJSON)), &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(systemPrompt, genai.RoleUser),
		Temperature:       ptr(float32(0.7)),
		MaxOutputTokens:   8000,
	})
	if err != nil {
		return nil, fmt.Errorf("gemini generate: %w", err)
	}

	raw := ""
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		raw = resp.Candidates[0].Content.Parts[0].Text
	}
	if raw == "" {
		return nil, fmt.Errorf("empty gemini response")
	}

	// strip markdown code fences if present
	text := strings.TrimSpace(raw)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")

	start := strings.Index(text, "[")
	end := strings.LastIndex(text, "]")
	if start < 0 || end < 0 {
		return nil, fmt.Errorf("no JSON array in gemini response: %s", text)
	}
	text = text[start : end+1]

	var comments []Comment
	if err := json.Unmarshal([]byte(text), &comments); err != nil {
		return nil, fmt.Errorf("parse gemini JSON: %w", err)
	}
	return comments, nil
}

func ptr[T any](v T) *T { return &v }
