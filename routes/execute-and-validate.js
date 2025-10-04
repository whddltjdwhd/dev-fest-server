/**
 * Express Route: POST /api/execute-and-validate
 * 참가자의 코드를 실행하고 검증하는 API 엔드포인트
 */

import {MASTER_CONSTRAINTS, MASTER_SCHEDULE} from '../data/masterData.js';
import {formatCodeGradeResult, gradeCode} from '../services/graderService.js';

/**
 * 코드 실행 및 검증 핸들러
 */
export async function executeAndValidate(req, res) {
  try {
    const {code} = req.body;

    // 코드 필드 검증
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '코드가 제공되지 않았습니다.',
        hint: 'POST 요청 본문에 { "code": "..." } 형태로 코드를 전송해주세요.'
      });
    }

    if (typeof code !== 'string') {
      return res.status(400).json(
          {error: 'Bad Request', message: '코드는 문자열 형태여야 합니다.'});
    }

    // 코드 실행 및 채점
    const gradeResult =
        await gradeCode(code, MASTER_SCHEDULE, MASTER_CONSTRAINTS);

    // 결과 포맷팅 및 반환
    const formattedResult = formatCodeGradeResult(gradeResult);

    // 성공/실패에 따른 적절한 HTTP 상태 코드
    const statusCode = formattedResult.status === 'success' ? 200 : 400;

    res.status(statusCode).json(formattedResult);

  } catch (error) {
    console.error('Error executing and validating code:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: '코드 실행 중 예기치 않은 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message :
                                                        undefined
    });
  }
}
