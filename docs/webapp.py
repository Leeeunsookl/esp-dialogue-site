from fastapi import FastAPI, Query
from typing import List
import httpx
import asyncio
from bs4 import BeautifulSoup
import json
from pathlib import Path

app = FastAPI()


@app.get("/")
def root():
    return {"status": "running", "message": "ESP 비LLM Collector Ready"}


async def fetch_url(url: str, client: httpx.AsyncClient):
    try:
        response = await client.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")
        text = soup.get_text(separator="\n", strip=True)
        preview = text[:500]
        return {"url": url, "length": len(text), "preview": preview}
    except Exception as e:
        return {"url": url, "error": str(e)}


@app.get("/api/scrape")
async def scrape(urls: List[str] = Query(..., description="수집할 URL 리스트")):
    """
    여러 URL을 병렬로 크롤링하여 JSON으로 반환합니다.
    - HTML → 텍스트 변환
    - 각 URL별 상위 500자 미리보기
    - scraped.json 파일로 저장
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        results = await asyncio.gather(*(fetch_url(url, client) for url in urls))

    # JSON 파일 저장
    out_path = Path("scraped.json")
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return {"count": len(results), "results": results}
