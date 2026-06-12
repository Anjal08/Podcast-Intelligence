import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_helper = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_helper.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_helper.db = db_helper.client[settings.DB_NAME]
    logger.info("Connected to MongoDB successfully.")
    
    # Initialize indexes
    await init_db_indexes()

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_helper.client:
        db_helper.client.close()
    logger.info("MongoDB connection closed.")

async def init_db_indexes():
    """Create indexes for performance and constraints."""
    if db_helper.db is not None:
        try:
            # Ensure unique file_hash on podcasts collection
            await db_helper.db.podcasts.create_index("file_hash", unique=True)
            # Index on conversation podcast_id
            await db_helper.db.conversations.create_index("podcast_id")
            logger.info("MongoDB indexes created successfully.")
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")

def get_database():
    return db_helper.db
