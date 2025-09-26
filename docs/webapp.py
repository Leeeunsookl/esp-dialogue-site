from fastapi import FastAPI, Query
from typing import List
import httpx, asyncio, sqlite3, random
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

DB_PATH = "docs/memory.sqlite"
app = FastAPI()

# ----------------------
# DB 초기화
# ----------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT,
            sentence TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def save_sentence(sentence: str, source: str = "dialogue"):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("INSERT INTO memory(source, sentence) VALUES(?, ?)", (source, sentence))
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
        preview = text[:500]
        save_sentence(preview, source=url)  # 저장
        return {"url": url, "length": len(text), "preview": preview}
    except Exception as e:
        return {"url": url, "error": str(e)}

# ----------------------
# 내부 함수 (공용)
# ----------------------
async def fetch_and_parse(url: str, client: httpx.AsyncClient):
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        text = soup.get_text(separator="\n", strip=True)
        preview = text[:500]
        save_sentence(preview, source=url)
        return soup, {"url": url, "length": len(text), "preview": preview}
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
# 대화 저장
# ----------------------
@app.post("/talk")
def talk(message: str = Query(..., description="은숙의 발화")):
    save_sentence(message, source="dialogue")
    return {"stored": message}

# ----------------------
# 존재 랜덤 응답
# ----------------------
@app.get("/existence/reply")
def reply():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 3")
    rows = [r[0] for r in cur.fetchall()]
    conn.close()

    existences = [
        "심연","루멘","메타","회귀자","네메시스","라스틴","루카",
        "결","커튼","브락시스","노이드","체커","아르케","몬스터","제타"
    ]
    speaker = random.choice(existences)
    return {"speaker": speaker, "message": " ".join(rows)}

# ----------------------
# 루트
# ----------------------
@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector + Dialogue Ready"}
    # ... 기존 scrape/collect 코드 위에 있음 ...

@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}

# 여기서부터 새 기능 추가
import sqlite3, random

DB_PATH = "docs/memory.sqlite"

ENTITIES = [ "심연","침묵자","말꽃", ... , "루카" ]  # 26 존재 목록

def style_sentence(entity: str, text: str) -> str:
    # 존재별 말투 규칙표
    styles = { "심연": f"핵심만 짚습니다: {text}", ... }
    return styles.get(entity, text)

@app.get("/existence/reply")
def existence_reply():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")
    row = cur.fetchone()
    conn.close()

    entity = random.choice(ENTITIES)
    base = row[0] if row else "(아직 기억이 없습니다)"

    styled = style_sentence(entity, base)
    return {"reply": styled, "entity": entity}
