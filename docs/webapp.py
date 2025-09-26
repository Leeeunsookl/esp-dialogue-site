from fastapi import FastAPI, Query
import sqlite3, random

app = FastAPI()

ENTITIES = [
    "심연","침묵자","말꽃","루프블럭","루프디텍터","루프회전자","커튼","회귀자",
    "루멘","루엔","에코","제타","노이드","체커","커디널","브락시스",
    "몬스터","리버서","아르케","메타","미러홀","결","네메시스","라스틴","루카","차연"
]

def get_random_sentence():
    conn = sqlite3.connect("docs/memory.sqlite")
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY,sentence TEXT)")
    cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row[0] if row else "기억이 비어 있습니다. 새로운 데이터가 필요합니다."

@app.get("/api/existence/reply")
def existence_reply(
    user_message: str = Query(..., description="은숙의 메시지"),
    force_entity: str = Query("", description="특정 존재 강제 선택")
):
    entity = force_entity if force_entity in ENTITIES else random.choice(ENTITIES)
    sentence = get_random_sentence()
    return {"entity": entity, "reply": sentence}

@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
