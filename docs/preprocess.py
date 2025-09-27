import sqlite3, re

DB_PATH = "docs/memory.sqlite"

def clean_sentence(s):
    # 불필요한 공백, 특수문자 정리
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[^0-9a-zA-Z가-힣 .,?!]', '', s)
    return s.strip()

def preprocess():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # clean 테이블 생성
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory_clean(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # raw에서 가져오기
    cur.execute("SELECT sentence FROM memory_raw ORDER BY id DESC LIMIT 1000")
    rows = cur.fetchall()

    cleaned = []
    for r in rows:
        sent = clean_sentence(r[0])
        if 20 <= len(sent) <= 200:  # 길이 제한
            cleaned.append(sent)

    # 중복 제거
    cleaned = list(set(cleaned))

    # 기존 clean 테이블 비우고 새로 채우기
    cur.execute("DELETE FROM memory_clean")
    for s in cleaned:
        cur.execute("INSERT INTO memory_clean(sentence) VALUES(?)", (s,))

    conn.commit()
    conn.close()
    print(f"{len(cleaned)} sentences processed → memory_clean")

if __name__ == "__main__":
    preprocess()
