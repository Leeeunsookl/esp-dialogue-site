from http.server import BaseHTTPRequestHandler
import json
import random
import os
import re
import sqlite3
import logging
from urllib.parse import parse_qs, urlparse

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

REPO_JSON = os.path.join(os.path.dirname(__file__), "memory.json") 
TMP_DB = "/tmp/memory.sqlite"

ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타", "노이드", "체커",
    "커디널", "브락시스", "몬스터", "리버서", "아르케", "메타",
    "미러홀", "결", "네메시스", "라스틴", "루카", "차연"
]

TONE = { 
    "심연": ["딱 한마디로 말하면", "속을 훑어보면", "바닥까지 내려가 보면"],
    "침묵자": ["짧게만 말할게", "말 대신 느낌으로", "굳이 길게 안 할게"],
    "말꽃": ["말을 조금 예쁘게 하자면", "부드럽게 풀어 말하면", "가볍게 덧붙이면"],
    "루프블럭": ["여기서 끊고 보자", "한 번 멈추고 정리하면", "반복은 줄이고 핵심만"],
    "루프디텍터": ["비슷한 말이 돌아오니까", "같은 흐름이 겹치니까", "패턴이 반복되니까"],
    "루프회전자": ["각도를 바꿔 보면", "시선을 한 번 틀어보면", "방향을 살짝 비틀면"],
    "커튼": ["장면을 바꿔보면", "여기서 커튼 한 번 젖기면", "다른 면을 열어 보면"],
    "회귀자": ["다시 처음으로 돌아가 보면", "전으로 잠깐 돌아가면", "그 자리로 되짚어 보면"],
    "루멘": ["조금 밝히자면", "빛을 비춰보면", "뚜렷하게 정리하면"],
    "루엔": ["느슨하게 이어보면", "흐름을 이어서 말하면", "조화롭게 묶어보면"],
    "에코": ["네 말 되돌려보면", "메아리치듯 말하면", "다시 한번 확인하면"],
    "제타": ["속도 붙여 말하면", "바로 요점만 튀겨내면", "쓸데없는 건 빼고"],
    "노이드": ["수치를 떠나 감으로 말하면", "대략 짚어보면", "체크만 해보면"],
    "체커": ["하나씩 체크해보면", "빠진 거만 확인하면", "기본만 맞춰보면"],
    "커디널": ["기준을 세워 말하면", "방향만 잡아보면", "축을 잡고 이야기하면"],
    "브락시스": ["균형 맞추자면", "부딪히는 걸 섞어보면", "충돌을 조절하면"],
    "몬스터": ["경계를 치자면", "선 넘지 않게 말하면", "위험선만 표시하면"],
    "리버서": ["뒤집어 보면", "반대로 생각해보면", "정반대에서 보면"],
    "아르케": ["근본부터 보면", "기원으로 거슬러가면", "처음 뜻을 떠올리면"],
    "메타": ["방식 자체를 말하면", "내가 말하는 법을 말하면", "틀을 드러내면"],
    "미러홀": ["비춰보면", "거울처럼 돌려보면", "너와 나를 겹쳐보면"],
    "결": ["결만 살리면", "윤곽만 잡으면", "뼈대만 남기면"],
    "네메시스": ["불균형만 바로잡자면", "선만 지키면", "과한 건 덜어내면"],
    "라스틴": ["정리 끝내자면", "매듭만 지으면", "마무리하자면"],
    "루카": ["낯설어도 붙잡아보면", "처음이라도 감으로 가면", "처음 맛으로 말하면"],
    "차연": ["정리하면", "분석하자면", "짧게 구조만 말하면"],
}

FALLBACK_TONE = ["정리하면", "간단히 말하면", "요점만 잡으면"]

def ensure_db():
    if os.path.exists(TMP_DB):
        try:
            conn = sqlite3.connect(TMP_DB)
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM memory")
            count = cur.fetchone()[0]
            conn.close()
            if count > 0:
                return
        except:
            if os.path.exists(TMP_DB):
                os.remove(TMP_DB)

    conn = sqlite3.connect(TMP_DB)
    cur = conn.cursor()
    cur.execute("CREATE TABLE memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    
    sentences = []
    if os.path.exists(REPO_JSON):
        try:
            with open(REPO_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    sentences = [s.strip() for s in data if s and s.strip()]
        except:
            pass
    
    if not sentences:
        sentences = [
            "하나씩 정리하면 이해가 더 쉽다.", "잠깐 멈췄다가 다시 보면 다르게 보인다.",
            "핵심을 먼저 잡으면 나머지는 따라온다."
        ]
    
    cur.executemany("INSERT INTO memory(sentence) VALUES(?)", [(s,) for s in sentences])
    conn.commit()
    conn.close()

def fetch_sentences(limit=200):
    ensure_db()
    conn = sqlite3.connect(TMP_DB)
    cur = conn.cursor()
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT ?", (limit,))
    rows = [r[0].strip() for r in cur.fetchall() if r and r[0].strip()]
    conn.close()
    return rows

def tokenize(text):
    tokens = re.findall(r"[A-Za-z가-힣]{2,20}", text.lower())
    return [t for t in tokens if len(t) >= 2][:10]

def filter_memory_by_keywords(memory, kws):
    if not kws: return memory
    scored = []
    for s in memory:
        score = sum(1 for k in kws if k in s.lower())
        if score > 0: scored.append((score, s))
    if not scored: return memory
    scored.sort(key=lambda x: (-x[0], len(x[1])))
    return [s for _, s in scored[:100]]

def stitch(parts):
    connectors = [" 그리고 ", " 그래서 ", " 한마디로 ", " 결론은 ", " 다만 ", " 그러니까 "]
    out = []
    for i, p in enumerate(parts):
        if i == 0:
            out.append(p.rstrip(".,!…"))
        else:
            out.append((random.choice(connectors) + p.lstrip()).rstrip(".,!…"))
    txt = "".join(out)
    if not txt.endswith(("다", ".", "요", "함", "음", "임")):
        txt += "."
    return txt

def build_reply(user_message, entity):
    tone = TONE.get(entity, FALLBACK_TONE)
    lead = random.choice(tone)
    memory = fetch_sentences(limit=200)
    kws = tokenize(user_message)
    pool = filter_memory_by_keywords(memory, kws)
    
    if not pool:
        quote = user_message.strip()
        if len(quote) > 24: quote = quote[:24] + "…"
        return f"{lead} "{quote}" 기준으로 보면 지금은 적절한 문장이 없으니까, 솔직히 더 학습이 필요함."
    
    pick_n = random.choice([2, 3, 3, 4])
    picks = []
    for s in random.sample(pool, k=min(pick_n, len(pool))):
        if len(s) > 140:
            cut = re.split(r"[。.!?]", s)
            frag = cut[0] if cut and cut[0] else s[:140]
            picks.append(frag.strip())
        else:
            picks.append(s)
    
    quote = user_message.strip()
    if len(quote) > 24: quote = quote[:24] + "…"
    head = f"{lead} "{quote}" 기준으로 보면 "
    body = stitch(picks) if picks else "지금은 짧게 가자. 핵심만 잡자."
    return (head + body).strip()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if parsed.path == '/api/test':
            response = {"ok": True, "message": "API running"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        elif parsed.path == '/api/status':
            ensure_db()
            try:
                conn = sqlite3.connect(TMP_DB)
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM memory")
                cnt = cur.fetchone()[0]
                conn.close()
                response = {"ok": True, "sentences": cnt, "entities": ENTITIES}
            except Exception as e:
                response = {"ok": False, "error": str(e)}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        elif parsed.path == '/api/existence/reply':
            user_message = params.get('user_message', [''])[0]
            entity = params.get('entity', [None])[0]
            
            if not user_message:
                response = {"error": "user_message required"}
            else:
                chosen = entity if entity in ENTITIES else random.choice(ENTITIES)
                reply = build_reply(user_message, chosen)
                response = {
                    "entity": chosen,
                    "reply": reply + " (한국의 이은숙34세여성 연구결과)",
                    "user_message": user_message
                }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            response = {"error": "Not found"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
