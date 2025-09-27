import requests, sqlite3, os, random
from bs4 import BeautifulSoup

KEYWORDS = [
    "metacognition","existence","structure","flow","resonance",
    "psychology","cosmos","system","loop","criticism"
]

DB_PATH = "docs/memory.sqlite"

def wiki_url(keyword):
    return f"https://en.wikipedia.org/wiki/{keyword.capitalize()}"

def fetch_sentences(url):
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"Error {url}: {e}")
        return []
    soup = BeautifulSoup(res.text, "html.parser")
    text = soup.get_text(" ")
    return [s.strip() for s in text.split('.') if len(s.strip()) > 20]

def save_to_db(sentences, source):
    os.makedirs("docs", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # raw 테이블 생성
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory_raw(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT,
            source TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    for s in sentences:
        cur.execute("INSERT INTO memory_raw(sentence, source) VALUES(?, ?)", (s, source))

    # 오래된 데이터 자동 삭제 (최근 5000개 유지)
    cur.execute("DELETE FROM memory_raw WHERE id NOT IN (SELECT id FROM memory_raw ORDER BY id DESC LIMIT 5000)")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    kw = random.choice(KEYWORDS)
    url = wiki_url(kw)
    sents = fetch_sentences(url)
    if sents:
        save_to_db(sents, url)
        print(f"[{kw}] {len(sents)} sentences saved → memory_raw")
    else:
        print("No sentences fetched")
