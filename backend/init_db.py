"""
Database Initialization Script
Creates all tables defined in SQLAlchemy models and init.sql
"""
import asyncio
import os
from sqlalchemy import text
from models.database import Base, engine
from dotenv import load_dotenv

load_dotenv()

async def init_db():
    """Create all database tables"""
    print("Initializing database...")
    
    async with engine.begin() as conn:
        # 1. Create SQLAlchemy tables
        print("Creating SQLAlchemy tables...")
        await conn.run_sync(Base.metadata.create_all)
        
        # 2. Execute raw SQL from init.sql
        print("Executing init.sql...")
        current_dir = os.path.dirname(os.path.abspath(__file__))
        init_sql_path = os.path.join(current_dir, 'init.sql')
        
        if os.path.exists(init_sql_path):
            with open(init_sql_path, 'r') as f:
                sql_content = f.read()
                # Split by semicolon to execute statements individually
                # This is a simple split and might need refinement for complex SQL
                statements = sql_content.split(';')
                for statement in statements:
                    if statement.strip():
                        try:
                            await conn.execute(text(statement))
                        except Exception as e:
                            print(f"Warning executing statement: {e}")
        else:
            print("init.sql not found!")

    print("Database initialization completed!")

if __name__ == "__main__":
    asyncio.run(init_db())
