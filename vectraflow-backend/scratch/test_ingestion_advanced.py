from app.rag.chunking.long_document_splitter import LongDocumentSplitter
from app.rag.chunking.table_aware_chunker import TableAwareChunker
from app.rag.parsing.base_parser import ParsedBlock

def test():
    print("--- Testing LongDocumentSplitter ---")
    blocks = [
        ParsedBlock("text", "word " * 20000, 1, ["H1"]), # ~20k tokens
        ParsedBlock("text", "word " * 40000, 2, ["H1"]), # ~40k tokens
        ParsedBlock("text", "word " * 10000, 3, ["H2"])  # ~10k tokens
    ]
    # Total tokens = 70,000. Limit = 50,000. Should split into 2 sections.
    splitter = LongDocumentSplitter(section_token_limit=50000)
    sections = splitter.split(blocks)
    print(f"Sections generated: {len(sections)}")
    for i, sec in enumerate(sections):
        print(f" Section {i}: {len(sec.blocks)} blocks, {sec.total_tokens} tokens")
        
    print("\n--- Testing TableAwareChunker ---")
    table_text = "Col A | Col B\n--|--\n"
    for i in range(10):
        table_text += f"Val A{i} | Val B{i}\n"
        
    table_block = ParsedBlock("table", table_text, 1, ["Table"])
    chunker = TableAwareChunker(max_tokens=20) # tiny limit to force split
    chunks = chunker.chunk_table(table_block)
    
    print(f"Table chunks generated: {len(chunks)}")
    for i, c in enumerate(chunks):
        print(f" Chunk {i}:")
        print(c.text)
        print("-" * 20)

if __name__ == "__main__":
    test()
