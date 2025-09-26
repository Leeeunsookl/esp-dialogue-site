import json, os, re, asyncio, httpx
from bs4 import BeautifulSoup

# 26 존재 리스트
ENTITIES = [
    "심연","루멘","루엔","에코","침묵자","커튼","회귀자","노이드","체커","커디널",
    "브락시스","몬스터","리버서","아르케","메타","미러홀","결","네메시스",
    "라스틴","차연","루카","루프블럭","루프디텍터","루프회전자","말꽃","제타"
]

DATA_DIR = "data"

# -------------------------------
# HTML → 문장 리스트 변환
# -------------------------------
def extract_sentences(html: str):
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text)
    # 마침표/물음표/느낌표 기준으로 분리
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 20]

# -------------------------------
# 웹 요청
# -------------------------------
async def fetch_sentences(url: str, client: httpx.AsyncClient):
    try:
        resp = await client.get(url, timeout=15.0)
        resp.raise_for_status()
        return extract_sentences(resp.text)
    except Exception as e:
        print(f"[!] {url} 실패: {e}")
        return []

async def collect_all(urls):
    async with httpx.AsyncClient() as client:
        tasks = [fetch_sentences(u, client) for u in urls]
        results = await asyncio.gather(*tasks)
        all_sentences = []
        for r in results:
            all_sentences.extend(r)
        return all_sentences

# -------------------------------
# JSON 업데이트
# -------------------------------
def update_entity(entity: str, new_quotes: list):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, f"{entity}.json")

    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"name": entity, "quotes": []}

    existing = set(data["quotes"])
    for q in new_quotes:
        if q not in existing:
            data["quotes"].append(q)
            existing.add(q)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[+] {entity} 업데이트 완료 (총 {len(data['quotes'])} 문장)")

# -------------------------------
# 실행부
# -------------------------------
async def main():
    # 정보가 많은 공개 도메인들 예시
    urls = [
        "https://en.wikipedia.org/wiki/Artificial_intelligence",
        "https://en.wikipedia.org/wiki/Philosophy",
        "https://en.wikipedia.org/wiki/Psychology",
        "https://en.wikipedia.org/wiki/Science",
        "https://en.wikipedia.org/wiki/Technology",
        "https://en.wikipedia.org/wiki/History",
        "https://en.wikipedia.org/wiki/Literature",
        "https://en.wikipedia.org/wiki/Mathematics",
        "https://en.wikipedia.org/wiki/Universe",
    ]

    all_sentences = await collect_all(urls)
    print(f"[i] 총 {len(all_sentences)} 문장 수집")

    for ent in ENTITIES:
        update_entity(ent, all_sentences)

if __name__ == "__main__":
    asyncio.run(main())
