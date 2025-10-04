/**
 * Express Route: GET /api/problem
 * 참가자에게 문제 데이터(강의 시간표, 제약 조건)를 제공하는 API
 */

import {MASTER_CONSTRAINTS, MASTER_SCHEDULE} from '../data/masterData.js';

/**
 * 문제 데이터 조회 핸들러
 */
export function getProblem(req, res) {
  try {
    const problemData = {
      title: '알바 시간 찾기 미션',
      description:
          '주어진 강의 시간표를 보고, 알바가 가능한 모든 시간대를 찾아주세요!',
      schedule: MASTER_SCHEDULE,
      constraints: {
        travelTime: MASTER_CONSTRAINTS.travelTime,
        minWorkableSession: MASTER_CONSTRAINTS.minWorkableSession,
        campusHours: MASTER_CONSTRAINTS.campusHours
      },
      rules: [
        {
          id: 1,
          title: '강의 시간 중첩 금지',
          description: '알바 시간이 기존 강의 시간과 겹치면 안 됩니다.'
        },
        {
          id: 2,
          title: '이동 시간 준수',
          description: `강의 전후로 ${
              MASTER_CONSTRAINTS.travelTime}분의 이동 시간이 필요합니다.`
        },
        {
          id: 3,
          title: '최소 근무 시간',
          description: `알바는 최소 ${
              MASTER_CONSTRAINTS.minWorkableSession}분 이상이어야 합니다.`
        },
        {
          id: 4,
          title: '캠퍼스 활동 시간',
          description: `알바는 캠퍼스 활동 시간(${
              MASTER_CONSTRAINTS.campusHours.start}~${
              MASTER_CONSTRAINTS.campusHours.end}) 내에만 가능합니다.`
        },
        {
          id: 5,
          title: '완전성',
          description: '가능한 모든 알바 시간을 빠짐없이 찾아야 합니다.'
        }
      ],
      hints: [
        '강의 시간표를 요일별로 정리해보세요.',
        '각 요일의 공강 시간을 찾아보세요.',
        '이동 시간(15분)을 고려해야 합니다.',
        '60분 미만의 공강 시간은 알바가 불가능합니다.'
      ]
    };

    res.json(problemData);
  } catch (error) {
    console.error('Error fetching problem data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '문제 데이터를 불러오는 중 오류가 발생했습니다.'
    });
  }
}
