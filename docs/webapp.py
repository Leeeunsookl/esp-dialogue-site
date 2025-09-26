from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
import uvicorn
from engine import generate_reply

app = FastAPI()

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>비LLM 챗 엔진</title>
    <style>
        body { font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; }
        .chat-box { border: 1px solid #ccc; padding: 10px; height: 400px; overflow-y: scroll; }
        .msg { margin: 5px 0; }
        .user { color: blue; }
        .bot { color: green; }
    </style>
</head>
<body>
    <h2>비LLM 챗 엔진</h2>
    <div class="chat-box" id="chat-box"></div>
    <form action="/" method="post">
        <input type="text" name="msg" style="width:80%" autofocus />
        <input type="submit" value="Send" />
    </form>
</body>
</html>
"""

chat_history = []

@app.get("/", response_class=HTMLResponse)
async def get_chat():
    return HTML_TEMPLATE.replace(
        '<div class="chat-box" id="chat-box"></div>',
        '<div class="chat-box" id="chat-box">' + "<br>".join(chat_history) + "</div>"
    )

@app.post("/", response_class=HTMLResponse)
async def post_chat(msg: str = Form(...)):
    user_msg = f'<div class="msg user">You: {msg}</div>'
    reply = generate_reply(msg)
    bot_msg = f'<div class="msg bot">Bot: {reply}</div>'
    chat_history.extend([user_msg, bot_msg])
    return HTML_TEMPLATE.replace(
        '<div class="chat-box" id="chat-box"></div>',
        '<div class="chat-box" id="chat-box">' + "<br>".join(chat_history) + "</div>"
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
