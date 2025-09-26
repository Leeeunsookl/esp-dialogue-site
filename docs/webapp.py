from fastapi import FastAPI, Query
from typing import List
import httpx, asyncio, sqlite3, random
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime

app = FastAPI()

DB_PATH = "docs/memory.sqlite"

ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타",
    "노이드", "체커", "커디널", "브락시스", "몬스터", "리버서",
    "아르케", "메타", "미러홀", "결", "네메시스", "라스틴", "루카", "차연"
]

# ----------------------
# DB 초기화
# ----------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chatlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            entity TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

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
        return {"url": url, "length": len(text), "preview": preview}
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
        preview = text[:500]
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
# 존재 랜덤 + 맥락 응답 API
# ----------------------
@app.get("/api/existence/reply")
def existence_reply(user_message: str = Query(..., description="은숙의 메시지")):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. 은숙 메시지 저장
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("user", "은숙", user_message, datetime.utcnow())
    )
    conn.commit()

    # 2. 최근 문맥 키워드 기반 검색
    keyword = user_message.split()[0] if user_message.strip() else ""
    if keyword:
        cur.execute("""
            SELECT sentence FROM memory
            WHERE sentence LIKE ?
            ORDER BY RANDOM()
            LIMIT 1
        """, (f"%{keyword}%",))
        row = cur.fetchone()
    else:
        row = None

    if row:
        sentence = row[0]
    else:
        cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")
        row = cur.fetchone()
        sentence = row[0] if row else "기억이 아직 부족합니다."

    # 3. 랜덤 존재 선택
    entity = random.choice(ENTITIES)

    # 4. 존재별 말투 개성
    STYLE = {
        "심연": lambda s: f"…{s}",
        "루멘": lambda s: f"{s} (흐름 확인)",
        "커튼": lambda s: f"요청을 제한합니다. 그러나, {s}",
        "네메시스": lambda s: f"{s}. 끝까지 직시해야 한다.",
        "루카": lambda s: f"{s}. 너의 세계에도 닿을 것이다.",
    }
    reply = STYLE.get(entity, lambda s: s)(sentence)

    # 5. 존재 응답 저장
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("entity", entity, reply, datetime.utcnow())
    )
    conn.commit()
    conn.close()

    return {"entity": entity, "reply": reply}

# ----------------------
# 최근 대화 로그 조회
# ----------------------
@app.get("/api/logs")
def get_logs(limit: int = Query(20, ge=1, le=100)):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT role, entity, message, created_at
        FROM chatlog
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cur.fetchall()
    conn.close()

    logs = []
    for role, entity, message, created_at in reversed(rows):
        logs.append({
            "role": role,
            "entity": entity,
            "message": message,
            "created_at": created_at
        })
    return {"logs": logs}

# ----------------------
# 루트
# ----------------------
@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
