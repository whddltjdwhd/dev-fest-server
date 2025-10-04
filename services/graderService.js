/**
 * Grader Service
 * 참가자의 제출물을 체계적으로 검증하는 핵심 채점 서비스
 */

import {calculateCorrectSlots, MASTER_CONSTRAINTS, MASTER_SCHEDULE} from '../data/masterData.js';

import {test_rule1_noOverlapWithClasses, test_rule2_adheresToTravelTime, test_rule3_meetsMinDuration, test_rule4_withinCampusHours, test_rule5_isComplete} from './ruleTests.js';

/**
 * 참가자의 제출물을 채점하는 메인 함수
 *
 * 채점 프로세스:
 * 1. 기본 검증 (형식, 필수 필드 등)
 * 2. 규칙 1-4를 순차적으로 실행 (하나라도 실패하면 즉시 중단)
 * 3. 모두 통과하면 규칙 5 (완전성) 검증
 * 4. 최종 결과 반환
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @param {Array} masterSchedule - 강의 시간표 (기본값: MASTER_SCHEDULE)
 * @param {Object} masterConstraints - 제약 조건 (기본값: MASTER_CONSTRAINTS)
 * @returns {Object} 채점 결과 { success: boolean, message: string, details?:
 *     Object }
 */
export function grade(
    slots, masterSchedule = MASTER_SCHEDULE,
    masterConstraints = MASTER_CONSTRAINTS) {
  // 정답 자동 계산
  const correctSlots = calculateCorrectSlots(masterSchedule, masterConstraints);
  // 기본 검증
  const validation = validateSubmission(slots);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
      failedRule: 'INVALID_FORMAT',
      details: validation.details
    };
  }

  // 테스트 스위트 정의
  // 각 테스트는 독립적이며 순차적으로 실행됨
  const tests = [
    {
      name: 'Rule #1: 강의 시간 중첩 검증',
      fn: () => test_rule1_noOverlapWithClasses(slots, masterSchedule)
    },
    {
      name: 'Rule #2: 이동 시간 준수 검증',
      fn: () => test_rule2_adheresToTravelTime(
          slots, masterSchedule, masterConstraints)
    },
    {
      name: 'Rule #3: 최소 근무 시간 검증',
      fn: () => test_rule3_meetsMinDuration(slots, masterConstraints)
    },
    {
      name: 'Rule #4: 캠퍼스 활동 시간 검증',
      fn: () => test_rule4_withinCampusHours(slots, masterConstraints)
    },
    {
      name: 'Rule #5: 완전성 검증',
      fn: () => test_rule5_isComplete(slots, correctSlots)
    }
  ];

  // 테스트 순차 실행
  for (const test of tests) {
    const result = test.fn();

    if (!result.passed) {
      // 실패 시 즉시 결과 반환
      return {
        success: false,
        message: result.message,
        failedRule: result.failedRule,
        failedTest: test.name,
        details: result.details,
        hint: result.details?.hint
      };
    }
  }

  // 모든 테스트 통과
  return {
    success: true,
    message: '🎉 미션 성공! 모든 규칙을 완벽하게 통과했습니다!',
    details: {totalSlots: slots.length, allTestsPassed: true}
  };
}

/**
 * 제출물의 기본 형식을 검증
 *
 * @param {*} slots - 검증할 데이터
 * @returns {Object} { valid: boolean, message?: string, details?: Object }
 */
function validateSubmission(slots) {
  // null/undefined 체크
  if (!slots) {
    return {
      valid: false,
      message: '제출 데이터가 없습니다.',
      details: {received: slots}
    };
  }

  // 배열 체크
  if (!Array.isArray(slots)) {
    return {
      valid: false,
      message: '제출 데이터는 배열이어야 합니다.',
      details: {received: typeof slots}
    };
  }

  // 빈 배열 체크
  if (slots.length === 0) {
    return {
      valid: false,
      message: '알바 가능 시간이 하나도 제출되지 않았습니다.',
      details: {hint: '공강 시간을 찾아 제출해주세요.'}
    };
  }

  // 각 슬롯의 필수 필드 체크
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];

    if (!slot || typeof slot !== 'object') {
      return {
        valid: false,
        message: `${i + 1}번째 시간대가 올바른 형식이 아닙니다.`,
        details: {index: i, received: slot}
      };
    }

    const requiredFields = ['day', 'start', 'end'];
    for (const field of requiredFields) {
      if (!slot[field]) {
        return {
          valid: false,
          message: `${i + 1}번째 시간대에 '${field}' 속성이 없습니다.`,
          details: {index: i, missingField: field, slot}
        };
      }
    }

    // 시간 형식 체크 (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
      return {
        valid: false,
        message: `${
            i +
            1}번째 시간대의 시간 형식이 올바르지 않습니다. (HH:MM 형식이어야 합니다)`,
        details: {index: i, slot, expectedFormat: 'HH:MM (예: 09:30)'}
      };
    }

    // 요일 체크
    const validDays = ['월', '화', '수', '목', '금'];
    if (!validDays.includes(slot.day)) {
      return {
        valid: false,
        message: `${i + 1}번째 시간대의 요일이 올바르지 않습니다.`,
        details: {index: i, received: slot.day, validDays}
      };
    }
  }

  return {valid: true};
}

/**
 * 채점 결과를 사용자 친화적인 형식으로 포맷팅
 *
 * @param {Object} result - grade() 함수의 반환값
 * @returns {Object} 포맷팅된 결과
 */
export function formatGradeResult(result) {
  if (result.success) {
    return {
      status: 'success',
      title: '✅ 채점 완료',
      message: result.message,
      score: 100,
      details: result.details
    };
  }

  return {
    status: 'failed',
    title: '❌ 채점 실패',
    message: result.message,
    failedRule: result.failedRule,
    failedTest: result.failedTest,
    hint: result.hint || result.details?.hint,
    details: result.details,
    score: 0
  };
}

/**
 * 간단한 채점 (성공/실패만 반환)
 *
 * @param {Array} slots - 참가자가 제출한 알바 시간대 배열
 * @returns {boolean} 모든 테스트 통과 여부
 */
export function quickGrade(slots) {
  const result = grade(slots);
  return result.success;
}

/**
 * 사용자 코드를 실행하고 채점하는 메인 함수
 *
 * 프로세스:
 * 1. 코드 형식 검증
 * 2. 위험한 패턴 감지
 * 3. 샌드박스에서 코드 실행
 * 4. 실행 결과(slots)를 기존 테스트 스위트로 검증
 *
 * @param {string} code - 사용자가 작성한 코드 문자열
 * @param {Array} masterSchedule - 강의 시간표 (기본값: MASTER_SCHEDULE)
 * @param {Object} masterConstraints - 제약 조건 (기본값: MASTER_CONSTRAINTS)
 * @returns {Promise<Object>} 채점 결과
 */
export async function gradeCode(
    code, masterSchedule = MASTER_SCHEDULE,
    masterConstraints = MASTER_CONSTRAINTS) {
  // codeExecutor 동적 import (isolated-vm 문제 회피)
  const {validateCodeFormat, detectDangerousPatterns, executeUserCode} =
      await import('./codeExecutor.js');

  // === 1단계: 코드 형식 검증 ===
  const formatValidation = validateCodeFormat(code);
  if (!formatValidation.valid) {
    return {
      success: false,
      message: formatValidation.message,
      failedRule: 'INVALID_FORMAT',
      details: {hint: formatValidation.hint}
    };
  }

  // === 2단계: 위험한 패턴 감지 ===
  const securityCheck = detectDangerousPatterns(code);
  if (!securityCheck.safe) {
    return {
      success: false,
      message: `보안 경고: ${securityCheck.reason}`,
      failedRule: 'SECURITY_VIOLATION',
      details: {hint: '허용되지 않는 코드 패턴이 감지되었습니다.'}
    };
  }

  // === 3단계: 샌드박스에서 코드 실행 ===
  let executionResult;
  try {
    executionResult =
        await executeUserCode(code, masterSchedule, masterConstraints);
  } catch (error) {
    return {
      success: false,
      message: `코드 실행 중 예상치 못한 오류: ${error.message}`,
      failedRule: 'EXECUTION_ERROR'
    };
  }

  // 실행 실패 처리
  if (!executionResult.success) {
    return {
      success: false,
      message: executionResult.error,
      failedRule: executionResult.errorType || 'EXECUTION_ERROR',
      details: {
        hint: executionResult.errorType === 'TIMEOUT' ?
            '무한 루프나 과도한 연산이 있는지 확인하세요.' :
            '코드의 구문 오류나 런타임 오류를 확인하세요.'
      }
    };
  }

  // === 4단계: 실행 결과(slots)를 기존 테스트 스위트로 검증 ===
  const slots = executionResult.slots;
  const validationResult = grade(slots, masterSchedule, masterConstraints);

  return validationResult;
}

/**
 * 코드 실행 결과를 사용자 친화적인 형식으로 포맷팅
 *
 * @param {Object} result - gradeCode() 함수의 반환값
 * @returns {Object} 포맷팅된 결과
 */
export function formatCodeGradeResult(result) {
  if (result.success) {
    return {
      status: 'success',
      title: '🎉 미션 성공!',
      message: result.message,
      score: 100,
      details: result.details
    };
  }

  // 실행 오류와 검증 오류를 구분
  const isExecutionError = [
    'INVALID_FORMAT', 'SECURITY_VIOLATION', 'EXECUTION_ERROR', 'TIMEOUT',
    'MEMORY_LIMIT'
  ].includes(result.failedRule);

  return {
    status: 'failed',
    title: isExecutionError ? '⚠️ 코드 실행 실패' : '❌ 테스트 실패',
    message: result.message,
    failedRule: result.failedRule,
    failedTest: result.failedTest,
    hint: result.hint || result.details?.hint,
    details: result.details,
    score: 0
  };
}
