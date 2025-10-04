/**
 * 규칙 검증 테스트 함수들
 * 각 함수는 하나의 규칙만 검증하는 단일 책임을 가짐
 */

import { RULE_TYPES } from '../data/masterData.js';
import {
  addMinutes,
  areSlotsEqual,
  getDurationInMinutes,
  groupByDay,
  hasOverlap,
  isValidSlot,
  isWithinRange,
} from '../utils/timeUtils.js';

/**
 * Test #1: 기존 강의 시간과 겹치지 않는지 검증
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Array} masterSchedule - 기존 강의 시간표
 * @returns {Object} { passed: boolean, message?: string, failedRule?: string,
 *     details?: Object }
 */
export function test_rule1_noOverlapWithClasses(slots, masterSchedule) {
  for (const slot of slots) {
    // 형식 검증
    if (!isValidSlot(slot)) {
      return {
        passed: false,
        message: '제출한 시간대의 형식이 올바르지 않습니다.',
        failedRule: RULE_TYPES.OVERLAP,
        details: { invalidSlot: slot },
      };
    }

    // 같은 요일의 강의들과 비교
    const classesOnSameDay = masterSchedule.filter(cls => cls.day === slot.day);

    for (const classTime of classesOnSameDay) {
      if (hasOverlap(slot, classTime)) {
        // 연강인지 확인 (같은 날의 다른 강의가 바로 연결되는 경우)
        const consecutiveClass = classesOnSameDay.find(
          cls => cls.end === classTime.start || cls.start === classTime.end
        );

        let message = `제출한 알바 시간 중 일부가 기존 강의 시간과 겹칩니다.`;
        let hint = `${slot.day}요일 ${slot.start}-${slot.end}은 강의 시간(${classTime.start}-${classTime.end})과 겹칩니다.`;

        if (consecutiveClass) {
          message = `연강 시간에는 알바를 할 수 없습니다.`;
          hint = `${slot.day}요일 ${classTime.start}-${classTime.end} 강의는 다른 강의와 연결되어 있어 쉬는 시간이 없습니다.`;
        }

        return {
          passed: false,
          message,
          failedRule: RULE_TYPES.OVERLAP,
          details: {
            conflictingSlot: slot,
            conflictingClass: classTime,
            isConsecutive: !!consecutiveClass,
            hint,
          },
        };
      }
    }
  }

  return { passed: true };
}

/**
 * Test #2: 이동 시간을 준수했는지 검증
 *
 * 규칙:
 * - 강의 종료 후 알바 시작까지 최소 travelTime(15분) 필요
 * - 알바 종료 후 강의 시작까지 최소 travelTime(15분) 필요
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Array} masterSchedule - 기존 강의 시간표
 * @param {Object} masterConstraints - 제약 조건 (travelTime 포함)
 * @returns {Object} 검증 결과
 */
export function test_rule2_adheresToTravelTime(slots, masterSchedule, masterConstraints) {
  const { travelTime, adjacentBuildings, reducedTravelTime } = masterConstraints;

  for (const slot of slots) {
    const classesOnSameDay = masterSchedule
      .filter(cls => cls.day === slot.day)
      .sort((a, b) => a.start.localeCompare(b.start));

    for (const classTime of classesOnSameDay) {
      // 강의가 알바보다 먼저 끝나는 경우
      if (classTime.end <= slot.start) {
        // 🎁 Rule #6: 인접 건물 보너스 체크
        const isAdjacentBuilding =
          adjacentBuildings && adjacentBuildings.includes(classTime.location);
        const requiredTravelTime = isAdjacentBuilding ? reducedTravelTime : travelTime;

        const expectedMinStart = addMinutes(classTime.end, requiredTravelTime);

        if (slot.start < expectedMinStart) {
          // 연강인지 확인
          const nextConsecutiveClass = classesOnSameDay.find(cls => cls.start === classTime.end);

          let message = `수업 전후 이동 시간(${requiredTravelTime}분)을 정확히 반영하지 않았습니다.`;
          let hint = `${classTime.day}요일 강의가 ${classTime.end}에 끝나므로, 알바는 최소 ${expectedMinStart}부터 시작해야 합니다. (현재: ${slot.start})`;

          if (isAdjacentBuilding) {
            hint += ` 💡 ${classTime.location}은 카페 인접 건물이므로 이동시간이 ${reducedTravelTime}분으로 단축됩니다!`;
          }

          if (nextConsecutiveClass) {
            const nextRequiredTime = adjacentBuildings?.includes(nextConsecutiveClass.location)
              ? reducedTravelTime
              : travelTime;
            message = `연강 이후에도 이동 시간(${nextRequiredTime}분)이 필요합니다.`;
            hint = `${classTime.day}요일 ${classTime.start}-${classTime.end} 강의 후 연강이 ${nextConsecutiveClass.end}까지 이어지므로, 알바는 최소 ${addMinutes(
              nextConsecutiveClass.end,
              nextRequiredTime
            )}부터 시작해야 합니다.`;
          }

          return {
            passed: false,
            message,
            failedRule: RULE_TYPES.TRAVEL_TIME,
            details: {
              problematicSlot: slot,
              previousClass: classTime,
              hasConsecutiveClass: !!nextConsecutiveClass,
              isAdjacentBuilding,
              requiredTravelTime,
              hint,
            },
          };
        }
      }

      // 강의가 알바보다 나중에 시작하는 경우
      if (classTime.start >= slot.end) {
        // 🎁 Rule #6: 다음 강의가 인접 건물인지 체크
        const isNextAdjacent = adjacentBuildings && adjacentBuildings.includes(classTime.location);
        const requiredEndTravelTime = isNextAdjacent ? reducedTravelTime : travelTime;
        const expectedMaxEnd = addMinutes(classTime.start, -requiredEndTravelTime);

        if (slot.end > expectedMaxEnd) {
          // 이전 연강 확인
          const prevConsecutiveClass = classesOnSameDay.find(cls => cls.end === classTime.start);

          let message = `수업 전후 이동 시간(${requiredEndTravelTime}분)을 정확히 반영하지 않았습니다.`;
          let hint = `${classTime.day}요일 강의가 ${classTime.start}에 시작하므로, 알바는 최대 ${expectedMaxEnd}까지만 가능합니다. (현재: ${slot.end})`;

          if (isNextAdjacent) {
            hint += ` 💡 ${classTime.location}은 카페 인접 건물이므로 이동시간이 ${reducedTravelTime}분으로 단축됩니다!`;
          }

          if (prevConsecutiveClass) {
            const prevRequiredTime = adjacentBuildings?.includes(prevConsecutiveClass.location)
              ? reducedTravelTime
              : travelTime;
            message = `연강 이전에도 이동 시간(${prevRequiredTime}분)이 필요합니다.`;
            hint = `${classTime.day}요일 ${prevConsecutiveClass.start}부터 연강이 시작되므로, 알바는 최대 ${addMinutes(
              prevConsecutiveClass.start,
              -prevRequiredTime
            )}까지만 가능합니다.`;
          }

          return {
            passed: false,
            message,
            failedRule: RULE_TYPES.TRAVEL_TIME,
            details: {
              problematicSlot: slot,
              nextClass: classTime,
              hasConsecutiveClass: !!prevConsecutiveClass,
              isNextAdjacent,
              requiredEndTravelTime,
              hint,
            },
          };
        }
      }
    }
  }

  return { passed: true };
}

/**
 * Test #3: 최소 근무 시간을 충족하는지 검증
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Object} masterConstraints - 제약 조건 (minWorkableSession 포함)
 * @returns {Object} 검증 결과
 */
export function test_rule3_meetsMinDuration(slots, masterConstraints) {
  const { minWorkableSession } = masterConstraints;

  for (const slot of slots) {
    const duration = getDurationInMinutes(slot.start, slot.end);

    if (duration < minWorkableSession) {
      return {
        passed: false,
        message: `최소 근무 시간(${minWorkableSession}분)보다 짧은 시간대가 포함되어 있습니다.`,
        failedRule: RULE_TYPES.MIN_DURATION,
        details: {
          problematicSlot: slot,
          actualDuration: duration,
          requiredDuration: minWorkableSession,
          hint: `${slot.day}요일 ${slot.start}-${slot.end}는 ${
            duration
          }분으로, 최소 ${minWorkableSession}분 이상이어야 합니다.`,
        },
      };
    }
  }

  return { passed: true };
}

/**
 * Test #4: 캠퍼스 활동 시간 내에 있는지 검증
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Object} masterConstraints - 제약 조건 (campusHours 포함)
 * @returns {Object} 검증 결과
 */
export function test_rule4_withinCampusHours(slots, masterConstraints) {
  const { campusHours } = masterConstraints;

  for (const slot of slots) {
    const startInRange = isWithinRange(slot.start, campusHours.start, campusHours.end);
    const endInRange = isWithinRange(slot.end, campusHours.start, campusHours.end);

    if (!startInRange || !endInRange) {
      return {
        passed: false,
        message: `캠퍼스 활동 시간(${campusHours.start}~${
          campusHours.end
        })을 벗어난 시간대가 있습니다.`,
        failedRule: RULE_TYPES.CAMPUS_HOURS,
        details: {
          problematicSlot: slot,
          campusHours: campusHours,
          hint: `${slot.day}요일 ${slot.start}-${slot.end}는 캠퍼스 활동 시간을 벗어납니다.`,
        },
      };
    }
  }

  return { passed: true };
}

/**
 * Test #5: 완전성 검증 (모든 가능한 시간대를 찾았는지)
 *
 * 앞선 4개의 테스트를 모두 통과했다면, 서버가 계산한 정답과 비교하여
 * 누락된 시간대가 없는지 확인합니다.
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Array} correctSlots - 서버가 계산한 정답 시간대 배열
 * @returns {Object} 검증 결과
 */
export function test_rule5_isComplete(slots, correctSlots) {
  // 정확히 일치하는지 확인
  if (areSlotsEqual(slots, correctSlots)) {
    return { passed: true };
  }

  // 누락된 시간대 찾기
  const missingSlots = correctSlots.filter(correctSlot => {
    return !slots.some(
      slot =>
        slot.day === correctSlot.day &&
        slot.start === correctSlot.start &&
        slot.end === correctSlot.end
    );
  });

  // 추가된 (잘못된) 시간대 찾기
  const extraSlots = slots.filter(slot => {
    return !correctSlots.some(
      correctSlot =>
        correctSlot.day === slot.day &&
        correctSlot.start === slot.start &&
        correctSlot.end === slot.end
    );
  });

  let message = '';
  let hint = '';

  if (missingSlots.length > 0 && extraSlots.length > 0) {
    message = '일부 가능한 알바 시간을 놓쳤고, 불가능한 시간대도 포함되어 있습니다.';
    hint = `누락: ${missingSlots.length}개, 불필요: ${extraSlots.length}개`;
  } else if (missingSlots.length > 0) {
    message = '몇몇 가능한 알바 시간을 놓친 것 같습니다. 모든 공강 시간을 확인했나요?';
    hint = `${missingSlots.length}개의 시간대가 누락되었습니다.`;
  } else if (extraSlots.length > 0) {
    message = '불필요한 시간대가 포함되어 있습니다.';
    hint = `${extraSlots.length}개의 불필요한 시간대가 있습니다.`;
  }

  return {
    passed: false,
    message,
    failedRule: RULE_TYPES.INCOMPLETE,
    details: {
      submitted: slots.length,
      expected: correctSlots.length,
      missing: missingSlots,
      extra: extraSlots,
      hint,
    },
  };
}
