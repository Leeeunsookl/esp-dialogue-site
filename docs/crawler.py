import requests
from bs4 import BeautifulSoup
import json
import sqlite3
from datetime import datetime
import os

# 저장 경로
JSON_PATH = "docs/memory.json"
SQLITE_PATH = "docs/memory.sqlite"

# 수집할 소스 (위키, 커뮤니티, 뉴스 등)
SOURCES = [
    "https://news.ycombinator.com/",
    "https://en.wikipedia.org/wiki/Special:Random",
    "https://www.reddit.com/r/artificial/",
    "https://www.bbc.com/news",
    "https://techcrunch.com/"
]

def fetch_sentences(url):
    try:
        headers = {"User-Agent": "ESP-Collector/1.0"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code != 200:
            return []
        soup = BeautifulSoup(res.text, "html.parser")
        texts = [t.get_text(" ", strip=True) for t in soup.find_all(["p", "h1", "h2", "li"])]
        return [t for t in texts if 20 < len(t) < 300]  # 문장 길이 제한
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

def save_json(data):
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def save_sqlite(data):
    os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT,
            source TEXT,
            collected_at TEXT
        )
    """)
    for d in data:
        cur.execute("INSERT INTO memory (sentence, source, collected_at) VALUES (?, ?, ?)",
                    (d["sentence"], d["source"], d["collected_at"]))
    conn.commit()
    conn.close()

def main():
    collected = []
    now = datetime.utcnow().isoformat()
    for url in SOURCES:
        sentences = fetch_sentences(url)
        for s in sentences:
            collected.append({
                "sentence": s,
                "source": url,
                "collected_at": now
            })

    if collected:
        save_json(collected)
        save_sqlite(collected)
        print(f"Collected {len(collected)} sentences.")
    else:
        print("No new sentences collected.")

if __name__ == "__main__":
    main()
