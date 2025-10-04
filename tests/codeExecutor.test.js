/**
 * Code Executor 테스트
 * 코드 실행 및 보안 기능 검증
 */

import {MASTER_CONSTRAINTS, MASTER_SCHEDULE} from '../data/masterData.js';
import {detectDangerousPatterns, executeUserCode, getSampleCode, validateCodeFormat} from '../services/codeExecutor.js';

describe('CodeExecutor - 코드 형식 검증', () => {
  test('null 코드는 거부되어야 합니다', () => {
    const result = validateCodeFormat(null);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('제공되지 않았습니다');
  });

  test('빈 문자열은 거부되어야 합니다', () => {
    const result = validateCodeFormat('   ');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('비어있습니다');
  });

  test('findWorkableSlots 함수가 없으면 거부되어야 합니다', () => {
    const code = 'function otherFunction() { return []; }';
    const result = validateCodeFormat(code);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('findWorkableSlots');
  });

  test('올바른 코드는 통과해야 합니다', () => {
    const code =
        'function findWorkableSlots(schedule, constraints) { return []; }';
    const result = validateCodeFormat(code);
    expect(result.valid).toBe(true);
  });
});

describe('CodeExecutor - 보안 패턴 감지', () => {
  test('require() 사용은 차단되어야 합니다', () => {
    const code = `
      const fs = require('fs');
      function findWorkableSlots() { return []; }
    `;
    const result = detectDangerousPatterns(code);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('require');
  });

  test('import 구문은 차단되어야 합니다', () => {
    const code = `
      import fs from 'fs';
      function findWorkableSlots() { return []; }
    `;
    const result = detectDangerousPatterns(code);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('import');
  });

  test('eval() 사용은 차단되어야 합니다', () => {
    const code = `
      function findWorkableSlots() {
        eval('malicious code');
        return [];
      }
    `;
    const result = detectDangerousPatterns(code);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('eval');
  });

  test('process 객체 접근은 차단되어야 합니다', () => {
    const code = `
      function findWorkableSlots() {
        console.log(process.env);
        return [];
      }
    `;
    const result = detectDangerousPatterns(code);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('process');
  });

  test('fs 모듈 접근은 차단되어야 합니다', () => {
    const code = `
      function findWorkableSlots() {
        fs.readFileSync('/etc/passwd');
        return [];
      }
    `;
    const result = detectDangerousPatterns(code);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('파일 시스템');
  });

  test('안전한 코드는 통과해야 합니다', () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        const slots = [];
        for (let i = 0; i < schedule.length; i++) {
          // 정상적인 로직
        }
        return slots;
      }
    `;
    const result = detectDangerousPatterns(code);
    expect(result.safe).toBe(true);
  });
});

describe('CodeExecutor - 코드 실행', () => {
  test('빈 배열을 반환하는 간단한 코드가 실행되어야 합니다', async () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        return [];
      }
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
    expect(result.slots).toEqual([]);
  });

  test('schedule과 constraints에 접근할 수 있어야 합니다', async () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        // schedule과 constraints를 사용한 간단한 로직
        if (Array.isArray(schedule) && constraints.travelTime) {
          return [{ day: '월', start: '12:15', end: '13:45' }];
        }
        return [];
      }
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].day).toBe('월');
  });

  test('구문 오류가 있는 코드는 실패해야 합니다', async () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        return [}; // 구문 오류
      }
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('EXECUTION_ERROR');
  });

  test('함수가 정의되지 않으면 실패해야 합니다', async () => {
    const code = `
      // findWorkableSlots 함수 없음
      const x = 10;
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.error).toContain('정의되지 않았습니다');
  });

  test('배열이 아닌 값을 반환하면 실패해야 합니다', async () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        return "not an array";
      }
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.error).toContain('배열을 반환');
  });

  test('무한 루프는 타임아웃되어야 합니다', async () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        while(true) {
          // 무한 루프
        }
        return [];
      }
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('TIMEOUT');
  }, 10000);  // 10초 타임아웃

  test('복잡한 계산도 제한 시간 내에 완료되어야 합니다', async () => {
    const code = `
      function findWorkableSlots(schedule, constraints) {
        const slots = [];
        
        // 적당한 복잡도의 계산
        for (let i = 0; i < schedule.length; i++) {
          const cls = schedule[i];
          if (cls.day === '월') {
            slots.push({ 
              day: cls.day, 
              start: cls.start, 
              end: cls.end 
            });
          }
        }
        
        return slots;
      }
    `;

    const result =
        await executeUserCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.slots)).toBe(true);
  });
});

describe('CodeExecutor - 샘플 코드', () => {
  test('샘플 코드가 제공되어야 합니다', () => {
    const sample = getSampleCode();
    expect(sample).toBeTruthy();
    expect(sample).toContain('findWorkableSlots');
    expect(sample).toContain('schedule');
    expect(sample).toContain('constraints');
  });

  test('샘플 코드가 실행 가능해야 합니다', async () => {
    const sample = getSampleCode();
    const result =
        await executeUserCode(sample, MASTER_SCHEDULE, MASTER_CONSTRAINTS);
    expect(result.success).toBe(true);
  });
});
