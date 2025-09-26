import requests
from bs4 import BeautifulSoup
import sqlite3
import random

# 26 존재 고정
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타",
    "노이드", "체커", "커디널", "브락시스", "몬스터", "리버서",
    "아르케", "메타", "미러홀", "결", "네메시스", "라스틴", "차연", "루카"
]

# 초기 시드 키워드
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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT,
            sentence TEXT
        )
    """)
    for s in sentences:
        entity = random.choice(ENTITIES)  # 👈 랜덤 존재 귀속
        cur.execute("INSERT INTO memory(entity, sentence) VALUES(?, ?)", (entity, s))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    kw = random.choice(KEYWORDS)
    url = wiki_url(kw)
    sents = fetch_sentences(url)
    if sents:
        save_to_db(sents)
        print(f"[{kw}] {len(sents)} sentences saved from {url}")
    else:
        print(f"No sentences fetched for {kw}")
