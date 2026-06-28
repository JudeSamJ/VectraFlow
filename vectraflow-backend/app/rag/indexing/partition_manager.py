import structlog
from pymilvus import Collection, Partition, utility
from app.milvus_client import get_milvus_alias
import uuid

logger = structlog.get_logger(__name__)

class PartitionManager:
    """
    Manages Milvus partitions for tenant isolation within a single collection.
    """
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        
    def ensure_partition(self, tenant_id: uuid.UUID) -> str:
        """
        Creates a partition for the tenant if it doesn't exist.
        Returns the partition name.
        """
        alias = get_milvus_alias()
        collection = Collection(self.collection_name, using=alias)
        partition_name = f"tenant_{str(tenant_id).replace('-', '_')}"
        
        if not collection.has_partition(partition_name):
            collection.create_partition(partition_name)
            logger.info("partition_created", collection=self.collection_name, partition=partition_name)
            
        return partition_name
        
    def drop_partition(self, tenant_id: uuid.UUID) -> None:
        """
        Drops a tenant's partition, deleting all their vectors.
        """
        alias = get_milvus_alias()
        collection = Collection(self.collection_name, using=alias)
        partition_name = f"tenant_{str(tenant_id).replace('-', '_')}"
        
        if collection.has_partition(partition_name):
            collection.drop_partition(partition_name)
            logger.info("partition_dropped", collection=self.collection_name, partition=partition_name)
