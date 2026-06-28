import tiktoken

class TokenCounter:
    def __init__(self, model_name: str = "cl100k_base"):
        try:
            self.encoder = tiktoken.get_encoding(model_name)
        except ValueError:
            self.encoder = tiktoken.get_encoding("cl100k_base")
            
    def count(self, text: str) -> int:
        return len(self.encoder.encode(text))
        
    def encode(self, text: str) -> list[int]:
        return self.encoder.encode(text)
        
    def decode(self, tokens: list[int]) -> str:
        return self.encoder.decode(tokens)

# Global singleton for chunkers
token_counter = TokenCounter()
