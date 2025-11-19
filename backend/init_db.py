"""
Database Initialization Script
Creates all tables defined in SQLAlchemy models
"""
import asyncio
from models.database import Base, engine

async def init_db():
    """Create all database tables"""
    async with engine.begin() as conn:
        # Drop all tables (use with caution!)
        # await conn.run_sync(Base.metadata.drop_all)
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
