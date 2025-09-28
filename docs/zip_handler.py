import zipfile, json, os, re
from pathlib import Path

def process_zip_files():
    """docs 폴더의 ZIP 파일을 처리하여 memory.json에 통합 및 50,000개로 축소"""
    
    memory_file = "docs/memory.json"
    os.makedirs("docs", exist_ok=True)
    
    # 기존 memory.json 로드
    existing_memory = []
    if os.path.exists(memory_file):
        try:
            with open(memory_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    existing_memory = data
        except:
            existing_memory = []
            
    print(f"기존 메모리: {len(existing_memory)}개 항목")
    
    # ZIP 파일을 'docs' 폴더 안에서 찾도록 경로가 명시되어 있습니다.
    zip_files = list(Path("docs").glob("*.zip"))
    
    if not zip_files:
        print("처리할 ZIP 파일이 없습니다. (docs/ 폴더에 ZIP 파일 확인 요망)")
    
    new_sentences = []
    
    for zip_path in zip_files:
        print(f"\n처리 중: {zip_path}")
        
        try:
            with zipfile.ZipFile(zip_path, "r") as z:
                for file_name in z.namelist():
                    if file_name.endswith(('.txt', '.json', '.md')):
                        try:
                            with z.open(file_name) as f:
                                content = f.read().decode("utf-8", errors="ignore")
                                if file_name.endswith('.json'):
                                    try:
                                        json_data = json.loads(content)
                                        if isinstance(json_data, list):
                                            new_sentences.extend(json_data)
                                        elif isinstance(json_data, dict):
                                            for value in json_data.values():
                                                if isinstance(value, str) and len(value) > 10:
                                                    new_sentences.append(value)
                                    except:
                                        # JSON 파싱 실패 시 텍스트로 처리
                                        new_sentences.extend(extract_sentences_from_text(content))
                                else:
                                    # 텍스트 파일 처리
                                    new_sentences.extend(extract_sentences_from_text(content))
                        except Exception as e:
                            print(f"  오류: {e}")
                            continue
            
        except Exception as e:
            print(f"ZIP 파일 처리 실패: {e}")
            continue
            
    print(f"\n새로 추출된 문장: {len(new_sentences)}개")
    
    # 데이터 정리 및 병합
    all_sentences = existing_memory + new_sentences
    cleaned_sentences = clean_and_deduplicate(all_sentences)
    
    # 저장
    try:
        with open(memory_file, "w", encoding="utf-8") as f:
            json.dump(cleaned_sentences, f, ensure_ascii=False, indent=2)
        print(f"✅ 완료: {len(cleaned_sentences)}개 문장이 memory.json에 저장되었습니다.")
    except Exception as e:
        print(f"❌ 저장 실패: {e}")


def extract_sentences_from_text(text):
    """텍스트에서 문장 추출 (필터링 최소화, 최소 길이 5자)"""
    sentences = []
    
    # 텍스트를 마침표, 물음표, 느낌표 기준으로 분리합니다.
    parts = re.split(r'[.!?]\s*', text)
    
    for part in parts:
        # 줄 바꿈 및 다중 공백을 하나의 공백으로 정리합니다.
        clean_part = re.sub(r'[\r\n\t]+', ' ', part)
        clean_part = re.sub(r'\s+', ' ', clean_part).strip()
        
        # 👇 문장 길이 제한을 5자로 최소화합니다.
        if 5 <= len(clean_part) <= 300: 
            # 불필요한 따옴표나 공백을 제거합니다.
            if clean_part.startswith('"') and clean_part.endswith('"'):
                clean_part = clean_part[1:-1].strip()
            
            sentences.append(clean_part)
            
    return sentences

def clean_and_deduplicate(sentences):
    """문장 정리 및 중복 제거, 50,000개로 축소"""
    seen = set()
    cleaned = []
    
    for sentence in sentences:
        if not isinstance(sentence, str):
            sentence = str(sentence)
            
        clean = re.sub(r'\s+', ' ', sentence).strip()
        
        # 👇 최소 길이 제한을 5자로 변경했습니다.
        if len(clean) < 5 or len(clean) > 500: 
            continue
            
        if clean not in seen:
            seen.add(clean)
            cleaned.append(clean)
            
    # Vercel 메모리 한계 극복을 위한 데이터 축소
    if len(cleaned) > 50000:
        cleaned = cleaned[-50000:]
        
    return cleaned

if __name__ == "__main__":
    process_zip_files()
