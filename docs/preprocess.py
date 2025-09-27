import sqlite3, json, os

DB_PATH = "docs/memory.sqlite"
JSON_PATH = "docs/memory.json"

def export_json():
    if not os.path.exists(DB_PATH):
        print("DB not found")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    cur.execute("SELECT sentence FROM memory")
    rows = cur.fetchall()
    conn.close()

    sentences = [r[0] for r in rows if r[0].strip()]
    data = {"sentences": sentences}

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(sentences)} sentences → {JSON_PATH}")

if __name__ == "__main__":
    export_json()
