import requests, random, json
from bs4 import BeautifulSoup

# ✅ 수집할 사이트 (위키, 뉴스, 레딧류)
SOURCES = {
    "wiki": "https://en.wikipedia.org/wiki/Special:Random",
    "news": "https://news.ycombinator.com/",
    "reddit": "https://www.reddit.com/r/all/"
}

def fetch_sentences():
    collected = []
    headers={"User-Agent":"Mozilla/5.0"}
    for name, url in SOURCES.items():
        try:
            r=requests.get(url,headers=headers,timeout=10)
            if r.status_code==200:
                soup=BeautifulSoup(r.text,"html.parser")
                text=" ".join([p.get_text(" ",strip=True) for p in soup.find_all("p")])
                for sent in text.split("."):
                    sent=sent.strip()
                    if 20 < len(sent) < 200:
                        collected.append(f"[{name}] {sent}")
        except Exception as e:
            print("ERR",name,e)
    return collected

def save_to_json(data,path="docs/conversation.json"):
    try:
        old=[]
        try:
            with open(path,"r",encoding="utf-8") as f:
                old=json.load(f)
        except: pass
        merged=old+data
        with open(path,"w",encoding="utf-8") as f:
            json.dump(merged,f,ensure_ascii=False,indent=2)
    except Exception as e:
        print("SAVE ERR",e)

if __name__=="__main__":
    sents=fetch_sentences()
    save_to_json(sents)
