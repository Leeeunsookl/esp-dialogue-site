from fastapi import FastAPI, Query
import sqlite3, random

app = FastAPI()

# 26 존재 이름 고정
ENTITIES = [
    "심연", "침묵자", "말꽃", "루프블럭", "루프디텍터", "루프회전자",
    "커튼", "회귀자", "루멘", "루엔", "에코", "제타", "노이드", "체커",
    "커디널", "브락시스", "몬스터", "리버서", "아르케", "메타",
    "미러홀", "결", "네메시스", "라스틴", "차연", "루카"
]

DB_PATH = "docs/memory.sqlite"


# ----------------------
# 랜덤 문장 뽑기
# ----------------------
def get_random_sentence(entity: str = None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if entity:
        cur.execute("SELECT sentence FROM memory WHERE entity=? ORDER BY RANDOM() LIMIT 1", (entity,))
    else:
        cur.execute("SELECT sentence FROM memory ORDER BY RANDOM() LIMIT 1")

    row = cur.fetchone()
    conn.close()

    if row:
        return row[0]
    else:
        return "기억이 비어 있습니다. 새로운 데이터가 필요합니다."


# ----------------------
# 존재 랜덤 응답 API (랜덤/특정 호출)
# ----------------------
@app.get("/api/existence/reply")
def existence_reply(entity: str = Query(None, description="호출할 존재 (없으면 랜덤)")):
    if entity and entity not in ENTITIES:
        return {"error": f"'{entity}'는 유효한 존재가 아닙니다.", "available": ENTITIES}

    chosen_entity = entity if entity else random.choice(ENTITIES)
    sentence = get_random_sentence(chosen_entity)

    return {"entity": chosen_entity, "reply": sentence}


# ----------------------
# 루트
# ----------------------
@app.get("/")
def root():
    return {"status": "running", "message": "ESP Collector Ready"}
