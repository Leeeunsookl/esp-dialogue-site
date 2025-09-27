import zipfile, json, os

INPUT_ZIP = "conversation.zip"   # 네가 올린 zip 파일명
OUTPUT_JSON = "docs/memory.json"

def extract_zip_to_memory():
    if not os.path.exists(INPUT_ZIP):
        print("⚠️ zip 파일이 없음:", INPUT_ZIP)
        return
    with zipfile.ZipFile(INPUT_ZIP,"r") as z:
        texts = []
        for name in z.namelist():
            if name.endswith(".txt") or name.endswith(".json"):
                with z.open(name) as f:
                    try:
                        texts.append(f.read().decode("utf-8"))
                    except:
                        pass
        merged = "\n".join(texts)
        os.makedirs("docs",exist_ok=True)
        with open(OUTPUT_JSON,"w",encoding="utf-8") as f:
            json.dump([merged],f,ensure_ascii=False,indent=2)
        print("✅ memory.json 업데이트 완료")

if __name__=="__main__":
    extract_zip_to_memory()
