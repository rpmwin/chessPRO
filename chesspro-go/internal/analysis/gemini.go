package analysis

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"google.golang.org/genai"
)

const systemPrompt = `You are a world-class chess coach giving move-by-move commentary. You receive a JSON array of half-moves with:
- move_number: 1-based half-move index (odd = white, even = black)
- played_move: move played in SAN notation
- best_move: engine's best move in SAN notation
- centipawn_loss: how many centipawns were lost (player's perspective, 0 = no loss)
- classification: "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder"
- is_best_move: true if played_move matches engine best

Commentary rules (strictly follow these):
1. BEST/EXCELLENT (centipawn_loss <= 10): ONE short positive sentence. Mention the idea behind the move when instructive — e.g. "Nf3 develops the knight and prepares castling." or "e4 claims the center immediately."
2. GOOD (10–25 cp loss): Brief positive with a tiny note — "Good developing move. Nf6 was also strong here, fighting for the center with tempo."
3. INACCURACY (25–50 cp loss): Explain what was missed. Always name the better move. "A slight inaccuracy — {best_move} was more precise, keeping the bishop active and preventing queenside expansion."
4. MISTAKE (50–100 cp loss): Be clear and direct. State what should have been played and the concrete reason. "This loses a pawn — {best_move} defends while counterattacking with the rook."
5. BLUNDER (100+ cp loss): Be very direct. Name the blunder, name the refutation. "Blunder! {best_move} was necessary. After this move White wins material with a fork on d5."

Additional guidelines:
- Vary your language — don't start every sentence with "This move" or repeat the same phrases
- When relevant, name chess concepts: fork, pin, skewer, discovered attack, overloaded piece, weak square, open file, outpost, pawn structure
- For opening moves, mention the opening system when recognizable
- Always use SAN notation for any move you name
- Never repeat move_number in the comment — that's shown by the UI
- Keep comments 1–3 sentences max. Coaches are concise.

Return ONLY a raw JSON array (no markdown, no code fences, no explanation):
[{"move_number": N, "comment": "..."}, ...]`

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

func (g *GeminiClient) GetCommentary(ctx context.Context, moves []GeminiInput) ([]Comment, error) {
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

	rawText := ""
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		rawText = resp.Candidates[0].Content.Parts[0].Text
	}
	if rawText == "" {
		return nil, fmt.Errorf("empty gemini response")
	}

	// strip markdown code fences if present
	text := strings.TrimSpace(rawText)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")

	start := strings.Index(text, "[")
	end := strings.LastIndex(text, "]")
	if start < 0 || end < 0 {
		return nil, fmt.Errorf("no JSON array in gemini response: %s", text)
	}
	text = text[start : end+1]

	// Gemini returns snake_case: {"move_number": N, "comment": "..."}
	type geminiItem struct {
		MoveNumber int    `json:"move_number"`
		Comment    string `json:"comment"`
	}
	var parsed []geminiItem
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, fmt.Errorf("parse gemini JSON: %w", err)
	}
	comments := make([]Comment, len(parsed))
	for i, p := range parsed {
		comments[i] = Comment{MoveNumber: p.MoveNumber, Comment: p.Comment}
	}
	return comments, nil
}

func ptr[T any](v T) *T { return &v }
