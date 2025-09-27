import requests, sqlite3, random, os
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

def save_to_db(sentences):
    # docs 폴더 없으면 자동 생성
    os.makedirs("docs", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    for s in sentences:
        cur.execute("INSERT INTO memory(sentence) VALUES(?)", (s,))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    kw = random.choice(KEYWORDS)
    url = wiki_url(kw)
    sents = fetch_sentences(url)
    if sents:
        save_to_db(sents)
        print(f"[{kw}] {len(sents)} sentences saved")
    else:
        print("No sentences fetched")
