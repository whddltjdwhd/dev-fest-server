/**
 * 다양한 실패 케이스를 테스트하는 스크립트
 * 각 규칙별로 의도적으로 틀린 코드를 제출합니다
 */

const API_URL = 'http://localhost:3000/api/execute-and-validate';

// 색상 출력용
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

async function testCode(testName, code, expectedRule) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}🧪 테스트: ${testName}${colors.reset}`);
  if (expectedRule) {
    console.log(`${colors.yellow}📋 예상 실패 규칙: ${expectedRule}${colors.reset}`);
  }
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();

    if (!result.success) {
      const isExpected = !expectedRule || result.failedRule === expectedRule;
      const statusColor = isExpected ? colors.green : colors.red;
      const statusIcon = isExpected ? '✅' : '❌';

      console.log(`\n${statusColor}${statusIcon} 실패 감지 성공!${colors.reset}`);
      console.log(`   실패 규칙: ${colors.yellow}${result.failedRule}${colors.reset}`);
      console.log(`   메시지: ${result.message}`);

      if (result.details && result.details.hint) {
        console.log(`   힌트: ${colors.blue}${result.details.hint}${colors.reset}`);
      }

      if (!isExpected) {
        console.log(`\n${colors.red}⚠️  예상한 규칙(${expectedRule})과 다릅니다!${colors.reset}`);
      }
    } else {
      if (expectedRule) {
        console.log(
          `\n${colors.red}❌ 테스트 실패: 통과하면 안되는 코드가 통과했습니다!${colors.reset}`
        );
      } else {
        console.log(`\n${colors.green}✅ 성공!${colors.reset}`);
        console.log(`   메시지: ${result.message}`);
        if (result.details) {
          console.log(`   슬롯 수: ${colors.yellow}${result.details.totalSlots}${colors.reset}`);
        }
      }
    }
  } catch (error) {
    console.log(`\n${colors.red}❌ 요청 오류: ${error.message}${colors.reset}`);
  }
}

// ============================================
// 테스트 케이스 1: 강의 시간과 겹침 (RULE_OVERLAP)
// ============================================
const testCase1 = `
export function findWorkableSlots(schedule, constraints) {
  // 의도적으로 강의 시간과 겹치는 시간을 반환
  return [
    { day: '월', start: '11:00', end: '12:00' }  // 선형대수학(09:00-12:00)과 겹침
  ];
}
`;

// ============================================
// 테스트 케이스 2: 이동 시간 미준수 (RULE_TRAVEL_TIME)
// ============================================
const testCase2 = `
export function findWorkableSlots(schedule, constraints) {
  // 강의 종료 직후 이동 시간 없이 알바 시작
  return [
    { day: '화', start: '11:00', end: '12:45' }  // 화요일 11:00 강의 종료 → 15분 이동시간 필요
  ];
}
`;

// ============================================
// 테스트 케이스 3: 최소 근무 시간 미달 (RULE_MIN_DURATION)
// ============================================
const testCase3 = `
export function findWorkableSlots(schedule, constraints) {
  // 60분 미만의 짧은 근무 시간
  return [
    { day: '화', start: '11:15', end: '12:00' }  // 45분 (최소 60분 필요)
  ];
}
`;

// ============================================
// 테스트 케이스 4: 캠퍼스 활동 시간 위반 (RULE_CAMPUS_HOURS)
// ============================================
const testCase4 = `
export function findWorkableSlots(schedule, constraints) {
  // 캠퍼스 운영 시간(09:00-18:00) 벗어남
  return [
    { day: '금', start: '18:15', end: '19:15' }  // 18:00 이후 종료 (금요일 마지막 강의 12:00 종료)
  ];
}
`;

// ============================================
// 테스트 케이스 5: 불완전 (일부 누락) (RULE_INCOMPLETE)
// ============================================
const testCase5 = `
export function findWorkableSlots(schedule, constraints) {
  // 화요일만 찾고 다른 요일 누락
  return [
    { day: '화', start: '11:15', end: '12:45' }
    // 수, 목, 금 누락
  ];
}
`;

// ============================================
// 테스트 케이스 10: 연강 사이 이동시간 부족 (실제로는 RULE_TRAVEL_TIME)
// ============================================
const testCase10 = `
export function findWorkableSlots(schedule, constraints) {
  // 화요일 09:00-11:00(자료구조) 종료 후
  // 이동시간 없이 바로 11:00에 시작 (11:15부터 가능)
  return [
    { day: '화', start: '11:00', end: '12:15' }  // 이동시간 미준수
  ];
}
`;

// ============================================
// 테스트 케이스 11: 연강과 겹치는 시간 (RULE_OVERLAP)
// ============================================
const testCase11 = `
export function findWorkableSlots(schedule, constraints) {
  // 월요일 연강(12:00-15:30 비판적사고와토론)과 겹치는 시간
  // 주의: 월요일은 14:00-18:00 컴퓨터구조론도 있어 복잡함
  return [
    { day: '월', start: '15:30', end: '16:30' }  // 컴퓨터구조론(14:00-18:00)과 겹침
  ];
}
`;

// ============================================
// 테스트 케이스 12: 이동 시간 미준수 (일반 건물)
// ============================================
const testCase12 = `
export function findWorkableSlots(schedule, constraints) {
  // 목요일 컴퓨터네트워크(09:00-11:00, 과학관 = 일반 건물) 후 이동 시간 부족
  // 11:00 종료 후 15분 이동 필요 → 11:15부터 가능
  return [
    { day: '목', start: '11:05', end: '12:05' }  // 11:15부터 가능한데 11:05에 시작
  ];
}
`;

// ============================================
// 테스트 케이스 13: Rule #6 인접 건물 보너스 미활용 (RULE_INCOMPLETE)
// ============================================
const testCase13 = `
export function findWorkableSlots(schedule, constraints) {
  // 화요일 자료구조(11:00 종료, 정보문화관 = 인접건물)
  // 인접건물이므로 11:05부터 가능한데, 일반 15분을 적용해서 11:15부터 시작
  // 결과적으로 11:05-11:15 구간을 놓침 → RULE_INCOMPLETE
  return [
    { day: '화', start: '11:15', end: '12:45' },  // 11:05부터 가능한데 놓침 (인접 건물 보너스 미활용)
    { day: '수', start: '12:15', end: '13:45' },
    { day: '목', start: '11:15', end: '12:45' }
  ];
}
`;

// ============================================
// 테스트 케이스 6: 정답 코드 (모든 테스트 통과)
// ============================================
const testCase6 = `
export function findWorkableSlots(schedule, constraints) {
  const { travelTime, minWorkableSession, campusHours, adjacentBuildings, reducedTravelTime } = constraints;
  const slots = [];
  
  // 요일별로 그룹화
  const dayGroups = {};
  schedule.forEach(cls => {
    if (!dayGroups[cls.day]) dayGroups[cls.day] = [];
    dayGroups[cls.day].push(cls);
  });
  
  // 각 요일별로 처리
  ['월', '화', '수', '목', '금'].forEach(day => {
    const classes = (dayGroups[day] || []).sort((a, b) => 
      a.start.localeCompare(b.start)
    );
    
    // 강의 사이 공강 시간 찾기
    for (let i = 0; i < classes.length - 1; i++) {
      const current = classes[i];
      const next = classes[i + 1];
      
      // Rule #6: 인접 건물 보너스 적용
      const isCurrentAdjacent = adjacentBuildings?.includes(current.location);
      const isNextAdjacent = adjacentBuildings?.includes(next.location);
      const startTravel = isCurrentAdjacent ? reducedTravelTime : travelTime;
      const endTravel = isNextAdjacent ? reducedTravelTime : travelTime;
      
      // 이동 시간 적용
      const possibleStart = addMinutes(current.end, startTravel);
      const possibleEnd = addMinutes(next.start, -endTravel);
      
      // 최소 근무 시간 확인
      const duration = getMinutesDiff(possibleStart, possibleEnd);
      if (duration >= minWorkableSession) {
        slots.push({ day, start: possibleStart, end: possibleEnd });
      }
    }
    
    // 마지막 강의 후 시간 체크
    if (classes.length > 0) {
      const lastClass = classes[classes.length - 1];
      const isLastAdjacent = adjacentBuildings?.includes(lastClass.location);
      const lastTravel = isLastAdjacent ? reducedTravelTime : travelTime;
      const possibleStart = addMinutes(lastClass.end, lastTravel);
      const duration = getMinutesDiff(possibleStart, campusHours.end);
      
      if (duration >= minWorkableSession) {
        slots.push({ day, start: possibleStart, end: campusHours.end });
      }
    }
  });
  
  return slots;
}

// 헬퍼 함수들
function addMinutes(time, minutes) {
  const [hours, mins] = time.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return \`\${String(newHours).padStart(2, '0')}:\${String(newMins).padStart(2, '0')}\`;
}

function getMinutesDiff(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
`;

// ============================================
// 테스트 케이스 7: 실행 오류 (문법 오류)
// ============================================
const testCase7 = `
export function findWorkableSlots(schedule, constraints) {
  return [
    { day: '월', start: '12:15', end: '13:45' }  // 닫는 괄호 누락
`;

// ============================================
// 테스트 케이스 8: 타임아웃 (무한 루프)
// ============================================
const testCase8 = `
export function findWorkableSlots(schedule, constraints) {
  while (true) {
    // 무한 루프
  }
  return [];
}
`;

// ============================================
// 테스트 케이스 9: 보안 위반 (require 사용)
// ============================================
const testCase9 = `
export function findWorkableSlots(schedule, constraints) {
  const fs = require('fs');  // 금지된 패턴
  return [];
}
`;

// ============================================
// 테스트 실행
// ============================================
async function runAllTests() {
  console.log(`${colors.green}
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           🧪 규칙 검증 테스트 스위트 실행                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  await testCode('❌ Rule #1: 강의 시간 중첩', testCase1, 'RULE_OVERLAP');
  await testCode('❌ Rule #2: 이동 시간 미준수', testCase2, 'RULE_TRAVEL_TIME');
  await testCode('❌ Rule #3: 최소 근무 시간 미달', testCase3, 'RULE_MIN_DURATION');
  await testCode('❌ Rule #4: 캠퍼스 시간 위반', testCase4, 'RULE_CAMPUS_HOURS');
  await testCode('❌ Rule #5: 불완전한 답안', testCase5, 'RULE_INCOMPLETE');
  await testCode('✅ 정답 코드 (모든 규칙 통과)', testCase6, null);
  await testCode('❌ 문법 오류', testCase7, 'EXECUTION_ERROR');
  await testCode('❌ 타임아웃 (무한루프)', testCase8, 'TIMEOUT');
  await testCode('❌ 보안 위반 (require)', testCase9, 'SECURITY_VIOLATION');
  await testCode('❌ 이동시간 부족 - 월요일 (Rule #2)', testCase10, 'RULE_TRAVEL_TIME');
  await testCode('❌ 연강과 겹치는 시간 (Rule #1)', testCase11, 'RULE_OVERLAP');
  await testCode('❌ 이동 시간 부족 (Rule #2)', testCase12, 'RULE_TRAVEL_TIME');
  await testCode('❌ Rule #6: 인접 건물 보너스 미활용', testCase13, 'RULE_INCOMPLETE');

  console.log(`\n${colors.green}
╔════════════════════════════════════════════════════════════════╗
║                    ✅ 모든 테스트 완료!                         ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);
}

// 실행
runAllTests().catch(console.error);
