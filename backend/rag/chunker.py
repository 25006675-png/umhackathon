# Document Chunker
#
# Processes raw veterinary documents (PDFs, text) into retrieval-friendly chunks.
# - Extracts text from PDFs
# - Splits into chunks (~200-500 tokens each)
# - Preserves source metadata (document name, section, page number) for citations

import PyPDF2
import tiktoken
import json
import os

# Initialize tokenizer to count tokens accurately
tokenizer = tiktoken.get_encoding("cl100k_base")

def count_tokens(text):
    return len(tokenizer.encode(text))

def process_and_chunk_pdf(file_path, source_name, output_file):
    all_chunks = []
    
    # Step 7: Extract raw text from the PDF
    with open(file_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        
        for page_num, page in enumerate(reader.pages):
            raw_text = page.extract_text()
            if not raw_text:
                continue

            # Step 8: Clean the extracted text
            clean_text = " ".join(raw_text.split())
            words = clean_text.split()
            
            current_chunk = []
            current_token_count = 0
            
            # Step 9: Chunk into 200-500 token segments
            for word in words:
                word_tokens = count_tokens(word + " ")
                
                # Cap the chunk before it exceeds 500 tokens
                if current_token_count + word_tokens > 450: 
                    chunk_text = " ".join(current_chunk)
                    
                    # Steps 10 & 11: Add citation labels (source, section, page)
                    formatted_chunk = {
                        "text": chunk_text,
                        "metadata": {
                            "source": source_name,
                            "section": f"Page {page_num + 1}", 
                            "page_number": page_num + 1
                        },
                        "cited_text": f"[Source: {source_name}, Section: Page {page_num + 1}] {chunk_text}"
                    }
                    all_chunks.append(formatted_chunk)
                    
                    # Reset for the next chunk
                    current_chunk = [word]
                    current_token_count = word_tokens
                else:
                    current_chunk.append(word)
                    current_token_count += word_tokens

            # Grab the remaining text if it meets the minimum 200 token threshold
            if current_chunk and current_token_count >= 200: 
                chunk_text = " ".join(current_chunk)
                formatted_chunk = {
                    "text": chunk_text,
                    "metadata": {
                        "source": source_name,
                        "section": f"Page {page_num + 1}",
                        "page_number": page_num + 1
                    },
                    "cited_text": f"[Source: {source_name}, Section: Page {page_num + 1}] {chunk_text}"
                }
                all_chunks.append(formatted_chunk)

    # Save the processed chunks to a JSON file for the embedding step
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=4)
        
    print(f"✅ Processed {source_name}: Generated {len(all_chunks)} chunks.")

# --- RUN THE SCRIPT ---
if __name__ == "__main__":
    print("Starting to chunk all PDFs...")

    # 1. WOAH - Newcastle Disease
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/3.03.14_NEWCASTLE_DIS.pdf", 
        source_name="WOAH Terrestrial Manual: Newcastle Disease", 
        output_file="backend/rag/knowledge_base/newcastle_chunks.json"
    )
    
    # 2. WOAH - Gumboro Disease
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/3.03.12_IBD.pdf", 
        source_name="WOAH Terrestrial Manual: Gumboro Disease (IBD)", 
        output_file="backend/rag/knowledge_base/gumboro_chunks.json"
    )

    # 3. WOAH - Infectious Bronchitis
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/3.03.02_AIB.pdf", 
        source_name="WOAH Terrestrial Manual: Avian Infectious Bronchitis", 
        output_file="backend/rag/knowledge_base/bronchitis_chunks.json"
    )

    # 4. WOAH - Avian Influenza (HPAI)
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/hpai-report-69.pdf", 
        source_name="WOAH: High Pathogenicity Avian Influenza Report", 
        output_file="backend/rag/knowledge_base/hpai_chunks.json"
    )

    # 5. DVS - Broiler Farming Guide
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/BUKU_PANDUAN_PENTERNAKAN_AYAM_PEDAGING_JILID_KE_4_2025.pdf", 
        source_name="DVS Malaysia: Broiler Farming Guide 2025", 
        output_file="backend/rag/knowledge_base/dvs_broiler_chunks.json"
    )

    # 6. DVS - VRI Sample Submission
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/VRI_GUIDELINE_FOR_SAMPLE_SUBMISSION_-_updated_27012026.pdf", 
        source_name="DVS Malaysia: VRI Sample Submission Guidelines", 
        output_file="backend/rag/knowledge_base/dvs_vri_chunks.json"
    )

    # 7. MARDI - Broiler Viability
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/ETMR Norzalila.pdf", 
        source_name="MARDI: Viability of Broiler Production in Closed House", 
        output_file="backend/rag/knowledge_base/mardi_viability_chunks.json"
    )

    # 8. MARDI - Benchmarking
    process_and_chunk_pdf(
        file_path="backend/rag/knowledge_base/Vol10b (2).pdf", 
        source_name="MARDI: Benchmarking of Broiler Production Technology", 
        output_file="backend/rag/knowledge_base/mardi_benchmarking_chunks.json"
    )

    print("All done! JSON files generated successfully.")