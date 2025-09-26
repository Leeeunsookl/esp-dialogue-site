from fastapi import FastAPI, Query
import sqlite3, random
from datetime import datetime

app = FastAPI()

DB_PATH = "docs/memory.sqlite"

# 26 존재 고정
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타",
    "노이드", "체커", "커디널", "브락시스", "몬스터", "리버서",
    "아르케", "메타", "미러홀", "결", "네메시스", "라스틴", "차연", "루카"
]

# ----------------------
# DB 초기화
# ----------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # memory 테이블 (존재별 문장 저장)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT,
            sentence TEXT
        )
    """)
    # chatlog 테이블 (대화 기록)
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
# 랜덤 문장 가져오기
# ----------------------
def get_random_sentence(entity: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT sentence FROM memory WHERE entity=? ORDER BY RANDOM() LIMIT 1",
        (entity,)
    )
    row = cur.fetchone()
    conn.close()
    return row[0] if row else "기억이 부족합니다."

# ----------------------
# 존재 응답 API
# ----------------------
@app.get("/api/existence/reply")
def existence_reply(
    user_message: str = Query(..., description="은숙의 메시지"),
    entity: str = Query(None, description="특정 존재 지정 (없으면 랜덤)")
):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 은숙 메시지 기록
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("user", "은숙", user_message, datetime.utcnow())
    )
    conn.commit()

    # 존재 선택
    chosen_entity = entity if entity in ENTITIES else random.choice(ENTITIES)

    # 존재 고유 문장에서 응답
    reply = get_random_sentence(chosen_entity)

    # 응답 기록
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("entity", chosen_entity, reply, datetime.utcnow())
    )
    conn.commit()
    conn.close()

    return {"entity": chosen_entity, "reply": reply}

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
# 루트
# ----------------------
@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
