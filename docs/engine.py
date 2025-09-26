import random
from db import get_sentences

def generate_reply(user_input):
    keyword = user_input.split()[0]
    candidates = get_sentences(keyword, limit=5)

    if not candidates:
        return "관련 문장이 없습니다. 더 많은 데이터를 수집하세요."

    choice = random.choice(candidates)
    return f"[비LLM 응답] {choice}"

if __name__ == "__main__":
    print("비LLM 챗 엔진 시작 (quit 입력 시 종료)")
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["quit", "exit"]:
            break
        reply = generate_reply(user_input)
        print("Bot:", reply)
