# ============================================
# Multi-stage build for Node.js + isolated-vm
# ============================================

# Stage 1: Builder - isolated-vm 네이티브 빌드
FROM node:18-alpine AS builder

# Python과 빌드 도구 설치 (isolated-vm 컴파일용)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    musl-dev \
    linux-headers

WORKDIR /build

# 의존성 파일 복사
COPY package*.json ./

# 프로덕션 의존성만 설치 (빌드 포함)
# npm ci는 package-lock.json이 필요하므로 npm install 사용
RUN npm install --production

# 소스 코드 복사
COPY . .

# Stage 2: Runtime - 경량화된 실행 환경
FROM node:18-alpine

# 런타임에 필요한 라이브러리만 설치
RUN apk add --no-cache \
    libstdc++ \
    libgcc

# 보안: non-root 사용자로 실행
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Builder stage에서 빌드된 파일들만 복사
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# non-root 사용자로 전환
USER nodejs

# 포트 노출
EXPOSE 3000

# 헬스 체크 (Render 자동 감지)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 환경 변수
ENV NODE_ENV=production \
    PORT=3000

# 서버 실행
CMD ["node", "server.js"]
