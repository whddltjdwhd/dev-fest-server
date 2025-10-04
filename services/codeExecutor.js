/**
 * Code Executor Service
 * isolated-vm을 사용하여 사용자 코드를 안전하게 실행하는 서비스
 */

import ivm from 'isolated-vm';

/**
 * 안전한 샌드박스 환경에서 사용자 코드를 실행
 *
 * @param {string} code - 사용자가 작성한 코드 문자열
 * @param {Object} schedule - 강의 시간표
 * @param {Object} constraints - 제약 조건
 * @returns {Promise<Object>} { success: boolean, slots?: Array, error?: string
 *     }
 */
export async function executeUserCode(code, schedule, constraints) {
  // 실행 시간 제한 (밀리초)
  const EXECUTION_TIMEOUT = 1000; // 1초

  // 메모리 제한 (MB)
  const MEMORY_LIMIT = 32;

  try {
    // 1. Isolate 생성 (독립된 V8 인스턴스)
    const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT });

    // 2. Context 생성 (격리된 실행 컨텍스트)
    const context = await isolate.createContext();

    // 3. 안전한 데이터를 샌드박스에 주입
    const jail = context.global;

    // schedule 데이터 주입
    await jail.set('scheduleData', new ivm.ExternalCopy(schedule).copyInto());

    // constraints 데이터 주입
    await jail.set('constraintsData', new ivm.ExternalCopy(constraints).copyInto());

    // 4. 사용자 코드와 실행 로직 조합
    // export 구문 제거 (샌드박스 환경에서는 ES6 모듈 불필요)
    const cleanedCode = code.replace(/export\s+(default\s+)?/g, '');

    const executableCode =
      cleanedCode +
      `
      // 함수가 정의되었는지 확인
      if (typeof findWorkableSlots !== 'function') {
        throw new Error('findWorkableSlots 함수가 정의되지 않았습니다.');
      }
      
      // 함수 실행 및 결과 반환
      const result = findWorkableSlots(scheduleData, constraintsData);
      
      // 결과 타입 검증
      if (!Array.isArray(result)) {
        throw new Error('함수는 배열을 반환해야 합니다.');
      }
      
      result;
    `;

    // 5. 코드 컴파일
    const script = await isolate.compileScript(executableCode);

    // 6. 타임아웃과 함께 코드 실행
    const result = await script.run(context, {
      timeout: EXECUTION_TIMEOUT,
      copy: true, // 결과를 자동으로 복사
    });

    // 7. Isolate 정리 (메모리 해제)
    isolate.dispose();

    return { success: true, slots: result };
  } catch (error) {
    // 에러 타입별 처리
    if (error.message && error.message.includes('Script execution timed out')) {
      return {
        success: false,
        error: '코드 실행 시간이 초과되었습니다. (제한: 1초)',
        errorType: 'TIMEOUT',
      };
    }

    if (error.message && error.message.includes('memory limit')) {
      return {
        success: false,
        error: '메모리 사용량이 제한을 초과했습니다.',
        errorType: 'MEMORY_LIMIT',
      };
    }

    // 구문 오류 또는 런타임 오류
    return {
      success: false,
      error: `코드 실행 중 오류 발생: ${error.message}`,
      errorType: 'EXECUTION_ERROR',
    };
  }
}

/**
 * 사용자 코드의 기본 형식을 검증
 *
 * @param {string} code - 검증할 코드 문자열
 * @returns {Object} { valid: boolean, message?: string }
 */
export function validateCodeFormat(code) {
  // null/undefined 체크
  if (!code) {
    return { valid: false, message: '코드가 제공되지 않았습니다.' };
  }

  // 문자열 체크
  if (typeof code !== 'string') {
    return { valid: false, message: '코드는 문자열이어야 합니다.' };
  }

  // 빈 문자열 체크
  if (code.trim().length === 0) {
    return { valid: false, message: '코드가 비어있습니다.' };
  }

  // 최대 길이 체크 (10KB)
  const MAX_CODE_LENGTH = 10 * 1024;
  if (code.length > MAX_CODE_LENGTH) {
    return {
      valid: false,
      message: `코드 크기가 너무 큽니다. (최대: ${MAX_CODE_LENGTH / 1024}KB)`,
    };
  }

  // 함수명 체크 (간단한 정규식)
  if (!code.includes('findWorkableSlots')) {
    return {
      valid: false,
      message: 'findWorkableSlots 함수를 정의해야 합니다.',
      hint: 'function findWorkableSlots(schedule, constraints) { ... }',
    };
  }

  return { valid: true };
}

/**
 * 위험한 코드 패턴 감지 (추가 보안 레이어)
 *
 * @param {string} code - 검사할 코드
 * @returns {Object} { safe: boolean, reason?: string }
 */
export function detectDangerousPatterns(code) {
  // 위험한 패턴 목록
  const dangerousPatterns = [
    { pattern: /require\s*\(/i, reason: 'require() 사용이 감지되었습니다.' },
    { pattern: /import\s+/i, reason: 'import 구문 사용이 감지되었습니다.' },
    { pattern: /eval\s*\(/i, reason: 'eval() 사용이 감지되었습니다.' },
    {
      pattern: /Function\s*\(/i,
      reason: 'Function() 생성자 사용이 감지되었습니다.',
    },
    {
      pattern: /child_process/i,
      reason: '시스템 명령 실행 시도가 감지되었습니다.',
    },
    { pattern: /process\./i, reason: 'process 객체 접근이 감지되었습니다.' },
    { pattern: /fs\./i, reason: '파일 시스템 접근이 감지되었습니다.' },
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(code)) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}

/**
 * 샘플 코드 생성 (참가자를 위한 템플릿)
 */
export function getSampleCode() {
  return `function findWorkableSlots(schedule, constraints) {
  // 여기에 로직을 작성하세요!
  // schedule: 강의 시간표 배열
  // constraints: 제약 조건 객체 (travelTime, minWorkableSession, campusHours)
  
  const slots = [];
  
  // 예시: 간단한 로직
  // TODO: 실제 알고리즘을 구현하세요
  
  return slots;
}`;
}
