/**
 * 규칙 검증 테스트 함수들
 * 각 함수는 하나의 규칙만 검증하는 단일 책임을 가짐
 */

import {RULE_TYPES} from '../data/masterData.js';
import {addMinutes, areSlotsEqual, getDurationInMinutes, groupByDay, hasOverlap, isValidSlot, isWithinRange,} from '../utils/timeUtils.js';

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
        details: {invalidSlot: slot},
      };
    }

    // 같은 요일의 강의들과 비교
    const classesOnSameDay = masterSchedule.filter(cls => cls.day === slot.day);

    for (const classTime of classesOnSameDay) {
      if (hasOverlap(slot, classTime)) {
        return {
          passed: false,
          message: `제출한 알바 시간 중 일부가 기존 강의 시간과 겹칩니다.`,
          failedRule: RULE_TYPES.OVERLAP,
          details: {
            conflictingSlot: slot,
            conflictingClass: classTime,
            hint: `${slot.day}요일 ${slot.start}-${slot.end}은 강의 '${
                classTime.name}' 시간(${classTime.start}-${
                classTime.end})과 겹칩니다.`,
          },
        };
      }
    }
  }

  return {passed: true};
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
export function test_rule2_adheresToTravelTime(
    slots, masterSchedule, masterConstraints) {
  for (const slot of slots) {
    const classes = masterSchedule.filter(cls => cls.day === slot.day)
                        .sort((a, b) => a.start.localeCompare(b.start));

    for (const cls of classes) {
      const travelTime = getTravelTimeForClass(cls.location, masterConstraints);

      // 강의가 알바보다 먼저 끝나는 경우: 이동 시간 체크
      if (cls.end <= slot.start) {
        const minGap = travelTime;
        const actualGap = getDurationInMinutes(cls.end, slot.start);

        if (actualGap < minGap) {
          return createTravelTimeError(
              slot, cls, travelTime, 'after', classes, masterConstraints);
        }
      }

      // 강의가 알바보다 나중에 시작하는 경우: 이동 시간 체크
      if (cls.start >= slot.end) {
        const minGap = travelTime;
        const actualGap = getDurationInMinutes(slot.end, cls.start);

        if (actualGap < minGap) {
          return createTravelTimeError(
              slot, cls, travelTime, 'before', classes, masterConstraints);
        }
      }
    }
  }

  return {passed: true};
}

/**
 * 건물 위치에 따른 이동 시간 계산
 */
function getTravelTimeForClass(location, constraints) {
  return constraints.adjacentBuildings?.includes(location) ?
      constraints.reducedTravelTime :
      constraints.travelTime;
}

/**
 * 이동 시간 위반 에러 생성
 */
function createTravelTimeError(
    slot, cls, travelTime, direction, allClasses, constraints) {
  const isAdjacent = constraints.adjacentBuildings?.includes(cls.location);

  let message =
      `수업 전후 이동 시간(${travelTime}분)을 정확히 반영하지 않았습니다.`;
  let hint = '';

  if (direction === 'after') {
    // 강의 종료 후 알바 시작 전
    const expectedStart = addMinutes(cls.end, travelTime);
    hint = `${cls.day}요일 강의가 ${cls.end}에 끝나므로, 알바는 최소 ${
        expectedStart}부터 시작해야 합니다. (현재: ${slot.start})`;

    // 연강 체크
    const nextClass = allClasses.find(c => c.start === cls.end);
    if (nextClass) {
      const nextTravelTime =
          getTravelTimeForClass(nextClass.location, constraints);
      const expectedAfterConsecutive =
          addMinutes(nextClass.end, nextTravelTime);
      message = `연강 이후에도 이동 시간(${nextTravelTime}분)이 필요합니다.`;
      hint = `${cls.day}요일 ${cls.start}-${cls.end} 강의 후 연강이 ${
          nextClass.end}까지 이어지므로, 알바는 최소 ${
          expectedAfterConsecutive}부터 시작해야 합니다.`;
    }
  } else {
    // 알바 종료 후 강의 시작 전
    const expectedEnd = addMinutes(cls.start, -travelTime);
    hint = `${cls.day}요일 강의가 ${cls.start}에 시작하므로, 알바는 최대 ${
        expectedEnd}까지만 가능합니다. (현재: ${slot.end})`;

    // 연강 체크
    const prevClass = allClasses.find(c => c.end === cls.start);
    if (prevClass) {
      const prevTravelTime =
          getTravelTimeForClass(prevClass.location, constraints);
      const expectedBeforeConsecutive =
          addMinutes(prevClass.start, -prevTravelTime);
      message = `연강 이전에도 이동 시간(${prevTravelTime}분)이 필요합니다.`;
      hint = `${cls.day}요일 ${
          prevClass.start}부터 연강이 시작되므로, 알바는 최대 ${
          expectedBeforeConsecutive}까지만 가능합니다.`;
    }
  }

  if (isAdjacent) {
    hint += ` 💡 ${cls.location}은 카페 인접 건물이므로 이동시간이 ${
        constraints.reducedTravelTime}분으로 단축됩니다!`;
  }

  return {
    passed: false,
    message,
    failedRule: RULE_TYPES.TRAVEL_TIME,
    details: {
      problematicSlot: slot,
      relatedClass: cls,
      isAdjacentBuilding: isAdjacent,
      requiredTravelTime: travelTime,
      hint,
    },
  };
}

/**
 * Test #3: 최소 근무 시간을 충족하는지 검증
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Object} masterConstraints - 제약 조건 (minWorkableSession 포함)
 * @returns {Object} 검증 결과
 */
export function test_rule3_meetsMinDuration(slots, masterConstraints) {
  const {minWorkableSession} = masterConstraints;

  for (const slot of slots) {
    const duration = getDurationInMinutes(slot.start, slot.end);

    if (duration < minWorkableSession) {
      return {
        passed: false,
        message: `최소 근무 시간(${
            minWorkableSession}분)보다 짧은 시간대가 포함되어 있습니다.`,
        failedRule: RULE_TYPES.MIN_DURATION,
        details: {
          problematicSlot: slot,
          actualDuration: duration,
          requiredDuration: minWorkableSession,
          hint: `${slot.day}요일 ${slot.start}-${slot.end}는 ${
              duration}분으로, 최소 ${minWorkableSession}분 이상이어야 합니다.`,
        },
      };
    }
  }

  return {passed: true};
}

/**
 * Test #4: 캠퍼스 활동 시간 내에 있는지 검증
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Object} masterConstraints - 제약 조건 (campusHours 포함)
 * @returns {Object} 검증 결과
 */
export function test_rule4_withinCampusHours(slots, masterConstraints) {
  const {campusHours} = masterConstraints;

  for (const slot of slots) {
    const startInRange =
        isWithinRange(slot.start, campusHours.start, campusHours.end);
    const endInRange =
        isWithinRange(slot.end, campusHours.start, campusHours.end);

    if (!startInRange || !endInRange) {
      return {
        passed: false,
        message: `캠퍼스 활동 시간(${campusHours.start}~${
            campusHours.end})을 벗어난 시간대가 있습니다.`,
        failedRule: RULE_TYPES.CAMPUS_HOURS,
        details: {
          problematicSlot: slot,
          campusHours: campusHours,
          hint: `${slot.day}요일 ${slot.start}-${
              slot.end}는 캠퍼스 활동 시간을 벗어납니다.`,
        },
      };
    }
  }

  return {passed: true};
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
    return {passed: true};
  }

  // 누락된 시간대 찾기
  const missingSlots = correctSlots.filter(correctSlot => {
    return !slots.some(
        slot => slot.day === correctSlot.day &&
            slot.start === correctSlot.start && slot.end === correctSlot.end);
  });

  // 추가된 (잘못된) 시간대 찾기
  const extraSlots = slots.filter(slot => {
    return !correctSlots.some(
        correctSlot => correctSlot.day === slot.day &&
            correctSlot.start === slot.start && correctSlot.end === slot.end);
  });

  let message = '';
  let hint = '';

  if (missingSlots.length > 0 && extraSlots.length > 0) {
    message =
        '일부 가능한 알바 시간을 놓쳤고, 불가능한 시간대도 포함되어 있습니다.';
    hint = `누락: ${missingSlots.length}개, 불필요: ${extraSlots.length}개`;
  } else if (missingSlots.length > 0) {
    message =
        '몇몇 가능한 알바 시간을 놓친 것 같습니다. 모든 공강 시간을 확인했나요?';
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
