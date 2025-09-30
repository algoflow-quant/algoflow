import os 

def get_database_url() -> str:
    """Get the database url from env variable"""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set, please set it in docker-compose")
    return db_url
