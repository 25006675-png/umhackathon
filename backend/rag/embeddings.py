# Document Embedding
#
# Embeds text chunks into vector representations for semantic search.
# Uses sentence-transformers or Z.AI embedding API.
# Stores vectors in FAISS or ChromaDB index.
import os
import json
import chromadb

def create_embeddings():
    print("Starting the embedding process...")
    
    # 1. Create a local folder to store the database
    db_path = "backend/rag/vector_db"
    
    # 2. Initialize ChromaDB client to save data directly to that folder
    client = chromadb.PersistentClient(path=db_path)
    
    # 3. Create a collection (think of it as a table in your database)
    collection = client.get_or_create_collection(name="poultry_knowledge")
    
    knowledge_base_dir = "backend/rag/knowledge_base"
    
    # 4. Loop through all the JSON files you just created
    for filename in os.listdir(knowledge_base_dir):
        if filename.endswith(".json"):
            file_path = os.path.join(knowledge_base_dir, filename)
            print(f"Embedding {filename}...")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                chunks = json.load(f)
            
            texts = []
            metadatas = []
            ids = []
            
            for i, chunk in enumerate(chunks):
                # We use the 'cited_text' so Zhuo Lin's GLM always gets the source
                texts.append(chunk["cited_text"])
                metadatas.append(chunk["metadata"])
                
                # Give every single chunk a unique ID
                ids.append(f"{filename}_chunk_{i}")
            
            # 5. Add them to the database! (Chroma automatically embeds the text here)
            if texts:
                collection.add(
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids
                )
                
    print(f"✅ All embeddings saved successfully in the '{db_path}' folder!")

# --- RUN THE SCRIPT ---
if __name__ == "__main__":
    create_embeddings()