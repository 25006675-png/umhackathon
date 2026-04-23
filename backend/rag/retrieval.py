# Vector Search Retrieval
#
# Given a query (symptom pattern / signal combination), retrieves
# the top-K most relevant knowledge base chunks with source metadata.
#
# Output format per chunk:
#   {
#     "text": "chunk content...",
#     "source": "DVS Respiratory Disease Guidelines",
#     "section": "Section 4.2",
#     "page": 12,
#     "relevance_score": 0.87
#   }
#
# Used by glm/prompts/hypothesis.py to ground disease diagnoses.
