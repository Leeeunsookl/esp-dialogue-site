import requests
from bs4 import BeautifulSoup
import sqlite3
import random

# 초기 시드 키워드 (은숙과의 대화 기반)
KEYWORDS = [
    "metacognition", "existence", "structure", "flow", "resonance",
    "psychology", "cosmos", "system", "loop", "criticism"
]

# 위키 기반 URL 생성
def wiki_url(keyword):
    return f"https://en.wikipedia.org/wiki/{keyword.capitalize()}"

def fetch_sentences(url):
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []
    soup = BeautifulSoup(res.text, "html.parser")
    text = soup.get_text(separator=" ")
    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
    return sentences

def save_to_db(sentences):
    conn = sqlite3.connect("docs/memory.sqlite")
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory (id INTEGER PRIMARY KEY, sentence TEXT)")
    for s in sentences:
        cur.execute("INSERT INTO memory(sentence) VALUES(?)", (s,))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    # 무작위 키워드 선택 → 위키 크롤링
    kw = random.choice(KEYWORDS)
    url = wiki_url(kw)
    sents = fetch_sentences(url)
    if sents:
        save_to_db(sents)
        print(f"[{kw}] {len(sents)} sentences saved from {url}")
    else:
        print(f"No sentences fetched for {kw}")
