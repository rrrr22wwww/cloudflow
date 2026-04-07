package graph

import "fmt"

type Param struct {
	Column string
	Value  *string
}

func buildEqualityQuery(base *string, params *[]Param, command string) (string, []any) {
	query := *base
	args := make([]any, 0, len(*params))
	argIdx := 1
	for _, p := range *params {
		if p.Value != nil {
			fmt.Printf("Adding condition: %s %s = $%d\n", p.Column, command, argIdx)
			query += fmt.Sprintf(" %s %s = $%d", command, p.Column, argIdx)
			fmt.Printf("Query after adding condition: %s\n", query)
			args = append(args, *p.Value)
			argIdx++
		}
	}
	return query, args
}
