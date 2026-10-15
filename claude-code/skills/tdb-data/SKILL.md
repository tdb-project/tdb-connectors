---
name: tdb-data
description: Use when answering questions from data served by TDB (The Data-Bridge) through its MCP tools, such as query_source, schema_source or preview_source.
---

# Querying data through TDB

TDB serves registered data sources as governed, read-only SQL. Every call is
recorded in TDB's audit log.

- **Read-only.** TDB refuses any statement that writes, and refuses more than one
  statement per call. Don't try INSERT, UPDATE, DELETE or DDL.
- **Know the table before you query.**
  - On TDB Community, the one CSV source is always the table `data`.
  - On TDB Enterprise, call `schema_source` first for real table and column names,
    including the descriptions an operator added. Use `preview_source` for a few rows.
- **Check `truncated`.** A result says whether the row cap cut it off. When
  `truncated` is true you do not have every row: aggregate in SQL (`COUNT`, `SUM`,
  `GROUP BY`) or narrow the query rather than concluding from a partial result.
  Pass `limit` when you only need a few rows.
- **A refusal is final.** "not permitted for this API key" means the key's
  `allowed_tools` does not include that tool; don't retry it, use a tool that is
  permitted or tell the user. "Blocked keyword" means the SQL was read as a write.
- **Say where an answer came from.** Name the source and summarise the SQL you ran,
  so the user can find it in TDB's audit log.
