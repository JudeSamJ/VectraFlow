import os

files = [
    'app/rag/parsing/table_extractor.py',
    'app/rag/chunking/table_aware_chunker.py',
    'app/rag/parsing/image_captioner.py',
    'app/rag/parsing/image_ocr_parser.py',
    'scratch/test_ingestion_advanced.py'
]

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    content = content.replace('BlockType.TABLE', '"table"')
    content = content.replace('BlockType.TEXT', '"text"')
    content = content.replace('from app.rag.parsing.base_parser import ParsedBlock, BlockType', 'from app.rag.parsing.base_parser import ParsedBlock')
    with open(f, 'w') as file:
        file.write(content)
