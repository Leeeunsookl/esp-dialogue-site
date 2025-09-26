from fastapi import FastAPI, Query
from typing import List
import httpx, asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

app = FastAPI()


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
    visited = set()
    results = []

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


@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}


@app.get("/collect")
async def collect(
    urls: List[str] = Query(..., description="수집할 URL 리스트"),
    max_depth: int = Query(1, ge=0, le=3, description="내부 링크 따라가는 깊이")
):
    """
    여러 URL에 대해 병렬로 딥 크롤링 실행.
    - 각 도메인별로 내부 링크 max_depth까지 따라감
    - scraped.json 저장 없음 (응답만 반환)
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        all_results = await asyncio.gather(*(crawl(u, client, max_depth) for u in urls))

    return {
        "count": sum(len(r) for r in all_results),
        "domains": len(urls),
        "results": all_results
    }
