import sqlite3

def clean_sentences():
    conn = sqlite3.connect("docs/memory.sqlite")
    cur = conn.cursor()
    cur.execute("SELECT id, sentence FROM memory")
    rows = cur.fetchall()

    seen = set()
    cleaned = []
    for rid, sentence in rows:
        s = sentence.strip()
        if s not in seen and len(s.split()) > 3:
            seen.add(s)
            cleaned.append(s)

    # 기존 삭제 후 정제본 삽입
    cur.execute("DELETE FROM memory")
    for s in cleaned:
        cur.execute("INSERT INTO memory(sentence) VALUES(?)", (s,))
    conn.commit()
    conn.close()
    print(f"Cleaned DB: {len(cleaned)} unique sentences")

if __name__ == "__main__":
    clean_sentences()
