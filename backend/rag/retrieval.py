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
import chromadb

# 1. Connect to the local database you just built
db_path = "backend/rag/vector_db"
client = chromadb.PersistentClient(path=db_path)

# Load the collection
collection = client.get_collection(name="poultry_knowledge")

def search_knowledge_base(symptom_query, top_k=3):
    """
    Takes a symptom string, searches the database, and returns the top_k most relevant cited chunks.
    Zhuo Lin will call this function inside his GLM prompt orchestrator.
    """
    print(f"\n🔍 Searching Knowledge Base for: '{symptom_query}'")
    
    # 2. Search ChromaDB
    results = collection.query(
        query_texts=[symptom_query],
        n_results=top_k
    )
    
    # 3. Format the text perfectly so the GLM can read and cite it
    retrieved_chunks = results['documents'][0]
    
    formatted_context = "--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n\n"
    for i, text in enumerate(retrieved_chunks):
        formatted_context += f"{text}\n\n"
        
    return formatted_context

# --- TEST THE SEARCH ENGINE ---
if __name__ == "__main__":
    # Let's test it using the exact Day 2 scenario from your proposal!
    test_query = "Feed intake dropped 18%, mortality 3 birds, temperature 3C above baseline, ayam senyap sikit"
    
    # Run the search
    search_results = search_knowledge_base(test_query, top_k=3)
    
    # Print the results to the terminal
    print(search_results)
    print("✅ Retrieval Engine is working! Hand this function over to Person 2 (Zhuo Lin).")