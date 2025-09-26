import sqlite3

def get_sentences(keyword, limit=5):
    conn = sqlite3.connect("docs/memory.sqlite")
    cur = conn.cursor()
    cur.execute("SELECT sentence FROM memory WHERE sentence LIKE ? LIMIT ?", (f"%{keyword}%", limit))
    rows = cur.fetchall()
    conn.close()
    return [r[0] for r in rows]
