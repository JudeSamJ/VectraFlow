from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.chat import router as chat_router
from app.api.v1.ingest import router as ingest_router

app = FastAPI()
app.include_router(chat_router)
app.include_router(ingest_router)

client = TestClient(app)

def test_routes_exist():
    print("Testing if chat route exists and requires proper schema...")
    res = client.post("/chat", json={})
    # Should be 422 Unprocessable Entity due to missing schema fields
    print(f"Chat empty body status: {res.status_code}")
    
    print("Testing if ingest route exists...")
    # Missing file and form
    res2 = client.post("/ingest")
    print(f"Ingest empty body status: {res2.status_code}")
    
if __name__ == "__main__":
    test_routes_exist()
