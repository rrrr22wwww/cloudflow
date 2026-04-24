package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rrrr22wwww.com/cloudflow/internal/services"
	"github.com/vektah/gqlparser/v2/ast"
	"github.com/vektah/gqlparser/v2/parser"
)

var publicMutationFields = map[string]struct{}{
	"login":                 {},
	"register":              {},
	"requestEmailLoginCode": {},
	"verifyEmailLoginCode":  {},
}

type graphQLRequest struct {
	Query         string `json:"query"`
	OperationName string `json:"operationName"`
}

func Authorization(store services.SessionStore, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, hasToken, err := parseBearerToken(c.GetHeader("Authorization"))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
			return
		}

		if hasToken {
			claims, err := services.ParseToken(jwtSecret, token)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
				return
			}

			session, err := store.Get(c.Request.Context(), token)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session not found"})
				return
			}

			if session.UserID != claims.UserID {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token subject mismatch"})
				return
			}

			requestCtx := services.WithAuth(c.Request.Context(), claims.UserID, claims.Role, token)
			c.Request = c.Request.WithContext(requestCtx)
			c.Next()
			return
		}

		if isPublicGraphQLOperation(c) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization token is required"})
	}
}

func parseBearerToken(header string) (token string, hasToken bool, err error) {
	if strings.TrimSpace(header) == "" {
		return "", false, nil
	}

	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", false, fmt.Errorf("invalid scheme")
	}

	token = strings.TrimSpace(strings.TrimPrefix(header, prefix))
	if token == "" {
		return "", false, fmt.Errorf("empty token")
	}

	return token, true, nil
}

func isPublicGraphQLOperation(c *gin.Context) bool {
	if c.Request.Method != http.MethodPost {
		return false
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return false
	}
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	if len(bytes.TrimSpace(body)) == 0 {
		return false
	}

	var req graphQLRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return false
	}

	if strings.TrimSpace(req.Query) == "" {
		return false
	}

	doc, err := parser.ParseQuery(&ast.Source{Input: req.Query})
	if err != nil {
		return false
	}

	op := selectOperation(doc, req.OperationName)
	if op == nil || op.Operation != ast.Mutation {
		return false
	}

	if len(op.SelectionSet) == 0 {
		return false
	}

	for _, selection := range op.SelectionSet {
		field, ok := selection.(*ast.Field)
		if !ok {
			return false
		}
		if _, ok := publicMutationFields[field.Name]; !ok {
			return false
		}
	}

	return true
}

func selectOperation(doc *ast.QueryDocument, operationName string) *ast.OperationDefinition {
	if doc == nil || len(doc.Operations) == 0 {
		return nil
	}

	if operationName != "" {
		for _, op := range doc.Operations {
			if op.Name == operationName {
				return op
			}
		}
		return nil
	}

	return doc.Operations[0]
}
