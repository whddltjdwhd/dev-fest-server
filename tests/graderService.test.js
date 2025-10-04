/**
 * Grader Service 테스트
 * 서버 채점 로직의 정확성을 보장하기 위한 자체 테스트
 * masterData 변경에 유연하게 대응하는 동적 테스트
 */

import { grade, formatGradeResult } from '../services/graderService.js';
import { MASTER_SCHEDULE, MASTER_CONSTRAINTS, calculateCorrectSlots } from '../data/masterData.js';
import { addMinutes, getDurationInMinutes } from '../utils/timeUtils.js';

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
    // 첫 번째 강의의 중간 시간을 선택
    const firstClass = MASTER_SCHEDULE[0];
    const overlappingSlots = [
      {
        day: firstClass.day,
        start: addMinutes(firstClass.start, 30),
        end: addMinutes(firstClass.start, 90),
      },
    ];
    const result = grade(overlappingSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_OVERLAP');
  });

  test('강의 시간과 겹치지 않는 알바 시간은 통과해야 합니다 (Rule #1만)', () => {
    // 화요일 자료구조(09:00-11:00) 후 이동 시간 포함한 슬롯 (다음 강의는 13:00부터)
    const tuesdayClass = MASTER_SCHEDULE.find(
      cls => cls.day === '화' && cls.start === '09:00' && cls.end === '11:00'
    );
    const start = addMinutes(tuesdayClass.end, MASTER_CONSTRAINTS.travelTime);
    const nonOverlappingSlots = [
      {
        day: tuesdayClass.day,
        start: start,
        end: addMinutes(start, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(nonOverlappingSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // Rule #1은 통과 (overlap 없음)
    expect(result.failedRule).not.toBe('RULE_OVERLAP');
  });
});

describe('Rule #2: 이동 시간 준수 검증', () => {
  test('이동 시간을 고려하지 않은 시간은 실패해야 합니다 (일반 건물)', () => {
    // 목요일 컴퓨터네트워크 (09:00-11:00, 과학관 = 인접 건물 아님)
    const normalBuilding = MASTER_SCHEDULE.find(
      cls => cls.day === '목' && cls.start === '09:00' && cls.end === '11:00'
    );

    expect(normalBuilding).toBeDefined();

    const insufficientStart = addMinutes(normalBuilding.end, 5); // 5분만 대기 (15분 필요)
    const noTravelTimeSlots = [
      {
        day: normalBuilding.day,
        start: insufficientStart,
        end: addMinutes(insufficientStart, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(noTravelTimeSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_TRAVEL_TIME');
  });

  test('이동 시간을 올바르게 적용한 시간은 Rule #2를 통과해야 합니다', () => {
    // 첫 번째 강의 후 이동 시간 적용
    const firstClass = MASTER_SCHEDULE[0];
    const correctStart = addMinutes(firstClass.end, MASTER_CONSTRAINTS.travelTime);
    const correctTravelTimeSlots = [
      {
        day: firstClass.day,
        start: correctStart,
        end: addMinutes(correctStart, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(correctTravelTimeSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // Rule #2는 통과 (다른 규칙에서 실패할 수 있음)
    expect(result.failedRule).not.toBe('RULE_TRAVEL_TIME');
  });

  test('인접 건물에서는 5분 이동시간만 필요합니다', () => {
    // 화요일 자료구조 (정보문화관 P407 - 인접 건물)
    const adjacentBuilding = MASTER_SCHEDULE.find(
      cls => cls.day === '화' && cls.location === '정보문화관 P407'
    );

    expect(adjacentBuilding).toBeDefined();

    const reducedTravelStart = addMinutes(
      adjacentBuilding.end,
      MASTER_CONSTRAINTS.reducedTravelTime
    ); // 5분만 대기
    const adjacentSlots = [
      {
        day: adjacentBuilding.day,
        start: reducedTravelStart,
        end: addMinutes(reducedTravelStart, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(adjacentSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // Rule #2는 통과해야 함 (인접 건물 보너스)
    expect(result.failedRule).not.toBe('RULE_TRAVEL_TIME');
  });

  test('인접 건물이 아닌 경우 15분 이동시간이 필요합니다', () => {
    // 월요일 프로그래밍기초 (공학관 강의실 - 인접 건물 아님)
    const nonAdjacentBuilding = MASTER_SCHEDULE.find(
      cls => cls.day === '월' && cls.location === '공학관 강의실'
    );

    expect(nonAdjacentBuilding).toBeDefined();

    const insufficientStart = addMinutes(
      nonAdjacentBuilding.end,
      MASTER_CONSTRAINTS.reducedTravelTime
    ); // 5분만 대기
    const nonAdjacentSlots = [
      {
        day: nonAdjacentBuilding.day,
        start: insufficientStart,
        end: addMinutes(insufficientStart, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(nonAdjacentSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_TRAVEL_TIME');
  });

  test('같은 날 인접 건물과 일반 건물이 섞여 있어도 정확히 판단합니다', () => {
    // 화요일: 자료구조 (정보문화관, 인접) 09:00-11:00, 알고리즘 (과학관, 일반) 13:00-15:00
    const adjacentClass = MASTER_SCHEDULE.find(
      cls => cls.day === '화' && cls.location === '정보문화관 P407'
    );
    const normalClass = MASTER_SCHEDULE.find(
      cls => cls.day === '화' && cls.location === '과학관 실험실'
    );

    expect(adjacentClass).toBeDefined();
    expect(normalClass).toBeDefined();

    const mixedSlots = [
      {
        day: '화',
        start: addMinutes(adjacentClass.end, MASTER_CONSTRAINTS.reducedTravelTime), // 11:05
        end: addMinutes(adjacentClass.end, MASTER_CONSTRAINTS.reducedTravelTime + 100), // 12:45
      },
      {
        day: '화',
        start: addMinutes(normalClass.end, MASTER_CONSTRAINTS.travelTime), // 15:15
        end: addMinutes(normalClass.end, MASTER_CONSTRAINTS.travelTime + 60), // 16:15
      },
    ];
    const result = grade(mixedSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.failedRule).not.toBe('RULE_TRAVEL_TIME');
  });
});

describe('Rule #3: 최소 근무 시간 검증', () => {
  test('60분 미만의 알바 시간은 실패해야 합니다', () => {
    // minWorkableSession보다 짧은 시간 (30분)
    const classWithGap = MASTER_SCHEDULE.find((cls, idx) => {
      const nextClass = MASTER_SCHEDULE[idx + 1];
      return (
        nextClass &&
        cls.day === nextClass.day &&
        getDurationInMinutes(cls.end, nextClass.start) > MASTER_CONSTRAINTS.travelTime + 30
      );
    });

    if (!classWithGap) {
      // fallback: 첫 번째 클래스 사용
      const firstClass = MASTER_SCHEDULE[0];
      const start = addMinutes(firstClass.end, MASTER_CONSTRAINTS.travelTime);
      const shortDurationSlots = [
        {
          day: firstClass.day,
          start: start,
          end: addMinutes(start, 30), // 30분만
        },
      ];
      const result = grade(shortDurationSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
      expect(result.success).toBe(false);
      expect(result.failedRule).toBe('RULE_MIN_DURATION');
    } else {
      const start = addMinutes(classWithGap.end, MASTER_CONSTRAINTS.travelTime);
      const shortDurationSlots = [
        {
          day: classWithGap.day,
          start: start,
          end: addMinutes(start, 30), // 30분만
        },
      ];
      const result = grade(shortDurationSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
      expect(result.success).toBe(false);
      expect(result.failedRule).toBe('RULE_MIN_DURATION');
    }
  });

  test('정확히 60분인 알바 시간은 Rule #3를 통과해야 합니다', () => {
    // minWorkableSession 정확히 일치
    const classWithGap = MASTER_SCHEDULE.find((cls, idx) => {
      const nextClass = MASTER_SCHEDULE[idx + 1];
      return (
        nextClass &&
        cls.day === nextClass.day &&
        getDurationInMinutes(cls.end, nextClass.start) >
          MASTER_CONSTRAINTS.travelTime + MASTER_CONSTRAINTS.minWorkableSession
      );
    });

    if (classWithGap) {
      const start = addMinutes(classWithGap.end, MASTER_CONSTRAINTS.travelTime);
      const exactMinDurationSlots = [
        {
          day: classWithGap.day,
          start: start,
          end: addMinutes(start, MASTER_CONSTRAINTS.minWorkableSession),
        },
      ];
      const result = grade(exactMinDurationSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
      // Rule #3는 통과
      expect(result.failedRule).not.toBe('RULE_MIN_DURATION');
    }
  });
});

describe('Rule #4: 캠퍼스 활동 시간 검증', () => {
  test('캠퍼스 시간(09:00-18:00) 이전의 알바는 실패해야 합니다', () => {
    // campusHours.start 이전 시간
    const earlyTime = addMinutes(MASTER_CONSTRAINTS.campusHours.start, -60);
    const earlySlots = [
      {
        day: '월',
        start: earlyTime,
        end: addMinutes(earlyTime, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(earlySlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    // Rule #1, #2에서 먼저 걸릴 수 있으므로 실패만 확인
  });

  test('캠퍼스 시간 이후의 알바는 실패해야 합니다', () => {
    // campusHours.end 이후 시간
    const lateSlots = [
      {
        day: '월',
        start: MASTER_CONSTRAINTS.campusHours.end,
        end: addMinutes(MASTER_CONSTRAINTS.campusHours.end, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(lateSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    // Rule #1, #2에서 먼저 걸릴 수 있으므로 실패만 확인
  });
});

describe('Rule #5: 완전성 검증', () => {
  test('일부 시간대를 누락한 경우 실패해야 합니다', () => {
    // 화요일 자료구조 강의 후 시간대만 제출 (다른 시간대 누락)
    const tuesdayClass = MASTER_SCHEDULE.find(
      cls => cls.day === '화' && cls.start === '09:00' && cls.end === '11:00'
    );

    expect(tuesdayClass).toBeDefined(); // 반드시 찾아야 함

    const start = addMinutes(tuesdayClass.end, MASTER_CONSTRAINTS.travelTime);
    const incompleteSlots = [
      {
        day: tuesdayClass.day,
        start: start,
        end: addMinutes(start, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
    const result = grade(incompleteSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_INCOMPLETE');
    expect(result.details.missing.length).toBeGreaterThan(0);
  });

  test('불필요한 시간대가 포함된 경우 실패해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    // 캠퍼스 활동 시간 외의 불필요한 시간대 추가
    const extraTime = addMinutes(MASTER_CONSTRAINTS.campusHours.end, 60);
    const extraSlots = [
      ...correctSlots,
      {
        day: '월',
        start: extraTime,
        end: addMinutes(extraTime, 30), // 30분 (짧지만 어쨌든 불가능한 시간)
      },
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
    // 불완전한 슬롯으로 실패 케이스 생성 (화요일 자료구조 강의 후)
    const tuesdayClass = MASTER_SCHEDULE.find(
      cls => cls.day === '화' && cls.start === '09:00' && cls.end === '11:00'
    );

    const start = addMinutes(tuesdayClass.end, MASTER_CONSTRAINTS.travelTime);
    const incompleteSlots = [
      {
        day: tuesdayClass.day,
        start: start,
        end: addMinutes(start, MASTER_CONSTRAINTS.minWorkableSession),
      },
    ];
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
    const firstClass = MASTER_SCHEDULE[0];
    const start = addMinutes(firstClass.end, MASTER_CONSTRAINTS.travelTime);
    const invalidSlots = [
      { day: firstClass.day, start: start }, // end 누락
    ];
    const result = grade(invalidSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('잘못된 시간 형식은 실패해야 합니다', () => {
    const firstClass = MASTER_SCHEDULE[0];
    const start = addMinutes(firstClass.end, MASTER_CONSTRAINTS.travelTime);
    const invalidTimeSlots = [
      { day: firstClass.day, start: start, end: '25:00' }, // 잘못된 시간
    ];
    const result = grade(invalidTimeSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('잘못된 요일은 실패해야 합니다', () => {
    const invalidDaySlots = [
      { day: '토', start: MASTER_CONSTRAINTS.campusActiveStart, end: '10:00' },
    ];
    const result = grade(invalidDaySlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
  });

  test('순서가 뒤바뀐 정답도 정답으로 인정해야 합니다', () => {
    const correctSlots = calculateCorrectSlots(MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    const shuffledSlots = [...correctSlots].reverse();
    const result = grade(shuffledSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
  });

  test('연강 사이에는 근무할 수 없습니다', () => {
    // 월요일: 09:00-12:00 (이산수학), 12:00-15:30 (비판적사고와토론) - 연강
    // 연강 사이에 근무 시간을 넣으면 overlap으로 실패해야 함
    const consecutiveClass1 = MASTER_SCHEDULE.find(
      cls => cls.day === '월' && cls.start === '09:00' && cls.end === '12:00'
    );
    const consecutiveClass2 = MASTER_SCHEDULE.find(
      cls => cls.day === '월' && cls.start === '12:00' && cls.end === '15:30'
    );

    if (consecutiveClass1 && consecutiveClass2) {
      // 연강 확인
      expect(consecutiveClass1.end).toBe(consecutiveClass2.start);

      // 연강 사이 시간 (12:00-12:15 등)에 근무 시도
      const betweenConsecutiveSlots = [
        {
          day: '월',
          start: '12:00',
          end: '12:15',
        },
      ];
      const result = grade(betweenConsecutiveSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
      expect(result.success).toBe(false);
      // overlap이거나 travel time 위반으로 실패해야 함
      expect(['RULE_OVERLAP', 'RULE_TRAVEL_TIME']).toContain(result.failedRule);
    }
  });

  test('연강 후에는 이동 시간을 고려해야 합니다', () => {
    // 월요일 연강 후 (15:30 종료) 이동 시간 없이 근무 시도
    const lastConsecutiveClass = MASTER_SCHEDULE.find(
      cls => cls.day === '월' && cls.end === '15:30'
    );

    if (lastConsecutiveClass) {
      // 15:30 종료 후 이동 시간 5분만 대기 (15분 필요)
      const insufficientTravelSlots = [
        {
          day: '월',
          start: '15:35', // 5분만 대기
          end: '16:35', // 60분 근무
        },
      ];
      const result = grade(insufficientTravelSlots, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
      expect(result.success).toBe(false);

      // 월요일 14:00-18:00 강의가 있으므로 overlap이나 travel time 중 하나로 실패
      expect(result.failedRule).toBeDefined();
    }
  });
});
