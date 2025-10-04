/**
 * Grader Service 테스트
 * 서버 채점 로직의 정확성을 보장하기 위한 자체 테스트
 */

import { calculateCorrectSlots, MASTER_CONSTRAINTS, MASTER_SCHEDULE } from '../data/masterData.js';
import { formatGradeResult, grade } from '../services/graderService.js';

describe('Grader Service - 기본 검증', () => {
  test('올바른 정답에 대해 성공을 반환해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const result = grade(correctSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
    expect(result.message).toContain('미션 성공');
  });

  test('빈 배열 제출 시 실패해야 합니다', () => {
    const result = grade([], MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.message).toContain('하나도 제출되지 않았습니다');
  });

  test('null 제출 시 실패해야 합니다', () => {
    const result = grade(null, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('배열이 아닌 데이터 제출 시 실패해야 합니다', () => {
    const result = grade({ day: '월' }, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.message).toContain('배열이어야');
  });
});

describe('Rule #1: 강의 시간 중첩 검증', () => {
  test('강의 시간과 겹치는 알바 시간은 실패해야 합니다', () => {
    const overlappingSlots = [
      { day: '월', start: '10:00', end: '11:00' },
      // 월요일 09:00-12:00 강의와 겹침
    ];
    const result = grade(overlappingSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_OVERLAP');
  });

  test('강의 시간과 겹치지 않는 알바 시간은 통과해야 합니다 (Rule #1만)', () => {
    const nonOverlappingSlots = [
      { day: '월', start: '12:00', end: '14:00' }, // 강의 사이 공강 시간
    ];
    const result = grade(nonOverlappingSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // Rule #1은 통과하지만 Rule #2에서 실패할 수 있음
    expect(result.failedRule).not.toBe('RULE_OVERLAP');
  });
});

describe('Rule #2: 이동 시간 준수 검증', () => {
  test('이동 시간을 고려하지 않은 시간은 실패해야 합니다', () => {
    const noTravelTimeSlots = [
      { day: '월', start: '12:00', end: '14:00' },
      // 12:00에 강의가 끝나므로 12:15부터 가능
    ];
    const result = grade(noTravelTimeSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_TRAVEL_TIME');
    expect(result.details.hint).toContain('12:15');
  });

  test('이동 시간을 올바르게 적용한 시간은 Rule #2를 통과해야 합니다', () => {
    const correctTravelTimeSlots = [{ day: '월', start: '12:15', end: '13:45' }];
    const result = grade(correctTravelTimeSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // Rule #2는 통과 (다른 규칙에서 실패할 수 있음)
    expect(result.failedRule).not.toBe('RULE_TRAVEL_TIME');
  });
});

describe('Rule #3: 최소 근무 시간 검증', () => {
  test('60분 미만의 알바 시간은 실패해야 합니다', () => {
    const shortDurationSlots = [
      { day: '화', start: '15:15', end: '15:45' }, // 30분
    ];
    const result = grade(shortDurationSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_MIN_DURATION');
  });

  test('정확히 60분인 알바 시간은 Rule #3를 통과해야 합니다', () => {
    const exactMinDurationSlots = [
      { day: '수', start: '12:15', end: '13:15' }, // 정확히 60분
    ];
    const result = grade(exactMinDurationSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // Rule #3는 통과
    expect(result.failedRule).not.toBe('RULE_MIN_DURATION');
  });
});

describe('Rule #4: 캠퍼스 활동 시간 검증', () => {
  test('캠퍼스 시간(09:00-18:00) 이전의 알바는 실패해야 합니다', () => {
    const earlySlots = [{ day: '월', start: '08:00', end: '09:00' }];
    const result = grade(earlySlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    // Rule #1, #2에서 먼저 걸릴 수 있으므로 실패만 확인
  });

  test('캠퍼스 시간 이후의 알바는 실패해야 합니다', () => {
    const lateSlots = [{ day: '월', start: '18:00', end: '19:00' }];
    const result = grade(lateSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    // Rule #1, #2에서 먼저 걸릴 수 있으므로 실패만 확인
  });
});

describe('Rule #5: 완전성 검증', () => {
  test('일부 시간대를 누락한 경우 실패해야 합니다', () => {
    const incompleteSlots = [
      { day: '월', start: '12:15', end: '13:45' }, // 다른 요일 시간대 누락
    ];
    const result = grade(incompleteSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_INCOMPLETE');
    expect(result.details.missing.length).toBeGreaterThan(0);
  });

  test('불필요한 시간대가 포함된 경우 실패해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const extraSlots = [
      ...correctSlots,
      { day: '화', start: '15:15', end: '15:45' },
      // 30분 (불가능한 시간)
    ];
    const result = grade(extraSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('모든 시간대를 정확히 찾은 경우 성공해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const result = grade(correctSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
    expect(result.failedRule).toBeUndefined();
  });
});

describe('formatGradeResult - 결과 포맷팅', () => {
  test('성공 결과를 올바르게 포맷팅해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const gradeResult = grade(correctSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const formatted = formatGradeResult(gradeResult);

    expect(formatted.status).toBe('success');
    expect(formatted.title).toContain('✅');
    expect(formatted.score).toBe(100);
  });

  test('실패 결과를 올바르게 포맷팅해야 합니다', () => {
    const incompleteSlots = [{ day: '월', start: '12:15', end: '13:45' }];
    const gradeResult = grade(incompleteSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const formatted = formatGradeResult(gradeResult);

    expect(formatted.status).toBe('failed');
    expect(formatted.title).toContain('❌');
    expect(formatted.score).toBe(0);
    expect(formatted.failedRule).toBeDefined();
  });
});

describe('에지 케이스', () => {
  test('필수 필드(day, start, end)가 없는 슬롯은 실패해야 합니다', () => {
    const invalidSlots = [
      { day: '월', start: '12:15' }, // end 누락
    ];
    const result = grade(invalidSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('잘못된 시간 형식은 실패해야 합니다', () => {
    const invalidTimeSlots = [
      { day: '월', start: '12:15', end: '25:00' }, // 잘못된 시간
    ];
    const result = grade(invalidTimeSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('잘못된 요일은 실패해야 합니다', () => {
    const invalidDaySlots = [{ day: '토', start: '09:00', end: '10:00' }];
    const result = grade(invalidDaySlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('순서가 뒤바뀐 정답도 정답으로 인정해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const shuffledSlots = [...correctSlots].reverse();
    const result = grade(shuffledSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
  });
});
