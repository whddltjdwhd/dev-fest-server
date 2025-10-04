/**
 * 마스터 데이터 정의
 * 참가자에게 제공되는 기본 데이터와 채점 기준
 */

/**
 * 주간 강의 시간표 (MASTER_SCHEDULE)
 * 각 강의는 이름(name), 요일(day), 시작시간(start), 종료시간(end), 장소(location)로 구성
 */
export const MASTER_SCHEDULE = [
  // 월요일
  {
    name: '이산수학',
    day: '월',
    start: '09:00',
    end: '12:00',
    location: '자연과학관 B117',
  },
  {
    name: '비판적사고와토론',
    day: '월',
    start: '12:00',
    end: '14:00',
    location: '산학협동관 104',
  },
  {
    name: '컴퓨터구조론',
    day: '월',
    start: '14:00',
    end: '18:00',
    location: '공학관 5층 실습실',
  },

  // 화요일
  {
    name: '자료구조 및 실습',
    day: '화',
    start: '09:00',
    end: '11:00',
    location: '정보문화관 P407',
  },
  {
    name: '운영체제',
    day: '화',
    start: '13:00',
    end: '15:00',
    location: '백양관 세미나실',
  },
  {
    name: '데이터베이스설계',
    day: '화',
    start: '16:00',
    end: '18:00',
    location: '종합강의동 306',
  },

  // 수요일
  {
    name: '알고리즘 분석',
    day: '수',
    start: '10:00',
    end: '12:00',
    location: '멀티미디어관 204',
  },
  {
    name: '소프트웨어공학개론',
    day: '수',
    start: '14:00',
    end: '16:00',
    location: '학생회관 대강당',
  },

  // 목요일
  {
    name: '컴퓨터네트워크',
    day: '목',
    start: '09:00',
    end: '11:00',
    location: '과학관 지하 세미나실',
  },
  {
    name: '인공지능과 머신러닝',
    day: '목',
    start: '13:00',
    end: '15:00',
    location: 'AI연구센터 401',
  },
  {
    name: '웹 애플리케이션 개발',
    day: '목',
    start: '16:00',
    end: '18:00',
    location: '창의관 컴퓨터실',
  },

  // 금요일
  {
    name: '컴파일러 설계',
    day: '금',
    start: '09:00',
    end: '12:00',
    location: '중앙도서관 스터디룸',
  },
  {
    name: '모바일 앱 개발',
    day: '금',
    start: '15:00',
    end: '18:00',
    location: '디자인관 랩실',
  },
];

/**
 * 제약 조건 (MASTER_CONSTRAINTS)
 * 알바 가능 시간 계산을 위한 규칙들
 */
export const MASTER_CONSTRAINTS = {
  // 강의 전후 이동 시간 (분)
  travelTime: 15,

  // 최소 근무 가능 시간 (분)
  // 60분 미만의 공강 시간은 알바 불가
  minWorkableSession: 60,

  // 캠퍼스 활동 시간
  campusHours: { start: '09:00', end: '18:00' },

  // 요일 순서 (정렬용)
  dayOrder: ['월', '화', '수', '목', '금'],

  // 알바 장소 (카페 위치)
  cafeLocation: '중앙도서관',

  // 인접 건물 정보 (카페에서 가까운 건물들)
  // 이 건물들에서 끝나는 수업 후에는 이동 시간이 5분으로 단축
  adjacentBuildings: [
    '정보문화관 P407', // 화요일 자료구조 및 실습
    '백양관 세미나실', // 화요일 운영체제
    '학생회관 대강당', // 수요일 소프트웨어공학개론
  ],

  // 단축된 이동 시간 (인접 건물에서 카페까지)
  reducedTravelTime: 5,
};

/**
 * 채점 결과 타입 정의
 */
export const RULE_TYPES = {
  OVERLAP: 'RULE_OVERLAP', // 강의 시간 중첩
  TRAVEL_TIME: 'RULE_TRAVEL_TIME', // 이동 시간 미준수
  MIN_DURATION: 'RULE_MIN_DURATION', // 최소 근무 시간 미달
  CAMPUS_HOURS: 'RULE_CAMPUS_HOURS', // 캠퍼스 활동 시간 위반
  INCOMPLETE: 'RULE_INCOMPLETE', // 누락된 시간대 존재
};

/**
 * 정답 자동 계산 함수
 * 강의 시간표와 제약 조건으로부터 올바른 알바 가능 시간을 계산
 */
export function calculateCorrectSlots(
  schedule = MASTER_SCHEDULE,
  constraints = MASTER_CONSTRAINTS
) {
  const slots = [];
  const { campusHours } = constraints;

  for (const day of constraints.dayOrder) {
    const classesOnDay = schedule
      .filter(cls => cls.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (classesOnDay.length === 0) continue;

    // 강의 사이의 공강 시간 찾기
    for (let i = 0; i < classesOnDay.length - 1; i++) {
      const currentClass = classesOnDay[i];
      const nextClass = classesOnDay[i + 1];

      // 🎁 Rule #6: 인접 건물 보너스 적용 (현재 강의)
      const isCurrentAdjacent =
        constraints.adjacentBuildings &&
        constraints.adjacentBuildings.includes(currentClass.location);
      const startTravelTime = isCurrentAdjacent
        ? constraints.reducedTravelTime
        : constraints.travelTime;

      // 🎁 Rule #6: 인접 건물 보너스 적용 (다음 강의)
      const isNextAdjacent =
        constraints.adjacentBuildings && constraints.adjacentBuildings.includes(nextClass.location);
      const endTravelTime = isNextAdjacent ? constraints.reducedTravelTime : constraints.travelTime;

      // 이동 시간을 고려한 실제 가능 시간
      const workableStart = addMinutes(currentClass.end, startTravelTime);
      const workableEnd = addMinutes(nextClass.start, -endTravelTime);

      const duration = getMinutesDiff(workableStart, workableEnd);

      // 최소 근무 시간 이상인 경우만 추가
      if (duration >= constraints.minWorkableSession) {
        slots.push({ day, start: workableStart, end: workableEnd });
      }
    }

    // 마지막 강의 이후 시간 체크
    const lastClass = classesOnDay[classesOnDay.length - 1];
    const isLastClassAdjacent =
      constraints.adjacentBuildings && constraints.adjacentBuildings.includes(lastClass.location);
    const lastClassTravelTime = isLastClassAdjacent
      ? constraints.reducedTravelTime
      : constraints.travelTime;

    const afterClassStart = addMinutes(lastClass.end, lastClassTravelTime);
    const afterClassDuration = getMinutesDiff(afterClassStart, campusHours.end);

    if (afterClassDuration >= constraints.minWorkableSession) {
      slots.push({ day, start: afterClassStart, end: campusHours.end });
    }
  }

  return slots;
}

// 헬퍼 함수
function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function getMinutesDiff(start, end) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}
