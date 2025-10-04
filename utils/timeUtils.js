/**
 * 시간 관련 유틸리티 함수
 * HH:MM 형식의 시간 문자열을 처리하는 헬퍼 함수들
 */

/**
 * "HH:MM" 형식의 시간을 분 단위로 변환
 * @param {string} time - "HH:MM" 형식의 시간 (예: "09:30")
 * @returns {number} 자정(00:00)부터의 분 (예: 570)
 *
 * @example
 * timeToMinutes("09:30") // 570 (9 * 60 + 30)
 * timeToMinutes("14:45") // 885 (14 * 60 + 45)
 */
export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 분을 "HH:MM" 형식의 시간으로 변환
 * @param {number} minutes - 자정부터의 분
 * @returns {string} "HH:MM" 형식의 시간
 *
 * @example
 * minutesToTime(570) // "09:30"
 * minutesToTime(885) // "14:45"
 */
export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 두 시간 사이의 차이를 분으로 계산
 * @param {string} startTime - 시작 시간 ("HH:MM")
 * @param {string} endTime - 종료 시간 ("HH:MM")
 * @returns {number} 시간 차이 (분)
 *
 * @example
 * getDurationInMinutes("09:00", "10:30") // 90
 * getDurationInMinutes("14:00", "15:15") // 75
 */
export function getDurationInMinutes(startTime, endTime) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/**
 * 시간에 분을 더함
 * @param {string} time - 기준 시간 ("HH:MM")
 * @param {number} minutesToAdd - 더할 분 (음수 가능)
 * @returns {string} 계산된 시간 ("HH:MM")
 *
 * @example
 * addMinutes("09:00", 15) // "09:15"
 * addMinutes("14:45", -30) // "14:15"
 */
export function addMinutes(time, minutesToAdd) {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  return minutesToTime(totalMinutes);
}

/**
 * 두 시간대가 겹치는지 확인
 * @param {Object} slot1 - 첫 번째 시간대 { start, end }
 * @param {Object} slot2 - 두 번째 시간대 { start, end }
 * @returns {boolean} 겹치면 true, 아니면 false
 *
 * @example
 * hasOverlap(
 *   { start: "09:00", end: "11:00" },
 *   { start: "10:00", end: "12:00" }
 * ) // true (10:00-11:00 겹침)
 *
 * hasOverlap(
 *   { start: "09:00", end: "11:00" },
 *   { start: "11:00", end: "13:00" }
 * ) // false (경계만 닿음)
 */
export function hasOverlap(slot1, slot2) {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  // 겹침: slot1이 slot2보다 먼저 끝나지 않고, slot2가 slot1보다 먼저 끝나지
  // 않음 즉, 한쪽의 시작이 다른 쪽의 끝보다 이전이면 겹침
  return start1 < end2 && start2 < end1;
}

/**
 * 시간 A가 시간 B보다 이전인지 확인
 * @param {string} timeA - 첫 번째 시간 ("HH:MM")
 * @param {string} timeB - 두 번째 시간 ("HH:MM")
 * @returns {boolean} A < B이면 true
 *
 * @example
 * isBefore("09:00", "10:00") // true
 * isBefore("10:00", "09:00") // false
 * isBefore("09:00", "09:00") // false
 */
export function isBefore(timeA, timeB) {
  return timeToMinutes(timeA) < timeToMinutes(timeB);
}

/**
 * 시간 A가 시간 B보다 이후인지 확인
 * @param {string} timeA - 첫 번째 시간 ("HH:MM")
 * @param {string} timeB - 두 번째 시간 ("HH:MM")
 * @returns {boolean} A > B이면 true
 */
export function isAfter(timeA, timeB) {
  return timeToMinutes(timeA) > timeToMinutes(timeB);
}

/**
 * 시간이 특정 범위 내에 있는지 확인
 * @param {string} time - 확인할 시간 ("HH:MM")
 * @param {string} rangeStart - 범위 시작 ("HH:MM")
 * @param {string} rangeEnd - 범위 끝 ("HH:MM")
 * @returns {boolean} 범위 내에 있으면 true
 *
 * @example
 * isWithinRange("10:00", "09:00", "11:00") // true
 * isWithinRange("08:00", "09:00", "11:00") // false
 */
export function isWithinRange(time, rangeStart, rangeEnd) {
  const timeMin = timeToMinutes(time);
  const startMin = timeToMinutes(rangeStart);
  const endMin = timeToMinutes(rangeEnd);

  return timeMin >= startMin && timeMin <= endMin;
}

/**
 * 요일별로 시간대를 그룹화
 * @param {Array} slots - 시간대 배열 [{ day, start, end }, ...]
 * @returns {Object} 요일을 키로 하는 객체 { '월': [...], '화': [...], ... }
 *
 * @example
 * groupByDay([
 *   { day: '월', start: '09:00', end: '10:00' },
 *   { day: '월', start: '11:00', end: '12:00' },
 *   { day: '화', start: '13:00', end: '14:00' }
 * ])
 * // {
 * //   '월': [{ day: '월', start: '09:00', end: '10:00' }, { day: '월', start:
 * '11:00', end: '12:00' }],
 * //   '화': [{ day: '화', start: '13:00', end: '14:00' }]
 * // }
 */
export function groupByDay(slots) {
  return slots.reduce((acc, slot) => {
    if (!acc[slot.day]) {
      acc[slot.day] = [];
    }
    acc[slot.day].push(slot);
    return acc;
  }, {});
}

/**
 * 두 시간대 배열이 동일한지 비교 (순서 무관)
 * @param {Array} slots1 - 첫 번째 시간대 배열
 * @param {Array} slots2 - 두 번째 시간대 배열
 * @returns {boolean} 동일하면 true
 */
export function areSlotsEqual(slots1, slots2) {
  if (slots1.length !== slots2.length) {
    return false;
  }

  // 정렬을 위한 복사본 생성
  const sorted1 = [...slots1].sort((a, b) => {
    if (a.day !== b.day) return a.day.localeCompare(b.day);
    if (a.start !== b.start) return a.start.localeCompare(b.start);
    return a.end.localeCompare(b.end);
  });

  const sorted2 = [...slots2].sort((a, b) => {
    if (a.day !== b.day) return a.day.localeCompare(b.day);
    if (a.start !== b.start) return a.start.localeCompare(b.start);
    return a.end.localeCompare(b.end);
  });

  // 각 요소 비교
  return sorted1.every((slot, i) => {
    const other = sorted2[i];
    return slot.day === other.day && slot.start === other.start && slot.end === other.end;
  });
}

/**
 * 시간대가 유효한 형식인지 검증
 * @param {Object} slot - 검증할 시간대 { day, start, end }
 * @returns {boolean} 유효하면 true
 */
export function isValidSlot(slot) {
  if (!slot || typeof slot !== 'object') {
    return false;
  }

  const { day, start, end } = slot;

  // 필수 속성 확인
  if (!day || !start || !end) {
    return false;
  }

  // 시간 형식 확인 (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    return false;
  }

  // 시작 시간이 종료 시간보다 이전인지 확인
  if (!isBefore(start, end)) {
    return false;
  }

  return true;
}
