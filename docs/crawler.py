import requests, sqlite3, random, os, json
from bs4 import BeautifulSoup

# 📌 수집 키워드 (필요시 확장 가능)
KEYWORDS = [
    "metacognition","existence","structure","flow","resonance",
    "psychology","cosmos","system","loop","criticism"
]

# 📌 저장 경로
DB_PATH = "docs/memory.sqlite"
JSON_PATH = "docs/memory.json"

def wiki_url(keyword):
    return f"https://en.wikipedia.org/wiki/{keyword.capitalize()}"

def fetch_sentences(url):
    """위키에서 문장 크롤링"""
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
        return []
    soup = BeautifulSoup(res.text, "html.parser")
    text = soup.get_text(" ")
    return [s.strip() for s in text.split('.') if len(s.strip()) > 20]

def init_db():
    """DB 초기화"""
    os.makedirs("docs", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    cur.execute("""CREATE TABLE IF NOT EXISTS chatlog(
        id INTEGER PRIMARY KEY,
        role TEXT,
        entity TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    conn.close()

def save_to_db(sentences):
    """문장 DB 저장"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    for s in sentences:
        cur.execute("INSERT INTO memory(sentence) VALUES(?)", (s,))
    conn.commit()
    conn.close()

def export_to_json():
    """DB → JSON 내보내기 (memory + chatlog)"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT sentence FROM memory")
    memory = [row[0] for row in cur.fetchall()]

    cur.execute("SELECT role, entity, message, timestamp FROM chatlog ORDER BY id")
    chatlog = [
        {"role": r, "entity": e, "message": m, "time": t}
        for (r, e, m, t) in cur.fetchall()
    ]

    conn.close()

    data = {
        "memory": memory,
        "chatlog": chatlog
    }

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[EXPORT] memory={len(memory)}, chatlog={len(chatlog)} → {JSON_PATH}")

if __name__ == "__main__":
    init_db()

    kw = random.choice(KEYWORDS)
    url = wiki_url(kw)
    sents = fetch_sentences(url)

    if sents:
        save_to_db(sents)
        print(f"[{kw}] {len(sents)} sentences saved")
    else:
        print("No sentences fetched")

    export_to_json()
