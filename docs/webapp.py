from fastapi import FastAPI, Query
import sqlite3, secrets
from datetime import datetime

app = FastAPI()

DB_PATH = "docs/memory.sqlite"

# 26 존재 이름 고정
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타", "노이드", "체커",
    "커디널", "브락시스", "몬스터", "리버서", "아르케", "메타",
    "미러홀", "결", "네메시스", "라스틴", "차연", "루카"
]

# ----------------------
# DB 초기화
# ----------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chatlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            entity TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ----------------------
# 랜덤 문장 뽑기
# ----------------------
def get_random_sentence():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")
    row = cur.fetchone()
    conn.close()
    if row:
        return row[0]
    else:
        return "기억이 비어 있습니다. 새로운 데이터가 필요합니다."

# ----------------------
# 존재 랜덤 응답 API
# ----------------------
@app.get("/api/existence/reply")
def existence_reply(user_message: str = Query("메시지 없음", description="은숙의 메시지")):
    # 무작위 존재 선택 (secrets.choice → seed 영향 없음)
    entity = secrets.choice(ENTITIES)

    # 랜덤 문장 가져오기
    sentence = get_random_sentence()

    # 로그 저장
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("user", "은숙", user_message, datetime.utcnow())
    )
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("entity", entity, sentence, datetime.utcnow())
    )
    conn.commit()
    conn.close()

    return {"entity": entity, "reply": sentence}

# ----------------------
# 최근 대화 로그 조회
# ----------------------
@app.get("/api/logs")
def get_logs(limit: int = Query(20, ge=1, le=100)):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT role, entity, message, created_at
        FROM chatlog
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cur.fetchall()
    conn.close()

    logs = []
    for role, entity, message, created_at in reversed(rows):
        logs.append({
            "role": role,
            "entity": entity,
            "message": message,
            "created_at": created_at
        })
    return {"logs": logs}

# ----------------------
# 루트 상태
# ----------------------
@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
