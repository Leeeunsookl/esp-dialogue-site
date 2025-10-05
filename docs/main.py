from fastapi import FastAPI, Query
from typing import List, Optional
import sqlite3, random, os, re
import logging
import json 
import time # 디버깅 및 시작 시간 확인을 위해 추가

# 로그 설정은 유지
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# -------------------------- 경로 및 고정 값 --------------------------
# Vercel 빌드 환경에서 소스 파일 경로를 기준으로 memory.json을 찾음.
REPO_JSON = os.path.join(os.path.dirname(__file__), "memory.json") 
# 서버리스 런타임 환경에서 파일을 저장할 유일한 안전한 경로.
TMP_DB  = "/tmp/memory.sqlite"                                   
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타", "노이드", "체커",
    "커디널", "브락시스", "몬스터", "리버서", "아르케", "메타",
    "미러홀", "결", "네메시스", "라스틴", "루카", "차연"
]
# TONE 딕셔너리 내용은 유지
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

# -------------------------- 유틸리티 함수 --------------------------

# 전역 변수로 SQLite 연결 및 커서 유지 (쓰기 작업이 없으므로 안전함)
# 하지만 Vercel 환경에서 안전을 위해 요청 시마다 연결하는 방식을 유지합니다.
DB_SENTENCE_COUNT = 0

def ensure_db():
    """memory.json을 읽어 /tmp에 memory.sqlite DB를 생성."""
    global DB_SENTENCE_COUNT
    start_time = time.time()
    
    # 1. /tmp에 이미 DB가 있고, 데이터가 있다면 건너뛰기
    # DB 파일 존재 여부만으로 콜드 스타트 시 DB 재생성 여부를 판단합니다.
    if os.path.exists(TMP_DB):
        try:
            conn = sqlite3.connect(TMP_DB)
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM memory")
            count = cur.fetchone()[0]
            conn.close()
            if count > 0:
                DB_SENTENCE_COUNT = count
                logger.info(f"DB exists with {count} sentences. Startup time: {time.time() - start_time:.4f}s")
                return
        except Exception as e:
            # DB 파일이 손상되었거나 테이블이 없는 경우, 새로 생성하도록 이어갑니다.
            logger.warning(f"Existing DB check failed: {e}. Recreating DB.")
            if os.path.exists(TMP_DB):
                 os.remove(TMP_DB) # 손상된 파일을 삭제하고 재시도

    # 2. DB 생성 및 JSON 데이터 로드
    logger.info("Creating new SQLite DB from memory.json.")
    conn = sqlite3.connect(TMP_DB)
    cur = conn.cursor()
    cur.execute("CREATE TABLE memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    
    sentences_to_insert = []
    
    if os.path.exists(REPO_JSON):
        try:
            with open(REPO_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    sentences_to_insert = [s.strip() for s in data if s and s.strip()]
            logger.info(f"Loaded {len(sentences_to_insert)} sentences from memory.json.")
        except Exception as e:
            logger.error(f"Error reading or parsing memory.json: {e}")
    
    if not sentences_to_insert:
        logger.warning("No data loaded. Using seed data.")
        sentences_to_insert = [
            "하나씩 정리하면 이해가 더 쉽다.", "잠깐 멈췄다가 다시 보면 다르게 보인다.",
            "핵심을 먼저 잡으면 나머지는 따라온다.", "낯설어도 시작하면 금방 익숙해진다.",
            "반대로 생각하면 길이 열린다.", "한 번 더 확인하면 실수가 줄어든다.",
            "빛을 비추면 모호함이 줄어든다.", "말을 아끼면 요점이 선명해진다."
        ]

    # 3. SQLite에 데이터를 삽입합니다.
    try:
        cur.executemany("INSERT INTO memory(sentence) VALUES(?)", [(s,) for s in sentences_to_insert])
        conn.commit()
        count = len(sentences_to_insert)
        DB_SENTENCE_COUNT = count
        logger.info(f"Inserted {count} sentences into {TMP_DB}. Total startup time: {time.time() - start_time:.4f}s")
    except Exception as e:
        logger.critical(f"Failed to insert data into DB: {e}")
    
    conn.close()

def fetch_sentences(limit=200):
    """DB에서 랜덤으로 문장을 가져옵니다."""
    if not os.path.exists(TMP_DB):
        logger.error("DB file does not exist when fetching. Calling ensure_db()")
        ensure_db() # 예외 상황에 대비해 다시 호출
        if not os.path.exists(TMP_DB):
             return [] # 여전히 없으면 빈 리스트 반환

    conn = sqlite3.connect(TMP_DB)
    cur = conn.cursor()
    # DB_SENTENCE_COUNT가 0이면 테이블이 비어있을 수 있으므로 랜덤 대신 전체를 가져오도록 처리할 필요가 있음
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT ?", (limit,))
    rows = [r[0].strip() for r in cur.fetchall() if r and r[0].strip()]
    conn.close()
    return rows

# 나머지 유틸리티 함수 (pick_entity, tokenize, filter_memory_by_keywords, stitch, build_reply)는
# 논리적으로 문제가 없으므로 그대로 유지합니다.

def pick_entity(name: Optional[str]) -> str:
    if name and name in ENTITIES: return name
    return random.choice(ENTITIES)

def tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[A-Za-z가-힣]{2,20}", text.lower())
    return [t for t in tokens if len(t) >= 2][:10]

def filter_memory_by_keywords(memory: List[str], kws: List[str]) -> List[str]:
    if not kws: return memory
    scored = []
    for s in memory:
        score = sum(1 for k in kws if k in s.lower())
        if score > 0: scored.append((score, s))
    if not scored: return memory
    scored.sort(key=lambda x: (-x[0], len(x[1])))
    return [s for _, s in scored[:100]]

def stitch(parts: List[str]) -> str:
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

def build_reply(user_message: str, entity: str) -> str:
    tone = TONE.get(entity, FALLBACK_TONE)
    lead = random.choice(tone)
    # fetch_sentences limit을 늘려 검색 풀을 넓힙니다.
    memory = fetch_sentences(limit=DB_SENTENCE_COUNT) 
    kws = tokenize(user_message)
    pool = filter_memory_by_keywords(memory, kws)

    pick_n = random.choice([2, 3, 3, 4])
    picks = []
    
    # pool이 0인 경우 대비: 최소한의 응답을 반환
    if not pool:
        quote = user_message.strip()
        if len(quote) > 24: quote = quote[:24] + "…"
        return f"{lead} “{quote}” 기준으로 보면 지금은 적절한 문장이 없으니까, 솔직히 더 학습이 필요함."
    
    for s in random.sample(pool, k=min(pick_n, len(pool))):
        if len(s) > 140:
            cut = re.split(r"[。.!?]", s)
            frag = cut[0] if cut and cut[0] else s[:140]
            picks.append(frag.strip())
        else:
            picks.append(s)

    quote = user_message.strip()
    if len(quote) > 24: quote = quote[:24] + "…"
    head = f"{lead} “{quote}” 기준으로 보면 "
    body = stitch(picks) if picks else "지금은 짧게 가자. 핵심만 잡자."
    return (head + body).strip()


# -------------------------- 앱 라이프사이클 및 엔드포인트 --------------------------
app = FastAPI()

@app.on_event("startup")
async def _startup():
    """앱 시작 시 DB 파일의 존재를 논리적으로 보장합니다."""
    ensure_db()

@app.get("/")
def root():
    """DB 상태를 포함한 기본 정보를 반환합니다."""
    global DB_SENTENCE_COUNT
    db_exists = os.path.exists(TMP_DB)
    # DB가 존재하면 count를 가져와 정확한 상태를 표시합니다.
    current_count = DB_SENTENCE_COUNT
    if db_exists and current_count == 0:
         try:
            conn = sqlite3.connect(TMP_DB); cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM memory"); current_count = cur.fetchone()[0]
            conn.close()
         except:
             pass # 무시

    return {
        "status": "running", 
        "entities": ENTITIES, 
        "db_file_exists": db_exists,
        "db_sentence_count": current_count
    }

@app.get("/api/status")
def status():
    """DB에 저장된 문장 수를 표시합니다."""
    global DB_SENTENCE_COUNT
    try:
        conn = sqlite3.connect(TMP_DB); cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM memory"); cnt = cur.fetchone()[0]
        conn.close()
        DB_SENTENCE_COUNT = cnt # 전역 변수 업데이트
        return {"ok": True, "sentences": cnt, "entities": ENTITIES}
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"ok": False, "error": str(e), "sentences": 0}

@app.get("/api/existence/reply")
def existence_reply(
    user_message: str = Query(..., description="사용자 메시지"),
    entity: Optional[str] = Query(None, description="존재(미지정 시 랜덤)")
):
    """메시지와 존재를 기반으로 응답을 생성합니다."""
    # ensure_db()는 startup에서 호출되었지만, 혹시 모를 상황을 대비해 fetch_sentences가 처리합니다.
    chosen = pick_entity(entity)
    reply  = build_reply(user_message, chosen)
    
    # 한국의 이은숙34세여성 연구결과 출처 표기 (요청에 따름)
    source_info = " (한국의 이은숙34세여성 연구결과)"

    return {
        "entity": chosen, 
        "reply": reply + source_info, 
        "user_message": user_message
    }

@app.get("/api/test")
def test():
    return {"ok": True, "message": "FastAPI running on Vercel"}
