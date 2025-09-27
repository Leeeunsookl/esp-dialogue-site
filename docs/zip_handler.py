import zipfile, json, os, re
from pathlib import Path

def process_zip_files():
    """현재 디렉토리의 모든 zip 파일을 처리"""
    
    # docs 폴더 생성
    os.makedirs("docs", exist_ok=True)
    
    # 기존 memory.json 로드
    memory_file = "docs/memory.json"
    existing_memory = []
    
    if os.path.exists(memory_file):
        try:
            with open(memory_file, "r", encoding="utf-8") as f:
                existing_memory = json.load(f)
                if not isinstance(existing_memory, list):
                    existing_memory = []
        except:
            existing_memory = []
    
    print(f"기존 메모리: {len(existing_memory)}개 항목")
    
    # 현재 디렉토리의 모든 ZIP 파일 찾기
    zip_files = list(Path(".").glob("*.zip"))
    
    if not zip_files:
        print("처리할 ZIP 파일이 없습니다.")
        return
    
    new_sentences = []
    
    for zip_path in zip_files:
        print(f"\n처리 중: {zip_path}")
        
        try:
            with zipfile.ZipFile(zip_path, "r") as z:
                for file_name in z.namelist():
                    if file_name.endswith(('.txt', '.json', '.md')):
                        print(f"  추출: {file_name}")
                        
                        try:
                            with z.open(file_name) as f:
                                content = f.read().decode("utf-8", errors="ignore")
                                
                                # JSON 파일인 경우
                                if file_name.endswith('.json'):
                                    try:
                                        json_data = json.loads(content)
                                        if isinstance(json_data, list):
                                            new_sentences.extend(json_data)
                                        elif isinstance(json_data, dict):
                                            # 딕셔너리의 값들을 문장으로 추출
                                            for value in json_data.values():
                                                if isinstance(value, str) and len(value) > 10:
                                                    new_sentences.append(value)
                                        else:
                                            new_sentences.append(str(json_data))
                                    except:
                                        # JSON 파싱 실패시 텍스트로 처리
                                        sentences = extract_sentences_from_text(content)
                                        new_sentences.extend(sentences)
                                
                                # 텍스트 파일인 경우
                                else:
                                    sentences = extract_sentences_from_text(content)
                                    new_sentences.extend(sentences)
                                    
                        except Exception as e:
                            print(f"    오류: {e}")
                            continue
        
        except Exception as e:
            print(f"ZIP 파일 처리 실패: {e}")
            continue
        
        # 처리 완료된 ZIP 파일 삭제 (선택사항)
        # zip_path.unlink()
    
    print(f"\n새로 추출된 문장: {len(new_sentences)}개")
    
    # 데이터 정리 및 병합
    all_sentences = existing_memory + new_sentences
    cleaned_sentences = clean_and_deduplicate(all_sentences)
    
    # 저장
    with open(memory_file, "w", encoding="utf-8") as f:
        json.dump(cleaned_sentences, f, ensure_ascii=False, indent=2)
    
    print(f"완료: {len(cleaned_sentences)}개 문장이 memory.json에 저장되었습니다.")

def extract_sentences_from_text(text):
    """텍스트에서 문장 추출"""
    sentences = []
    
    # 문장 분리 (마침표, 느낌표, 물음표 기준)
    parts = re.split(r'[.!?]\s+', text)
    
    for part in parts:
        # 정리
        clean_part = re.sub(r'\s+', ' ', part).strip()
        clean_part = re.sub(r'[^\w\s가-힣,.!?~·…\-]', '', clean_part)
        
        # 적절한 길이의 문장만 선택
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
        
        # 기본 정리
        clean = re.sub(r'\s+', ' ', sentence).strip()
        
        # 너무 짧거나 긴 문장 제외
        if len(clean) < 10 or len(clean) > 500:
            continue
        
        # 중복 제거
        if clean not in seen:
            seen.add(clean)
            cleaned.append(clean)
    
    # 최대 개수 제한 (최신 데이터 우선)
    if len(cleaned) > 100000:
        cleaned = cleaned[-100000:]
    
    return cleaned

if __name__ == "__main__":
    process_zip_files()
