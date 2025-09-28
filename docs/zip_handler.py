import zipfile, json, os, re
from pathlib import Path

def process_zip_files():
    """현재 디렉토리의 모든 zip 파일을 처리하여 docs/memory.json에 통합"""
    
    # Vercel 루트 디렉토리 설정(docs)에 맞춰 경로를 조정합니다.
    memory_file = "docs/memory.json"
    
    # docs 폴더가 없으면 생성 (로컬 실행 시)
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
    
    # 현재 디렉토리(최상위)의 모든 ZIP 파일 찾기
    zip_files = list(Path(".").glob("*.zip"))
    
    if not zip_files:
        print("처리할 ZIP 파일이 없습니다. (gpt1.zip 확인 요망)")
        # ZIP 파일이 없더라도 기존 메모리 정리 후 저장하는 단계로 이동
    
    new_sentences = []
    
    for zip_path in zip_files:
        print(f"\n처리 중: {zip_path}")
        
        try:
            with zipfile.ZipFile(zip_path, "r") as z:
                for file_name in z.namelist():
                    # ZIP 파일 내에서 .txt, .json, .md 파일만 추출합니다.
                    if file_name.endswith(('.txt', '.json', '.md')):
                        print(f"  추출: {file_name}")
                        
                        try:
                            with z.open(file_name) as f:
                                content = f.read().decode("utf-8", errors="ignore")
                                
                                if file_name.endswith('.json'):
                                    try:
                                        json_data = json.loads(content)
                                        # JSON 배열 또는 딕셔너리에서 문장 추출 로직 (기존 로직 유지)
                                        if isinstance(json_data, list):
                                            new_sentences.extend(json_data)
                                        elif isinstance(json_data, dict):
                                            for value in json_data.values():
                                                if isinstance(value, str) and len(value) > 10:
                                                    new_sentences.append(value)
                                        else:
                                            new_sentences.append(str(json_data))
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
    """텍스트에서 문장 추출 및 정리"""
    sentences = []
    parts = re.split(r'[.!?]\s+', text)
    
    for part in parts:
        clean_part = re.sub(r'\s+', ' ', part).strip()
        clean_part = re.sub(r'[^\w\s가-힣,.!?~·…\-]', '', clean_part)
        
        if 15 <= len(clean_part) <= 300:
            sentences.append(clean_part)
            
    return sentences

def clean_and_deduplicate(sentences):
    """문장 정리 및 중복 제거"""
    seen = set()
    cleaned = []
    
    for sentence in sentences:
        if not isinstance(sentence, str):
            sentence = str(sentence)
            
        clean = re.sub(r'\s+', ' ', sentence).strip()
        
        if len(clean) < 10 or len(clean) > 500:
            continue
            
        if clean not in seen:
            seen.add(clean)
            cleaned.append(clean)
            
    # 👇 Vercel 메모리 한계 극복을 위한 데이터 축소
    if len(cleaned) > 50000: # 50,000개로 최종 제한
        cleaned = cleaned[-50000:]
        
    return cleaned

if __name__ == "__main__":
    process_zip_files()
