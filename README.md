# � Handson Server

**사용자 코드를 안전하게 실행하고 채점하는 자동화된 코드 실행 플랫폼**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

## 📋 프로젝트 개요

코딩 테스트 플랫폼(LeetCode, 백준)의 핵심 원리를 구현한 자동 채점 서버입니다. 사용자가 작성한 JavaScript 코드를 **안전한 샌드박스 환경(isolated-vm)**에서 실행하고, 5가지 규칙으로 자동 채점합니다.

### � 주요 특징

- ✅ **안전한 코드 실행**: isolated-vm을 사용한 완전한 V8 격리
- ✅ **4단계 보안 검증**: 포맷 → 위험 패턴 → 샌드박스 → 규칙 검증
- ✅ **자동 채점**: 5가지 규칙 기반 실시간 피드백
- ✅ **RESTful API**: 간단한 HTTP 인터페이스
- ✅ **Docker 지원**: 손쉬운 배포 및 스케일링

## 🚀 빠른 시작

### 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (hot reload)
npm run dev

# 프로덕션 모드
npm start

# 테스트 실행
npm test
```

서버가 http://localhost:3000 에서 실행됩니다.

### Docker로 실행

```bash
# Docker 이미지 빌드
docker build -t handson-server .

# 컨테이너 실행
docker run -p 3000:3000 handson-server
```

## 🏗️ 아키텍처

```
┌─────────────────┐
│  Client Code    │ → POST /api/execute-and-validate
│  (JavaScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│         Grader Service                      │
│  ┌─────────────────────────────────────┐   │
│  │ 1. 코드 형식 검증                   │   │
│  │ 2. 보안 패턴 감지                   │   │
│  │ 3. Sandbox 실행 (isolated-vm)      │   │
│  │ 4. 결과 검증 (5가지 규칙)          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│        Test Suite (Rule Engine)            │
│  ✓ Rule #1: 강의 시간 중첩 검증            │
│  ✓ Rule #2: 이동 시간 준수 검증            │
│  ✓ Rule #3: 최소 근무 시간 검증            │
│  ✓ Rule #4: 캠퍼스 활동 시간 검증          │
│  ✓ Rule #5: 완전성 검증                    │
└─────────────────────────────────────────────┘
```

## 🌐 API 엔드포인트

### 1. 문제 데이터 조회

```bash
GET /api/problem
```

**응답 예시:**

```json
{
  "title": "알바 시간 찾기 미션",
  "schedule": [...],
  "constraints": {...},
  "rules": [...]
}
```

### 2. 코드 실행 및 채점

```bash
POST /api/execute-and-validate
Content-Type: application/json

{
  "code": "export function findWorkableSlots(schedule, constraints) { return []; }"
}
```

**성공 응답:**

```json
{
  "success": true,
  "message": "🎉 미션 성공! 모든 규칙을 완벽하게 통과했습니다.",
  "details": {
    "totalSlots": 6,
    "totalTests": 5,
    "passedCount": 5,
    "failedCount": 0,
    "results": [
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" }
    ]
  }
}
```

**실패 응답 (상세 정보 포함):**

```json
{
  "success": false,
  "message": "채점 실패: 3/5개의 규칙을 통과했습니다.",
  "failedRule": "RULE_TRAVEL_TIME",
  "details": {
    "hint": "수업 전후 이동 시간(15분)을 정확히 반영하지 않았습니다.",
    "totalTests": 5,
    "passedCount": 3,
    "failedCount": 2,
    "results": [
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      {
        "rule": "RULE_TRAVEL_TIME",
        "passed": false,
        "message": "수업 전후 이동 시간(15분)을 정확히 반영하지 않았습니다.",
        "details": {
          "problematicSlot": { "day": "화", "start": "11:00", "end": "12:45" },
          "hint": "화요일 강의가 11:00에 끝나므로, 알바는 최소 11:15부터 시작해야 합니다. (현재: 11:00)"
        }
      },
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      { "rule": "RULE_PASSED", "passed": true, "message": "통과" },
      {
        "rule": "RULE_INCOMPLETE",
        "passed": false,
        "message": "몇몇 가능한 알바 시간을 놓친 것 같습니다. 모든 공강 시간을 확인했나요?",
        "details": {
          "missing": [
            /* 누락된 시간 정보 */
          ]
        }
      }
    ]
  }
}
```

### 3. 헬스 체크

```bash
GET /health
```

## � 보안 아키텍처

### 4단계 방어 체계

1. **포맷 검증**: 코드 구조 및 필수 함수 존재 확인
2. **정적 분석**: 위험 패턴 탐지 (require, eval, process 등)
3. **샌드박스 실행**: isolated-vm으로 완전 격리
   - 메모리 제한: 32MB
   - 실행 시간: 1초
4. **규칙 검증**: 비즈니스 로직 5가지 규칙 검사

### 차단되는 위험 패턴

```javascript
// ❌ 모두 차단됨
require('fs');
import fs from 'fs';
eval('code');
new Function();
process.exit();
child_process.exec();
```

## 📦 Render 배포 가이드

### 1단계: GitHub 푸시

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2단계: Render 대시보드 설정

1. [Render Dashboard](https://dashboard.render.com/) 로그인
2. **New + → Web Service** 클릭
3. GitHub 저장소 연결
4. 설정 입력:
   - **Name**: `handson-server`
   - **Environment**: `Docker`
   - **Region**: `Oregon` 또는 `Singapore`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: `Free`

### 3단계: 자동 배포 완료!

배포 후 생성되는 URL:

```
https://handson-server.onrender.com/api/problem
https://handson-server.onrender.com/api/execute-and-validate
```

## 🧪 배포 확인

```bash
# 헬스 체크
curl https://handson-server.onrender.com/health

# 문제 데이터
curl https://handson-server.onrender.com/api/problem

# 코드 제출
curl -X POST https://handson-server.onrender.com/api/execute-and-validate \
  -H "Content-Type: application/json" \
  -d '{"code": "export function findWorkableSlots() { return []; }"}'
```

## 📁 프로젝트 구조

```
handson-server/
├── server.js                    # Express 서버 (메인)
├── Dockerfile                   # Docker 빌드 설정
├── render.yaml                  # Render 배포 설정
├── package.json
├── routes/                      # API 라우트 핸들러
│   ├── problem.js              # GET /api/problem
│   └── execute-and-validate.js # POST /api/execute-and-validate
├── services/                    # 핵심 로직
│   ├── codeExecutor.js         # isolated-vm 샌드박스 실행
│   ├── graderService.js        # 채점 오케스트레이터
│   └── ruleTests.js            # 5가지 규칙 검증 함수
├── data/
│   └── masterData.js           # 문제 데이터 & 정답 계산
├── utils/
│   └── timeUtils.js            # 시간 유틸리티 함수
└── tests/
    ├── graderService.test.js   # 단위 테스트
    ├── codeExecutor.test.js
    └── integration.test.js
```

## 🔧 기술 스택

| 카테고리       | 기술              |
| -------------- | ----------------- |
| **Runtime**    | Node.js 18+       |
| **Framework**  | Express 4         |
| **Sandbox**    | isolated-vm 5.0.2 |
| **Testing**    | Jest 29           |
| **Deployment** | Render (Docker)   |
| **Container**  | Alpine Linux      |

## 📊 성능 최적화

- ✅ **Multi-stage Build**: 빌드/런타임 분리로 이미지 최소화
- ✅ **Non-root User**: 컨테이너 보안 강화
- ✅ **Health Check**: 자동 장애 감지
- ✅ **CORS 지원**: 프론트엔드 통합 준비 완료

## 🐛 문제 해결

### isolated-vm 빌드 실패

Dockerfile에 빌드 도구가 포함되어 있습니다:

```dockerfile
RUN apk add python3 make g++ gcc musl-dev linux-headers
```

### Render Free Tier Cold Start

15분 미사용 시 슬립 모드:

- 첫 요청: 30초~1분 소요
- 해결: Cron job으로 주기적 핑 (UptimeRobot)

### 메모리 초과

샌드박스 메모리 제한 조정:

```javascript
// services/codeExecutor.js
const isolate = new ivm.Isolate({ memoryLimit: 64 }); // 32 → 64MB
```

## 🧪 테스트

### 단위 테스트

```bash
# 모든 테스트 실행
npm test

# Watch 모드
npm run test:watch

# 커버리지 리포트
npm run test:coverage
```

**현재 테스트 커버리지:**

- ✅ graderService: 21/21 테스트 통과
- ✅ 5가지 규칙 검증 모두 포함
- ✅ 에지 케이스 처리

## 📝 사용 예시

### 클라이언트 코드 (JavaScript)

```javascript
// 문제 데이터 가져오기
const problemResponse = await fetch('https://handson-server.onrender.com/api/problem');
const problem = await problemResponse.json();

console.log(problem.title); // "알바 시간 찾기 미션"
console.log(problem.schedule); // 강의 시간표
console.log(problem.constraints); // 제약 조건

// 사용자 코드 작성
const userCode = `
export function findWorkableSlots(schedule, constraints) {
  const slots = [];
  const { dayOrder, travelTime, minWorkableSession, campusHours } = constraints;
  
  for (const day of dayOrder) {
    const classesOnDay = schedule
      .filter(cls => cls.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));
    
    // 강의 사이 공강 시간 찾기
    for (let i = 0; i < classesOnDay.length - 1; i++) {
      const current = classesOnDay[i];
      const next = classesOnDay[i + 1];
      
      // 이동 시간 고려
      const start = addMinutes(current.end, travelTime);
      const end = addMinutes(next.start, -travelTime);
      
      const duration = getMinutes(start, end);
      
      if (duration >= minWorkableSession) {
        slots.push({ day, start, end });
      }
    }
  }
  
  return slots;
}
`;

// 코드 제출 및 채점
const gradeResponse = await fetch('https://handson-server.onrender.com/api/execute-and-validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: userCode }),
});

const result = await gradeResponse.json();

if (result.success) {
  console.log('✅', result.message);
  console.log('정답 슬롯 수:', result.details.totalSlots);
} else {
  console.log('❌', result.message);
  console.log('실패한 규칙:', result.failedRule);
  console.log('힌트:', result.details.hint);
}
```

## 🎯 5가지 검증 규칙

### Rule #1: 강의 시간 중첩 금지

```javascript
// ❌ 실패
{ day: '월', start: '11:30', end: '12:30' }  // 11:00-13:00 강의와 겹침

// ✅ 통과
{ day: '월', start: '12:15', end: '13:45' }  // 강의 사이 시간
```

### Rule #2: 이동 시간 준수 (15분)

```javascript
// ❌ 실패
{ day: '월', start: '13:00', end: '14:00' }  // 13:00 강의 종료 직후

// ✅ 통과
{ day: '월', start: '13:15', end: '14:45' }  // 15분 이동 시간 고려
```

### Rule #3: 최소 근무 시간 (60분)

```javascript
// ❌ 실패
{ day: '화', start: '12:00', end: '12:45' }  // 45분

// ✅ 통과
{ day: '화', start: '11:15', end: '12:45' }  // 90분
```

### Rule #4: 캠퍼스 활동 시간 (09:00-18:00)

```javascript
// ❌ 실패
{ day: '수', start: '08:00', end: '09:00' }  // 09:00 이전

// ✅ 통과
{ day: '수', start: '12:15', end: '13:45' }  // 범위 내
```

### Rule #5: 완전성 (모든 시간대 찾기)

```javascript
// ❌ 실패 - 일부 누락
[
  { day: '월', start: '12:15', end: '13:45' },
  { day: '화', start: '11:15', end: '12:45' },
  // 나머지 4개 시간대 누락
][
  // ✅ 통과 - 6개 모두 찾음
  ({ day: '월', start: '12:15', end: '13:45' },
  { day: '화', start: '11:15', end: '12:45' },
  { day: '수', start: '12:15', end: '13:45' },
  { day: '수', start: '16:15', end: '18:00' },
  { day: '목', start: '11:15', end: '12:45' },
  { day: '금', start: '12:15', end: '14:45' })
];
```

## 🔐 보안 고려사항

### 허용되는 코드

```javascript
// ✅ 안전한 JavaScript 연산
const arr = [1, 2, 3];
arr.map(x => x * 2);
for (let i = 0; i < 10; i++) {}
```

### 차단되는 코드

```javascript
// ❌ 파일 시스템 접근
require('fs').readFileSync('/etc/passwd');

// ❌ 네트워크 요청
import fetch from 'node-fetch';

// ❌ 프로세스 제어
process.exit(1);

// ❌ 동적 코드 실행
eval('malicious code');

// ❌ 하위 프로세스
child_process.exec('rm -rf /');
```

## 🌟 향후 개선 계획

- [ ] TypeScript 지원
- [ ] Python 코드 실행 지원
- [ ] 실시간 코드 실행 피드백 (WebSocket)
- [ ] 더 다양한 문제 세트
- [ ] 사용자 인증 및 진행도 저장
- [ ] 실행 시간/메모리 통계

## 📄 라이선스

MIT License

## 👥 기여하기

이슈와 풀 리퀘스트를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의: [GitHub Issues](https://github.com/yourusername/handson-server/issues)

---

**🚀 Happy Coding!**

- 메모리 제한 (32MB)
- 위험한 API 접근 차단

### 2. 다층 보안 시스템

```javascript
// 차단되는 패턴
- require()
- import 구문
- eval()
- process 객체
- fs 모듈
- child_process
```

### 3. 체계적인 채점 시스템

5가지 독립적인 테스트 함수가 순차적으로 실행되며, 하나라도 실패하면 즉시 중단됩니다.

## 📁 프로젝트 구조

```
handson-server/
├── data/
│   └── masterData.js           # 강의 시간표, 제약 조건, 정답 데이터
├── services/
│   ├── codeExecutor.js         # 안전한 코드 실행 (isolated-vm)
│   ├── graderService.js        # 채점 로직
│   ├── ruleTests.js            # 5가지 규칙 검증 함수
│   └── answerCalculator.js     # 정답 자동 계산
├── utils/
│   └── timeUtils.js            # 시간 처리 유틸리티
├── netlify/functions/
│   ├── execute-and-validate.js # 코드 실행 및 채점 API
│   ├── validate.js             # 결과물 직접 제출 API
│   └── problem.js              # 문제 데이터 제공 API
├── tests/
│   ├── graderService.test.js   # 채점 로직 테스트
│   ├── codeExecutor.test.js    # 코드 실행 및 보안 테스트
│   └── integration.test.js     # 통합 테스트
└── package.json
```

## 🔧 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 테스트 실행

```bash
# 전체 테스트
npm test

# 특정 테스트 파일
npm test graderService.test.js

# Watch 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

### 3. 로컬 개발

```bash
# Netlify CLI 설치 (전역)
npm install -g netlify-cli

# 로컬 서버 실행
netlify dev
```

## 📡 API 사용법

### 1. POST /execute-and-validate

사용자 코드를 실행하고 채점합니다.

#### 요청

```json
{
  "code": "function findWorkableSlots(schedule, constraints) { /* 로직 */ return []; }"
}
```

#### 성공 응답 (200)

```json
{
  "status": "success",
  "title": "🎉 미션 성공!",
  "message": "🎉 미션 성공! 모든 규칙을 완벽하게 통과했습니다!",
  "score": 100
}
```

#### 실패 응답 (422)

```json
{
  "status": "failed",
  "title": "❌ 테스트 실패",
  "message": "수업 전후 이동 시간(15분)을 정확히 반영하지 않았습니다.",
  "failedRule": "RULE_TRAVEL_TIME",
  "hint": "월요일 강의가 12:00에 끝나므로, 알바는 최소 12:15부터 시작해야 합니다."
}
```

### 2. GET /problem

문제 데이터를 조회합니다.

```bash
curl https://your-domain.netlify.app/.netlify/functions/problem
```

### 3. POST /validate

결과물을 직접 제출합니다 (코드 실행 없이).

```json
{
  "slots": [{ "day": "월", "start": "12:15", "end": "13:45" }]
}
```

## 🎯 문제 설명

### 미션: 알바 가능 시간 찾기

주어진 강의 시간표를 분석하여, 알바가 가능한 모든 시간대를 찾는 `findWorkableSlots` 함수를 구현하세요.

### 입력

- `schedule`: 강의 시간표 배열
- `constraints`: 제약 조건 객체

### 출력

```javascript
[
  { day: '월', start: '12:15', end: '13:45' },
  { day: '화', start: '11:15', end: '12:45' },
  // ...
];
```

### 규칙

1. **강의 시간 중첩 금지**: 알바 시간이 강의와 겹치면 안 됨
2. **이동 시간 준수**: 강의 전후로 15분의 이동 시간 필요
3. **최소 근무 시간**: 알바는 최소 60분 이상
4. **캠퍼스 활동 시간**: 09:00~18:00 내에만 가능
5. **완전성**: 가능한 모든 시간대를 빠짐없이 찾아야 함

## 🛡️ 보안 고려사항

### isolated-vm 선택 이유

- **vm2는 deprecated**: 치명적인 보안 취약점으로 유지보수 중단
- **isolated-vm 장점**:
  - 완전히 독립된 V8 인스턴스
  - 강력한 메모리 격리
  - 정밀한 리소스 제어

### 보안 레이어

1. **형식 검증**: 기본 코드 구조 확인
2. **패턴 감지**: 정규식 기반 위험 코드 탐지
3. **샌드박스 실행**: isolated-vm을 통한 완전 격리
4. **리소스 제한**: 시간/메모리 제한으로 DoS 방지

## 🧪 테스트 커버리지

```bash
npm run test:coverage
```

주요 테스트:

- ✅ 채점 로직 정확성 (20+ 테스트)
- ✅ 보안 패턴 차단 (6+ 테스트)
- ✅ 코드 실행 안정성 (8+ 테스트)
- ✅ 통합 시나리오 (10+ 테스트)

## 📚 참고 자료

### isolated-vm

- [GitHub Repository](https://github.com/laverdet/isolated-vm)
- [API Documentation](https://github.com/laverdet/isolated-vm/blob/main/API.md)

### 코딩 테스트 플랫폼 사례

- LeetCode
- HackerRank
- Programmers

## 🤝 기여

이슈와 PR을 환영합니다!

## 📄 라이센스

MIT License

---

**Made with ❤️ for Hands-on Session**
