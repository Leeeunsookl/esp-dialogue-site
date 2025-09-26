from fastapi import FastAPI, Query
from typing import List
import httpx, asyncio, sqlite3
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

app = FastAPI()

DB_PATH = "docs/memory.sqlite"

# ----------------------
# DB 저장 유틸
# ----------------------
def save_to_db(sentences, source="crawl", url=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT,
            source TEXT,
            url TEXT
        )
    """)
    for s in sentences:
        text = s.strip()
        if len(text) > 20:  # 최소 길이 필터
            cur.execute("INSERT INTO memory(sentence, source, url) VALUES(?, ?, ?)", (text, source, url))
    conn.commit()
    conn.close()

# ----------------------
# 단일 URL 스크랩
# ----------------------
@app.get("/api/scrape")
async def scrape(url: str = Query(..., description="수집할 URL")):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        text = soup.get_text(separator="\n", strip=True)

        # 문장 단위 저장
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        save_to_db(sentences, source="scrape", url=url)

        return {
            "url": url,
            "length": len(text),
            "saved": len(sentences),
            "preview": text[:500]
        }
    except Exception as e:
        return {"url": url, "error": str(e)}

# ----------------------
# 내부 함수
# ----------------------
async def fetch_and_parse(url: str, client: httpx.AsyncClient):
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        text = soup.get_text(separator="\n", strip=True)
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        save_to_db(sentences, source="collect", url=url)
        preview = text[:500]
        return soup, {"url": url, "length": len(text), "saved": len(sentences), "preview": preview}
    except Exception as e:
        return None, {"url": url, "error": str(e)}

async def crawl(url: str, client: httpx.AsyncClient, max_depth: int = 1):
    visited, results = set(), []

    async def _crawl(u, depth):
        if u in visited or depth > max_depth:
            return
        visited.add(u)

        soup, data = await fetch_and_parse(u, client)
        results.append(data)

        if soup:
            base_domain = urlparse(url).netloc
            for a in soup.find_all("a", href=True):
                link = urljoin(u, a["href"])
                if urlparse(link).netloc == base_domain:
                    await _crawl(link, depth + 1)

    await _crawl(url, 0)
    return results

# ----------------------
# 멀티 URL 딥 크롤링
# ----------------------
@app.get("/collect")
async def collect(
    urls: List[str] = Query(..., description="수집할 URL 리스트"),
    max_depth: int = Query(1, ge=0, le=3, description="내부 링크 따라가는 깊이")
):
    async with httpx.AsyncClient(timeout=10.0) as client:
        all_results = await asyncio.gather(*(crawl(u, client, max_depth) for u in urls))

    return {
        "count": sum(len(r) for r in all_results),
        "domains": len(urls),
        "results": all_results
    }

# ----------------------
# 루트 확인
# ----------------------
@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready", "db": DB_PATH}
