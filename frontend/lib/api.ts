// API Client
//
// Functions for communicating with the FastAPI backend:
// - submitReading(data)       — POST /api/readings
// - getAnalysis(flockId)      — GET /api/analysis/{flockId}
// - getGLMAnalysis(flockId)   — POST /api/glm/analyse/{flockId}
// - getAlerts(flockId)        — GET /api/alerts/{flockId}
// - submitFeedback(data)      — POST /api/feedback
// - getComparison(flockId)    — GET /api/glm/compare/{flockId}
//
// Base URL configured via environment variable NEXT_PUBLIC_API_URL
