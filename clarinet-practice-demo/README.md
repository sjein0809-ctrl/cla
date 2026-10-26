# 악기 연습 (데모 버전)

원본(`clarinet-practice`)에서 "악보 사진 찍기" 기능만 뺀 버전이에요. 서버가 전혀 필요 없는 **순수 정적 웹앱**이라, 컴퓨터 없이도 어디서나 항상 작동해요.

- 직접 음표 입력해서 연습
- 랜덤 음 8개로 즉석 연습
- 마이크로 실시간 정답/오답 판정 + 정확도 계산
- 한국어 / English / 中文
- 클라리넷(Bb/A/Eb/C), 바이올린, 첼로, 오보에, 플룻

## 로컬에서 확인하기

```bash
cd clarinet-practice-demo
python3 -m http.server 5500
```

브라우저에서 `http://localhost:5500` 열기.

## 영구 배포하기 (컴퓨터 꺼도 계속 작동)

1. [cloudflare.com/drop](https://cloudflare.com/drop)에서 이 폴더(`clarinet-practice-demo`) 전체를 드래그 앤 드롭
2. 생기는 링크를 그대로 써도 되고, "Claim" 버튼으로 무료 계정에 등록하면 영구 보존돼요

서버가 없어서 백엔드 관련 설정(주소 입력 등)이 전혀 필요 없어요 — 폴더만 올리면 끝이에요.
