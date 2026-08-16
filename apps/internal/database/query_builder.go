package database

import "fmt"

// Param is an optional equality filter: a nil Value means "no filter on
// this column".
type Param struct {
	Column string
	Value  *string
}

// buildEqualityQuery appends "AND column = $n" clauses to the base query
// for every param with a non-nil value. Column names come from a fixed
// allowlist in this package (never from user input), so only values are
// parameterized.
func buildEqualityQuery(base string, params []Param) (string, []any) {
	query := base
	args := make([]any, 0, len(params))
	for _, p := range params {
		if p.Value != nil {
			args = append(args, *p.Value)
			query += fmt.Sprintf(" AND %s = $%d", p.Column, len(args))
		}
	}
	return query, args
}
