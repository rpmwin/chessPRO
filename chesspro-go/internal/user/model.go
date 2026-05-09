package user

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        *string   `json:"email,omitempty"`
	Name         string    `json:"name"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
	GoogleID     *string   `json:"-"`
	TokenVersion int       `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
