"""
Database Initialization Script
Creates all tables defined in SQLAlchemy models and init.sql
"""
import asyncio
import os
from pathlib import Path
from sqlalchemy import text
from models.database import Base, engine
from dotenv import load_dotenv

load_dotenv()

async def init_db():
    """Initialize database schema and seed data"""
    print("Initializing database...")
    
    # TRANSACTION 1: Create SQLAlchemy tables
    # This runs separately so it won't rollback if init.sql fails
    async with engine.begin() as conn:
        print("Creating SQLAlchemy tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("SQLAlchemy tables created successfully")
    
    # TRANSACTION 2: Schema Migrations (SaaS)
    # Add organization_id to monitors if missing
    async with engine.begin() as conn:
        print("Checking for schema migrations...")
        try:
            await conn.execute(text("ALTER TABLE monitors ADD COLUMN IF NOT EXISTS organization_id VARCHAR REFERENCES organizations(id);"))
            print("Migration: Added organization_id to monitors table")
        except Exception as e:
            print(f"Migration warning (monitors): {e}")

    # TRANSACTION 3: Create Connectors table (SaaS Phase 2)
    async with engine.begin() as conn:
        print("Checking for connectors table...")
        try:
            # We rely on Base.metadata.create_all in Transaction 1 for new installs
            # But for existing installs, we might need to create it explicitly if create_all skips existing DBs
            # However, create_all checks for table existence, so it should be fine.
            # Just in case, we can force a check or specific column add if we modify it later.
            pass 
        except Exception as e:
            print(f"Migration warning (connectors): {e}")

    # TRANSACTION 4: Execute init.sql (seed data and additional setup)
    # If this fails, at least the tables from Transaction 1 are preserved
    try:
        async with engine.begin() as conn:
            print("Executing init.sql...")
            init_sql_path = Path(__file__).parent / "init.sql"
            
            if init_sql_path.exists():
                with open(init_sql_path, 'r') as f:
                    sql_content = f.read()
                
                # Split by semicolons and execute each statement separately
                # This prevents one error from rolling back everything
                statements = [s.strip() for s in sql_content.split(';') if s.strip()]
                
                for i, statement in enumerate(statements):
                    if statement and not statement.startswith('--'):
                        try:
                            await conn.execute(text(statement))
                        except Exception as e:
                            print(f"Warning executing statement {i+1}: {e}")
                            # Continue with next statement instead of failing completely
                            continue
                
                print("init.sql executed (with warnings for unsupported features)")
            else:
                print("Warning: init.sql not found, skipping seed data")
    except Exception as e:
        print(f"Warning: init.sql execution had errors: {e}")
        print("Tables are still created, continuing...")
    
    # TRANSACTION 4: Ensure chat_history table exists (fallback)
    async with engine.begin() as conn:
        print("Ensuring chat_history table exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR,
                session_id VARCHAR,
                query VARCHAR,
                response VARCHAR,
                timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
                tenant_id VARCHAR
            );
        """))
        
        # Attempt to add session_id column if it doesn't exist (for migration)
        try:
            await conn.execute(text("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id VARCHAR;"))
        except Exception as e:
            print(f"Note: Could not alter table (might already exist): {e}")
            
        print("chat_history table check completed")

    print("Database initialization completed!")

if __name__ == "__main__":
    asyncio.run(init_db())
