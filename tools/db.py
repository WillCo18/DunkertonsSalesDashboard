"""
Database connection helpers for Supabase.
"""
from typing import Any, Optional
from supabase import create_client, Client
from config import config


class Database:
    """Supabase database client wrapper."""

    _client: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client."""
        if cls._client is None:
            if not config.validate():
                raise RuntimeError("Invalid configuration")

            cls._client = create_client(
                config.SUPABASE_URL, config.get_supabase_key()
            )
        return cls._client

    @classmethod
    def query(cls, table: str) -> Any:
        """Get query builder for a table."""
        return cls.get_client().table(table)

    @classmethod
    def insert(cls, table: str, data: dict | list[dict]) -> Any:
        """Insert data into a table."""
        return cls.query(table).insert(data).execute()

    @classmethod
    def upsert(cls, table: str, data: dict | list[dict], on_conflict: str = "") -> Any:
        """Upsert data into a table."""
        if on_conflict:
            return cls.query(table).upsert(data, on_conflict=on_conflict).execute()
        return cls.query(table).upsert(data).execute()

    @classmethod
    def select(
        cls, table: str, columns: str = "*", filters: Optional[dict] = None
    ) -> list[dict]:
        """Select data from a table."""
        query = cls.query(table).select(columns)

        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)

        result = query.execute()
        return result.data if result.data else []

    @classmethod
    def update(cls, table: str, data: dict, filters: dict) -> Any:
        """Update data in a table."""
        query = cls.query(table).update(data)

        for key, value in filters.items():
            query = query.eq(key, value)

        return query.execute()

    @classmethod
    def rpc(cls, function_name: str, params: Optional[dict] = None) -> Any:
        """Call a Postgres function."""
        return cls.get_client().rpc(function_name, params or {}).execute()


# Convenience functions
def get_client() -> Client:
    """Get Supabase client."""
    return Database.get_client()


def insert(table: str, data: dict | list[dict]) -> Any:
    """Insert data into a table."""
    return Database.insert(table, data)


def upsert(table: str, data: dict | list[dict], on_conflict: str = "") -> Any:
    """Upsert data into a table."""
    return Database.upsert(table, data, on_conflict)


def select(table: str, columns: str = "*", filters: Optional[dict] = None) -> list[dict]:
    """Select data from a table."""
    return Database.select(table, columns, filters)


def update(table: str, data: dict, filters: dict) -> Any:
    """Update data in a table."""
    return Database.update(table, data, filters)


def load_internal_products() -> list[dict]:
    """Load all internal products for matching."""
    return select("dim_product_internal", "*", {"is_active": True})


def load_product_mappings() -> dict[str, dict]:
    """Load existing product mappings as a lookup dict."""
    mappings = select("map_product_source_to_internal")
    return {m["source_sku"]: m for m in mappings}


def get_max_report_month() -> Optional[str]:
    """Get the most recent report month in the database."""
    result = (
        Database.query("fact_shipments")
        .select("report_month")
        .order("report_month", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["report_month"]
    return None
