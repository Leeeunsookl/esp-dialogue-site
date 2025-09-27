import requests, sqlite3, random, os
from bs4 import BeautifulSoup

# 크롤링 키워드
KEYWORDS = [
    "metacognition","existence","structure","flow","resonance",
    "psychology","cosmos","system","loop","criticism"
]

# DB 경로 (docs 안에 저장)
DB_PATH = "docs/memory.sqlite"

def wiki_url(keyword):
    return f"https://en.wikipedia.org/wiki/{keyword.capitalize()}"

def fetch_sentences(url):
    """URL에서 문장 크롤링"""
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"Error {url}: {e}")
        return []
    soup = BeautifulSoup(res.text, "html.parser")
    text = soup.get_text(" ")
    return [s.strip() for s in text.split('.') if len(s.strip()) > 20]

def save_to_db(sentences):
    """외부 문장 DB 저장"""
    os.makedirs("docs", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    for s in sentences:
        cur.execute("INSERT INTO memory(sentence) VALUES(?)", (s,))
    conn.commit()
    conn.close()

def save_chat_to_memory():
    """chatlog에서 대화 문장을 memory에 동기화"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS chatlog(id INTEGER PRIMARY KEY, role TEXT, entity TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")

    # 최근 대화 200개 가져오기
    cur.execute("SELECT message FROM chatlog ORDER BY id DESC LIMIT 200")
    rows = cur.fetchall()

    added = 0
    for (msg,) in rows:
        msg = msg.strip()
        if len(msg) > 10:  # 너무 짧은 건 제외
            cur.execute("INSERT INTO memory(sentence) VALUES(?)", (msg,))
            added += 1
    
    conn.commit()
    conn.close()
    print(f"{added}개의 대화 문장을 memory에 복사 완료")

if __name__ == "__main__":
    # 1. 외부 크롤링
    kw = random.choice(KEYWORDS)
    url = wiki_url(kw)
    sents = fetch_sentences(url)
    if sents:
        save_to_db(sents)
        print(f"[{kw}] {len(sents)} sentences saved")
    else:
        print("No sentences fetched")

    # 2. 내부 대화 동기화
    save_chat_to_memory()
