package repository

import "strconv"

func itoa(i int) string {
	return strconv.Itoa(i)
}

// ptrOrEmpty returns *p as string, or "" if p is nil. Useful for converting
// nullable string pointers to a placeholder value when calling NULLIF($n, '').
func ptrOrEmpty(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
