/**
 * 통합 테스트
 * gradeCode 함수의 전체 프로세스 검증
 */

import {MASTER_CONSTRAINTS, MASTER_SCHEDULE} from '../data/masterData.js';
import {formatCodeGradeResult, gradeCode} from '../services/graderService.js';

describe('통합 테스트 - 코드 실행 및 채점', () => {
  test('정답 코드는 성공해야 합니다', async () => {
    const correctCode = `
      function findWorkableSlots(schedule, constraints) {
        return [
          { day: '월', start: '12:15', end: '13:45' },
          { day: '화', start: '11:15', end: '12:45' },
          { day: '수', start: '12:15', end: '13:45' },
          { day: '수', start: '16:15', end: '18:00' },
          { day: '목', start: '11:15', end: '12:45' },
          { day: '금', start: '12:15', end: '14:45' }
        ];
      }
    `;

    const result =
        await gradeCode(correctCode, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
    expect(result.message).toContain('미션 성공');
  }, 10000);

  test('이동 시간을 고려하지 않은 코드는 실패해야 합니다', async () => {
    const wrongCode = `
      function findWorkableSlots(schedule, constraints) {
        // 이동 시간을 고려하지 않음
        return [
          { day: '월', start: '12:00', end: '14:00' }
        ];
      }
    `;

    const result =
        await gradeCode(wrongCode, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_TRAVEL_TIME');
  }, 10000);

  test('최소 근무 시간 미달 코드는 실패해야 합니다', async () => {
    const wrongCode = `
      function findWorkableSlots(schedule, constraints) {
        // 30분짜리 시간대 (최소 60분 미달)
        return [
          { day: '화', start: '15:15', end: '15:45' }
        ];
      }
    `;

    const result =
        await gradeCode(wrongCode, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_MIN_DURATION');
  }, 10000);

  test('불완전한 답안은 실패해야 합니다', async () => {
    const incompleteCode = `
      function findWorkableSlots(schedule, constraints) {
        // 일부만 찾음
        return [
          { day: '월', start: '12:15', end: '13:45' }
        ];
      }
    `;

    const result =
        await gradeCode(incompleteCode, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('RULE_INCOMPLETE');
  }, 10000);

  test('구문 오류가 있는 코드는 실행 실패해야 합니다', async () => {
    const syntaxErrorCode = `
      function findWorkableSlots(schedule, constraints) {
        return [}; // 구문 오류
      }
    `;

    const result =
        await gradeCode(syntaxErrorCode, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('EXECUTION_ERROR');
  }, 10000);

  test('보안 위반 코드는 실행 전에 차단되어야 합니다', async () => {
    const maliciousCode = `
      const fs = require('fs');
      function findWorkableSlots(schedule, constraints) {
        return [];
      }
    `;

    const result =
        await gradeCode(maliciousCode, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.failedRule).toBe('SECURITY_VIOLATION');
  }, 10000);
});

describe('통합 테스트 - 결과 포맷팅', () => {
  test('성공 결과가 올바르게 포맷팅되어야 합니다', async () => {
    const correctCode = `
      function findWorkableSlots(schedule, constraints) {
        return [
          { day: '월', start: '12:15', end: '13:45' },
          { day: '화', start: '11:15', end: '12:45' },
          { day: '수', start: '12:15', end: '13:45' },
          { day: '수', start: '16:15', end: '18:00' },
          { day: '목', start: '11:15', end: '12:45' },
          { day: '금', start: '12:15', end: '14:45' }
        ];
      }
    `;

    const result = await gradeCode(correctCode);
    const formatted = formatCodeGradeResult(result);

    expect(formatted.status).toBe('success');
    expect(formatted.title).toContain('🎉');
    expect(formatted.score).toBe(100);
  }, 10000);

  test('실행 오류 결과가 올바르게 포맷팅되어야 합니다', async () => {
    const errorCode = `
      function findWorkableSlots(schedule, constraints) {
        throw new Error('의도적 오류');
      }
    `;

    const result = await gradeCode(errorCode);
    const formatted = formatCodeGradeResult(result);

    expect(formatted.status).toBe('failed');
    expect(formatted.title).toContain('⚠️');
    expect(formatted.score).toBe(0);
  }, 10000);

  test('테스트 실패 결과가 올바르게 포맷팅되어야 합니다', async () => {
    const failedCode = `
      function findWorkableSlots(schedule, constraints) {
        return [{ day: '월', start: '12:00', end: '14:00' }];
      }
    `;

    const result = await gradeCode(failedCode);
    const formatted = formatCodeGradeResult(result);

    expect(formatted.status).toBe('failed');
    expect(formatted.title).toContain('❌');
    expect(formatted.failedRule).toBeDefined();
  }, 10000);
});
