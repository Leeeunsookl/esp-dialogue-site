from fastapi import FastAPI, Query
from typing import List
import httpx, asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

app = FastAPI()


# ----------------------
# 단일 URL 스크랩 (기존)
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
# 내부 함수 (공용)
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


@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
