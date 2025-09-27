import os, json, requests, time
from bs4 import BeautifulSoup
from datetime import datetime
import random

OUTPUT_FILE = "docs/memory.json"

# 더 안정적인 크롤링 대상
SOURCES = [
    # 철학/심리학 관련 안정적인 사이트들
    "https://plato.stanford.edu/entries/consciousness/",
    "https://plato.stanford.edu/entries/metaphysics/", 
    "https://plato.stanford.edu/entries/personal-identity/",
    "https://plato.stanford.edu/entries/mental-representation/",
    
    # 위키피디아 특정 주제들
    "https://en.wikipedia.org/wiki/Consciousness",
    "https://en.wikipedia.org/wiki/Philosophy_of_mind",
    "https://en.wikipedia.org/wiki/Metacognition", 
    "https://en.wikipedia.org/wiki/Systems_theory",
    "https://en.wikipedia.org/wiki/Complexity",
]

# 백업 문장들 (크롤링 실패시 사용)
FALLBACK_SENTENCES = [
    "존재란 무엇인가에 대한 근본적 질문입니다",
    "의식의 흐름은 끊임없이 변화합니다",
    "구조와 혼돈 사이의 균형점을 찾아야 합니다", 
    "메타인지는 생각에 대한 생각입니다",
    "시스템은 복잡성 속에서 패턴을 만듭니다",
    "공명은 서로 다른 주파수의 만남입니다",
    "루프는 시작과 끝이 연결된 무한입니다",
    "비판은 새로운 관점을 여는 문입니다",
    "우주는 정보와 에너지의 무한한 춤입니다",
    "심리는 내면 세계의 지도입니다",
    "시간은 의식이 만든 환상일 수도 있습니다",
    "기억은 과거와 현재를 잇는 다리입니다",
    "언어는 생각을 감옥에 가두기도, 해방시키기도 합니다",
    "침묵 속에서 진실이 스스로를 드러냅니다",
    "모든 끝은 새로운 시작의 씨앗입니다",
    "관찰자가 바뀌면 관찰되는 것도 바뀝니다",
    "패턴은 반복 속에서 생겨나지만 변화 속에서 의미를 얻습니다",
    "경계는 구분을 만들지만 동시에 연결점이 되기도 합니다",
    "정보는 엔트로피와 질서 사이에서 춤춥니다",
    "인식은 현실을 창조하는 동시에 현실에 의해 창조됩니다"
]

def fetch_sentences(url, max_retries=2):
    """안정적인 크롤링 함수"""
    for attempt in range(max_retries):
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            print(f"  시도 {attempt+1}: {url}")
            res = requests.get(url, headers=headers, timeout=15)
            
            if res.status_code != 200:
                print(f"  HTTP {res.status_code}")
                continue
                
            soup = BeautifulSoup(res.text, "html.parser")
            
            # 더 정확한 텍스트 추출
            paragraphs = soup.find_all(['p', 'div'], class_=lambda x: x != 'navigation' and x != 'header')
            texts = []
            
            for p in paragraphs:
                text = p.get_text(" ", strip=True)
                if len(text) > 30:  # 짧은 텍스트 제외
                    texts.append(text)
            
            # 문장 단위로 분리
            sentences = []
            for text in texts:
                parts = text.split('.')
                for part in parts:
                    clean_part = part.strip()
                    if 20 <= len(clean_part) <= 200:  # 적절한 길이의 문장만
                        sentences.append(clean_part)
            
            print(f"  ✓ {len(sentences)}개 문장 추출")
            return sentences[:30]  # 사이트당 최대 30문장
            
        except Exception as e:
            print(f"  ✗ 오류: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)  # 재시도 전 대기
            continue
    
    return []

def load_existing_memory():
    """기존 메모리 로드"""
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            print(f"기존 파일 로드 실패: {e}")
    return []

def main():
    print(f"[{datetime.now()}] ESP 메모리 수집 시작...")
    
    # 디렉토리 생성
    os.makedirs("docs", exist_ok=True)
    
    # 기존 데이터 로드
    existing = load_existing_memory()
    print(f"기존 메모리: {len(existing)}개 문장")
    
    # 새 데이터 수집
    new_sentences = []
    
    for i, url in enumerate(SOURCES):
        print(f"[{i+1}/{len(SOURCES)}] {url}")
        sentences = fetch_sentences(url)
        new_sentences.extend(sentences)
        time.sleep(1)  # 서버 부하 방지
    
    print(f"새로 수집된 문장: {len(new_sentences)}개")
    
    # 데이터가 없으면 백업 사용
    if len(new_sentences) == 0:
        print("크롤링 실패, 백업 데이터 사용")
        new_sentences = FALLBACK_SENTENCES
    
    # 기존 데이터와 병합
    all_sentences = existing + new_sentences
    
    # 중복 제거 (순서 유지)
    seen = set()
    unique_sentences = []
    for sentence in all_sentences:
        if sentence not in seen and len(sentence.strip()) > 15:
            seen.add(sentence)
            unique_sentences.append(sentence)
    
    # 최신 데이터 우선하여 제한
    if len(unique_sentences) > 50000:
        unique_sentences = unique_sentences[-50000:]  # 최근 5만개만 유지
    
    # 저장
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(unique_sentences, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 완료: {len(unique_sentences)}개 문장 저장")
        print(f"📁 파일: {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"❌ 저장 실패: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
