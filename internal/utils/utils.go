package utils

import "net/http"

func ApplyMiddleware(h http.Handler, middleware ...func(http.Handler) http.Handler) http.Handler {
	if len(middleware) == 0 {
		return h
	}
	for i := len(middleware) - 1; i >= 0; i-- {
		h = middleware[i](h)
	}
	return h
}
