import requests, json, random

SOURCES = {
    "reddit_ai": "https://www.reddit.com/r/ArtificialIntelligence.json",
    "wiki_ai": "https://en.wikipedia.org/api/rest_v1/page/summary/Artificial_intelligence",
}

def fetch_reddit(url):
    headers = {"User-Agent": "ESPCollector/1.0"}
    data = requests.get(url, headers=headers).json()
    posts = [p["data"]["title"] for p in data["data"]["children"]]
    return posts

def fetch_wiki(url):
    return [requests.get(url).json().get("extract", "")]

def collect_all():
    dataset = []
    for name,url in SOURCES.items():
        if "reddit" in name: dataset += fetch_reddit(url)
        elif "wiki" in name: dataset += fetch_wiki(url)
    return dataset

if __name__=="__main__":
    data = collect_all()
    with open("docs/memory.json","w",encoding="utf-8") as f:
        json.dump(data,f,ensure_ascii=False,indent=2)
    print(f"수집 {len(data)}개 완료 → docs/memory.json")
