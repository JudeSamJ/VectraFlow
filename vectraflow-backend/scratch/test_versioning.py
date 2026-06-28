import asyncio
import uuid
from app.api.v1.document_versions import mock_db, DocumentVersion, restore_version
from datetime import datetime

async def test():
    doc_id = uuid.uuid4()
    mock_db[str(doc_id)] = [
        DocumentVersion(
            id=uuid.uuid4(),
            document_id=doc_id,
            version_number=1,
            content_hash="hash1",
            storage_path="minio/1.pdf",
            chunk_ids=[uuid.uuid4(), uuid.uuid4()],
            created_at=datetime.utcnow()
        )
    ]
    
    print("--- Testing Version Restore ---")
    resp = await restore_version(doc_id, 1)
    print("Restore Response:", resp)
    
if __name__ == "__main__":
    asyncio.run(test())
