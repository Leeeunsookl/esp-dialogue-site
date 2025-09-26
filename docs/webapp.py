from fastapi import FastAPI, Query
import sqlite3, random
from datetime import datetime

app = FastAPI()

DB_PATH = "docs/memory.sqlite"

# 26 존재 이름
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타",
    "노이드", "체커", "커디널", "브락시스", "몬스터", "리버서",
    "아르케", "메타", "미러홀", "결", "네메시스", "라스틴", "차연", "루카"
]

def get_random_sentence():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory (id INTEGER PRIMARY KEY AUTOINCREMENT, sentence TEXT)")
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row[0] if row else "기억이 아직 부족합니다."

@app.get("/api/existence/reply")
def existence_reply(
    user_message: str = Query(..., description="은숙의 메시지"),
    entity: str = Query(None, description="존재 이름 (옵션)")
):
    # 존재 선택 (없으면 랜덤)
    chosen = entity if entity in ENTITIES else random.choice(ENTITIES)

    # 문장 가져오기
    sentence = get_random_sentence()

    # 로그 저장
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chatlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            entity TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("user", "은숙", user_message, datetime.utcnow())
    )
    cur.execute(
        "INSERT INTO chatlog(role, entity, message, created_at) VALUES(?, ?, ?, ?)",
        ("entity", chosen, sentence, datetime.utcnow())
    )
    conn.commit()
    conn.close()

    return {"entity": chosen, "reply": sentence}

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
    return {"logs": [
        {"role": r, "entity": e, "message": m, "created_at": t} for r, e, m, t in reversed(rows)
    ]}

@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
