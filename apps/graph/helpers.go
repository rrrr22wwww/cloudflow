package graph

func stringPointersToValues(items []*string) []string {
	if len(items) == 0 {
		return nil
	}

	values := make([]string, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		values = append(values, *item)
	}

	return values
}
