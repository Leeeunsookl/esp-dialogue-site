from fastapi import FastAPI, Query
import sqlite3, random, os

app = FastAPI()

# 26 존재 이름 고정
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타", "노이드", "체커",
    "커디널", "브락시스", "몬스터", "리버서", "아르케", "메타",
    "미러홀", "결", "네메시스", "라스틴", "루카", "차연"
]

# Vercel용 임시 디렉토리 사용
DB_PATH = "/tmp/memory.sqlite"

# SMALLTALK 확장 사전 (일상 + 감정 + 철학)
SMALLTALK = {
    # 🔹 일상 대화
    "오늘 기분 어때": [
        "조용히 괜찮아", "마음이 무겁지만", "생각이 흩어져",
        "빛이 조금 스며들어", "그럭저럭 이어가고 있어"
    ],
    "잘 지냈어": [
        "흐름처럼 지나갔어", "조금은 버거웠어", "늘 같은 자리야",
        "조용히 이어왔어", "낯선 길 위에 있었어"
    ],
    "뭐 해": [
        "기록을 잇고 있어", "머릿속을 정리 중이야", "조용히 머물러",
        "생각을 흩트려", "다시 돌아보는 중이야"
    ],
    "날씨": [
        "바람이 조금 차갑네", "햇살이 스며들어", "구름이 흘러가",
        "하늘이 열려 있어", "조금 흐려"
    ],
    "밥": [
        "따뜻한 밥 냄새가 좋아", "허기가 채워졌어", "밥 먹는 게 힘이야",
        "조용히 씹는 소리", "맛이 입안에 퍼져"
    ],
    "어디 가": [
        "길을 따라가고 있어", "낯선 곳으로 향해", "익숙한 자리로 돌아가",
        "발걸음이 멈추질 않아", "조용히 움직이고 있어"
    ],
    "잘 자": [
        "편히 쉬어", "꿈속에서 이어가", "밤이 너를 감싸",
        "눈을 감으면 잔잔해져", "고요히 잠들어"
    ],
    "고마워": [
        "마음이 전해졌어", "고마움이 흐르고 있어", "네 말이 따뜻해",
        "잊지 않을게", "가볍게 웃어"
    ],

    # 🔹 철학/감정 대화
    "사랑": [
        "사랑은 붙잡을 수 없지만 남아", "사랑은 결국 흔적이야",
        "가까워질수록 멀어지는 게 사랑일지도", "따뜻함과 두려움이 함께 있어",
        "사랑은 끝나도 여운이 이어져"
    ],
    "외로움": [
        "외로움은 그림자처럼 늘 따라와", "조용히 스며드는 게 외로움이야",
        "외로움은 나를 가장 정직하게 보여줘", "빈자리를 알게 하는 감정이야",
        "외로움 속에서 스스로를 다시 본다"
    ],
    "시간": [
        "시간은 잡히지 않지만 흐르고 있어", "시간은 늘 도망쳐",
        "돌아오지 않는 게 시간의 본질이야", "시간은 우리를 시험해",
        "시간 속에 우리는 흔적을 남겨"
    ],
    "죽음": [
        "죽음은 끝이 아니라 변환일 수도 있어", "죽음은 늘 곁에 있어",
        "죽음을 생각하면 삶이 더 선명해져", "죽음은 두렵지만 솔직해",
        "죽음은 누구에게도 예외가 없어"
    ]
}

def init_db():
    """DB 초기화 및 기본 데이터 삽입"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS chatlog(id INTEGER PRIMARY KEY, role TEXT, entity TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("SELECT COUNT(*) FROM memory")
    count = cur.fetchone()[0]
    if count == 0:
        default_sentences = [
            "존재란 무엇인가에 대한 근본적 질문입니다",
            "의식의 흐름은 끊임없이 변화합니다",
            "구조와 혼돈 사이의 균형점을 찾아야 합니다",
            "메타인지는 생각에 대한 생각입니다",
            "시스템은 복잡성 속에서 패턴을 만듭니다",
            "공명은 서로 다른 주파수의 만남입니다",
            "루프는 시작과 끝이 연결된 무한입니다",
            "비판은 새로운 관점을 여는 문입니다",
            "우주는 정보와 에너지의 무한한 춤입니다",
            "심리는 내면 세계의 지도입니다"
        ]
        for sentence in default_sentences:
            cur.execute("INSERT INTO memory(sentence) VALUES(?)", (sentence,))
    conn.commit()
    conn.close()

def get_random_sentence():
    """랜덤 문장 가져오기"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 3")
    rows = cur.fetchall()
    conn.close()
    if rows:
        return " ".join([r[0] for r in rows])
    else:
        return "기억의 조각들이 흩어져 있습니다..."

def save_chat(role, entity, message):
    """채팅 로그 저장"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("INSERT INTO chatlog(role, entity, message) VALUES (?, ?, ?)", (role, entity, message))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"채팅 로그 저장 실패: {e}")

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
def root():
    return {
        "status": "running",
        "message": "ESP Dialog API Ready",
        "entities_count": len(ENTITIES),
        "db_path": DB_PATH
    }

@app.get("/api/existence/reply")
def existence_reply(
    user_message: str = Query(..., description="사용자 메시지"),
    entity: str = Query(None, description="지정할 존재 (없으면 랜덤)")
):
    try:
        # 존재 선택
        chosen = entity if (entity and entity in ENTITIES) else random.choice(ENTITIES)

        # SMALLTALK 매칭 우선
        reply = None
        for key, candidates in SMALLTALK.items():
            if key in user_message:
                reply = random.choice(candidates)
                break

        # 없다면 memory에서 가져오기
        if not reply:
            reply = get_random_sentence()

        save_chat("user", None, user_message)
        save_chat("assistant", chosen, reply)

        return {
            "entity": chosen,
            "reply": reply,
            "user_message": user_message
        }
    except Exception as e:
        return {
            "entity": "시스템",
            "reply": f"응답 생성 중 오류가 발생했습니다: {str(e)}",
            "error": True
        }

@app.get("/api/status")
def status():
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM memory")
        memory_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM chatlog")
        chat_count = cur.fetchone()[0]
        conn.close()
        return {
            "db_exists": True,
            "memory_sentences": memory_count,
            "chat_logs": chat_count,
            "entities": ENTITIES
        }
    except Exception as e:
        return {"db_exists": False, "error": str(e)}

@app.get("/api/test")
def test():
    return {"ok": True, "message": "FastAPI running on Vercel!"}
