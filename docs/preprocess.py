import sqlite3

def save_chat(role, entity, message):
    """
    채팅 로그를 저장하고, 안전장치로 10만 개 이상일 경우 오래된 로그를 삭제합니다.
    """
    conn = sqlite3.connect("docs/memory.sqlite")
    cur = conn.cursor()

    # 로그 삽입
    cur.execute(
        "INSERT INTO chatlog(role, entity, message) VALUES (?, ?, ?)",
        (role, entity, message)
    )

    # 안전장치: 최근 100,000개만 유지
    cur.execute("""
        DELETE FROM chatlog
        WHERE id NOT IN (
            SELECT id FROM chatlog ORDER BY id DESC LIMIT 100000
        )
    """)

    conn.commit()
    conn.close()
