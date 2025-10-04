/**
 * Express Server for Render Deployment
 * 순수 Express 서버 - 코드 실행 및 채점 API
 */

import cors from 'cors';
import express from 'express';

import {executeAndValidate} from './routes/execute-and-validate.js';
import {getProblem} from './routes/problem.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({limit: '1mb'}));

// 로깅 미들웨어
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API 라우트
app.get('/api/problem', getProblem);
app.post('/api/execute-and-validate', executeAndValidate);

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: '🎓 Handson Server API',
    version: '1.0.0',
    endpoints: {
      problem: {
        method: 'GET',
        path: '/api/problem',
        description: '문제 데이터 조회'
      },
      executeAndValidate: {
        method: 'POST',
        path: '/api/execute-and-validate',
        description: '코드 실행 및 채점',
        body: {code: 'string - 사용자 작성 코드'}
      },
      health: {method: 'GET', path: '/health', description: '서버 상태 확인'}
    }
  });
});

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    availableEndpoints:
        ['GET /api/problem', 'POST /api/execute-and-validate', 'GET /health']
  });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ?
        '서버 오류가 발생했습니다.' :
        err.message
  });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 ================================');
  console.log(`   Server running on port ${PORT}`);
  console.log('🚀 ================================');
  console.log('');
  console.log('📍 Available endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/problem`);
  console.log(`   POST http://localhost:${PORT}/api/execute-and-validate`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log('');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Node version: ${process.version}`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});
