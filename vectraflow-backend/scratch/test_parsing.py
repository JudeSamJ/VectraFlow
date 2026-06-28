import asyncio
from app.rag.parsing.parser_factory import ParserFactory

async def test():
    # Test HTML parsing logic
    html_content = b"""
    <html>
        <body>
            <h1>Main Title</h1>
            <p>Some paragraph under main title.</p>
            <h2>Sub section</h2>
            <p>Details in sub section.</p>
        </body>
    </html>
    """
    parser = ParserFactory.get_parser("text/html", "test.html")
    blocks = await parser.parse(html_content, {"filename": "test.html"})
    for b in blocks:
        print(f"[{b.block_type}] Path: {b.heading_path} -> {b.text}")

if __name__ == "__main__":
    asyncio.run(test())
