/**
 * 마스터 데이터 정의
 * 참가자에게 제공되는 기본 데이터와 채점 기준
 */

/**
 * 주간 강의 시간표 (MASTER_SCHEDULE)
 * 각 강의는 요일(day), 시작시간(start), 종료시간(end)으로 구성
 */
export const MASTER_SCHEDULE = [
  // 월요일
  {day: '월', start: '09:00', end: '12:00'},  // 1-3교시
  {day: '월', start: '14:00', end: '18:00'},  // 5-8교시

  // 화요일
  {day: '화', start: '09:00', end: '11:00'},  // 1-2교시
  {day: '화', start: '13:00', end: '15:00'},  // 4-5교시
  {day: '화', start: '16:00', end: '18:00'},  // 7-8교시

  // 수요일
  {day: '수', start: '10:00', end: '12:00'},  // 2-3교시
  {day: '수', start: '14:00', end: '16:00'},  // 5-6교시

  // 목요일
  {day: '목', start: '09:00', end: '11:00'},  // 1-2교시
  {day: '목', start: '13:00', end: '15:00'},  // 4-5교시
  {day: '목', start: '16:00', end: '18:00'},  // 7-8교시

  // 금요일
  {day: '금', start: '09:00', end: '12:00'},  // 1-3교시
  {day: '금', start: '15:00', end: '18:00'},  // 6-8교시
];

/**
 * 제약 조건 (MASTER_CONSTRAINTS)
 * 알바 가능 시간 계산을 위한 규칙들
 */
export const MASTER_CONSTRAINTS = {
  // 강의 전후 이동 시간 (분)
  travelTime: 15,

  // 최소 근무 가능 시간 (분)
  // 60분 미만의 공강 시간은 알바 불가
  minWorkableSession: 60,

  // 캠퍼스 활동 시간
  campusHours: {start: '09:00', end: '18:00'},

  // 요일 순서 (정렬용)
  dayOrder: ['월', '화', '수', '목', '금']
};

/**
 * 채점 결과 타입 정의
 */
export const RULE_TYPES = {
  OVERLAP: 'RULE_OVERLAP',            // 강의 시간 중첩
  TRAVEL_TIME: 'RULE_TRAVEL_TIME',    // 이동 시간 미준수
  MIN_DURATION: 'RULE_MIN_DURATION',  // 최소 근무 시간 미달
  CAMPUS_HOURS: 'RULE_CAMPUS_HOURS',  // 캠퍼스 활동 시간 위반
  INCOMPLETE: 'RULE_INCOMPLETE'       // 누락된 시간대 존재
};

/**
 * 정답 자동 계산 함수
 * 강의 시간표와 제약 조건으로부터 올바른 알바 가능 시간을 계산
 */
export function calculateCorrectSlots(
    schedule = MASTER_SCHEDULE, constraints = MASTER_CONSTRAINTS) {
  const slots = [];
  const {campusHours} = constraints;

  for (const day of constraints.dayOrder) {
    const classesOnDay = schedule.filter(cls => cls.day === day)
                             .sort((a, b) => a.start.localeCompare(b.start));

    if (classesOnDay.length === 0) continue;

    // 강의 사이의 공강 시간 찾기
    for (let i = 0; i < classesOnDay.length - 1; i++) {
      const currentClass = classesOnDay[i];
      const nextClass = classesOnDay[i + 1];

      // 이동 시간을 고려한 실제 가능 시간
      const workableStart =
          addMinutes(currentClass.end, constraints.travelTime);
      const workableEnd = addMinutes(nextClass.start, -constraints.travelTime);

      const duration = getMinutesDiff(workableStart, workableEnd);

      // 최소 근무 시간 이상인 경우만 추가
      if (duration >= constraints.minWorkableSession) {
        slots.push({day, start: workableStart, end: workableEnd});
      }
    }

    // 마지막 강의 이후 시간 체크
    const lastClass = classesOnDay[classesOnDay.length - 1];
    const afterClassStart = addMinutes(lastClass.end, constraints.travelTime);
    const afterClassDuration = getMinutesDiff(afterClassStart, campusHours.end);

    if (afterClassDuration >= constraints.minWorkableSession) {
      slots.push({day, start: afterClassStart, end: campusHours.end});
    }
  }

  return slots;
}

// 헬퍼 함수
function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function getMinutesDiff(start, end) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}
