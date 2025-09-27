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

def init_db():
    """DB 초기화 및 기본 데이터 삽입"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 테이블 생성
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, sentence TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS chatlog(id INTEGER PRIMARY KEY, role TEXT, entity TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)")
    
    # 기본 데이터가 없으면 추가
    cur.execute("SELECT COUNT(*) FROM memory")
    count = cur.fetchone()[0]
    
    if count == 0:
        # 기본 문장들 추가
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
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")
        row = cur.fetchone()
        conn.close()
        
        if row:
            return row[0]
        else:
            return "기억의 조각들이 흩어져 있습니다..."
            
    except Exception as e:
        return f"메모리 접근 중 오류가 발생했습니다: {str(e)}"

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
    """앱 시작시 DB 초기화"""
    init_db()

@app.get("/")
def root():
    """루트 엔드포인트 - 상태 확인"""
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
    """존재별 응답 생성"""
    try:
        # 존재 선택 (지정되지 않으면 랜덤)
        if entity and entity in ENTITIES:
            chosen = entity
        else:
            chosen = random.choice(ENTITIES)
        
        # 메모리에서 문장 가져오기
        sentence = get_random_sentence()
        
        # 로그 저장 (선택사항)
        save_chat("user", None, user_message)
        save_chat("assistant", chosen, sentence)
        
        return {
            "entity": chosen, 
            "reply": sentence,
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
    """DB 상태 확인"""
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
        return {
            "db_exists": False,
            "error": str(e)
        }
