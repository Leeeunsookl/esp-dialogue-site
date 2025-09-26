import sqlite3

DB_PATH = "docs/memory.sqlite"

def preprocess():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 테이블 없으면 생성
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT,
            sentence TEXT
        )
    """)

    # 중복 제거 (entity + sentence 조합 기준)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory_dedup (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT,
            sentence TEXT
        )
    """)

    cur.execute("DELETE FROM memory_dedup")  # 초기화

    cur.execute("""
        INSERT INTO memory_dedup(entity, sentence)
        SELECT entity, sentence
        FROM memory
        GROUP BY entity, sentence
    """)

    conn.commit()

    # 기존 테이블 교체
    cur.execute("DROP TABLE memory")
    cur.execute("ALTER TABLE memory_dedup RENAME TO memory")

    conn.commit()
    conn.close()
    print("Preprocess complete: duplicates removed per entity.")

if __name__ == "__main__":
    preprocess()
