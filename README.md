# Three.js Logarithmic Solar System

> Created by GPT-5.6 Luna Max on Hermes.

브라우저에서 실제 천문 데이터를 탐색할 수 있는 반응형 Three.js 태양계 시각화 프로젝트다. 태양부터 명왕성까지와 주요 위성을 포함하며, 실제 물리값과 화면 표시용 거리·크기 스케일을 분리한다.

## Original implementation prompt

이 프로젝트의 원본 구현 프롬프트:

- [Three.js Logarithmic Solar System Demo — Implementation Prompt](https://gist.github.com/plainOldCode/fb2e3ea48caada23107704628c2a9384)
- 저장소 내 보존본: [`docs/threejs_solar_system_demo_prompt_en.md`](docs/threejs_solar_system_demo_prompt_en.md)

## Features

- 태양, 수성, 금성, 지구, 화성, 목성, 토성, 천왕성, 해왕성, 명왕성
- 지구의 달, 화성의 Phobos/Deimos, 목성의 Galilean moons, 토성·천왕성·해왕성·명왕성의 주요 위성
- `OrbitControls` 카메라 조작: orbit, zoom, pan
- Raycaster 기반 천체 선택 및 부드러운 카메라 focus
- 천체 hover tooltip과 실제 천문 데이터/현재 렌더링 값을 함께 보여주는 inspector
- Play/Pause, 시간 배율, 시간 초기화
- 궤도선, 라벨, 위성, 위성 궤도, 별 필드 표시 제어
- 거리 표현: `Log Scale`, `Linear Scale`, `Focus Scale`
- 크기 표현: `Enhanced Visibility`, `Relative Size`, `Uniform Markers`
- 절차적으로 생성되는 별 필드·재질·궤도선 — 외부 텍스처 없이 실행
- 데스크톱 및 모바일 responsive layout
- 모바일 우측 상단 `Hide panels` / `Show panels` 토글로 HUD 패널 접기·복원

## Requirements

- Node.js 20.19 이상
- npm
- WebGL을 지원하는 최신 브라우저

## Install and run

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://127.0.0.1:5173/`에서 실행된다.

## Project commands

```bash
npm run typecheck   # TypeScript 타입 검사
npm run build       # 타입 검사와 Vite production build
npm run preview     # production build 미리보기
npm audit           # 전체 dependency audit
npm audit --omit=dev # production dependency audit
```

### Browser smoke validation

`final-acceptance-smoke.cjs`는 실행 중인 Vite 서버에 Playwright와 Chrome/Chromium으로 접속해 상호작용·반응형 레이아웃·콘솔 오류를 검증한다. Playwright는 애플리케이션 runtime dependency가 아니므로 별도 경로를 지정할 수 있다.

```bash
# 별도 터미널에서 Vite 서버 실행
npm run dev -- --host 127.0.0.1 --port 5173

# Playwright가 저장된 경로를 지정해 smoke 실행
PLAYWRIGHT_MODULE=/path/to/playwright \
SMOKE_OUTPUT=/tmp/solar-system-smoke.json \
node scripts/final-acceptance-smoke.cjs
```

`BASE_URL`로 다른 개발 서버 주소를 지정할 수 있으며, `SMOKE_SCREENSHOT_DIR`를 지정하면 desktop/mobile screenshot을 생성한다.

## Architecture

```text
.
├── docs/
│   ├── astronomical-source-manifest.json
│   ├── astronomical-source-manifest.md
│   └── threejs_solar_system_demo_prompt_en.md
├── evidence/
│   ├── final-acceptance*.{md,json,png}
│   └── task-*-validation.md
├── scripts/
│   ├── final-acceptance-smoke.cjs
│   ├── source-acceptance-check.mjs
│   ├── verify-prior-commits.mjs
│   └── verify-task-scope.mjs
├── src/
│   ├── data/        # 물리 데이터와 provenance
│   ├── rendering/   # renderer, procedural materials, orbit lines, star field
│   ├── scales/      # 거리·천체 크기 표시 스케일
│   ├── scene/       # Three.js scene/controller/body graph
│   ├── simulation/  # 시간과 궤도 계산
│   ├── styles/      # HUD와 responsive CSS
│   └── ui/          # control panel, inspector, labels, mobile panel toggle
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

## Astronomical data and provenance

물리 데이터의 source of truth는 [`src/data/solarSystemData.ts`](src/data/solarSystemData.ts)이며, 출처 매핑은 다음 문서에 기록한다.

- [`docs/astronomical-source-manifest.md`](docs/astronomical-source-manifest.md)
- [`docs/astronomical-source-manifest.json`](docs/astronomical-source-manifest.json)
- NASA NSSDC Planetary Fact Sheet
- NASA/JPL Solar System Dynamics physical-parameter tables
- Pluto 관련 JPL Small-Body Database 교차 확인

값은 안정적인 브라우저 시각화를 위한 정적·반올림 데이터다. 실시간 ephemeris state vector가 아니며, 데이터 레코드의 `sourceIds`로 provenance를 추적한다.

## Physical scale versus display scale

실제 천문값은 렌더링 편의를 위해 변경하지 않고, 표시 함수가 별도의 render-space 값을 계산한다.

### Heliocentric distance

기본 태양계 화면은 다음과 같은 logarithmic mapping을 사용한다.

```text
bounded = clamp(distanceAU, 0, maxDistanceAU)
normalized = log1p(bounded) / log1p(maxDistanceAU)
rendered = minRenderDistance
         + normalized * (maxRenderDistance - minRenderDistance)
```

기본 범위는 대략 `maxDistanceAU = 39.5`, `minRenderDistance = 16`, `maxRenderDistance = 190`이다. Linear 비교 모드와 선택된 행성계 중심의 Focus 모드도 제공한다.

### Moon distance

위성은 전역 태양계 좌표가 아니라 부모 천체 중심의 local coordinate system에서 별도 logarithmic mapping을 사용한다. 따라서 실제 위성 간 거리 순서를 보존하면서 부모 행성과 겹치지 않게 표시할 수 있다.

### Body size

천체 반지름은 실제 `radiusKm`를 보존하고, 화면에서는 독립적인 visibility mapping을 사용한다.

- Enhanced Visibility: 행성·위성을 제곱근 기반으로 확대
- Relative Size: 실제 크기 순서를 더 강하게 반영
- Uniform Markers: 비교 가능한 표식 크기
- 태양은 별도 render radius로 처리

따라서 화면의 궤도 반지름과 천체 반지름은 같은 물리 단위의 균일 스케일이 아니다. UI에도 이 차이를 명시한다.

## Validation status

현재 구현에 대해 다음 검증을 수행한다.

- `npm run typecheck`
- `npm run build`
- `npm audit`
- browser smoke: desktop interaction, raycast selection, camera focus, simulation controls, scale selectors, moon selection, mobile resize, mobile panel hide/show, disposal

최근 smoke 결과:

```text
88/88 assertions passed
console errors: 0
page errors: 0
request failures: 0
```

생성된 검증 산출물은 [`evidence/`](evidence/)에 보관한다. `node_modules/`, `dist/`, `.vite/`, 환경 파일, 로그는 `.gitignore`로 추적하지 않는다.

## Security and privacy

- 애플리케이션 runtime에 API key, OAuth token, password, private key가 필요하지 않다.
- `.env` 및 환경별 `.env.*` 파일은 Git에서 제외한다. 예제 환경 파일이 필요하면 `.env.example`만 커밋한다.
- 로컬 사용자명과 절대 workspace 경로는 공개 문서에서 제거하고 `<repo-root>` 또는 상대 경로로 표현한다.
- 현재 저장소에는 외부 이미지·폰트·오디오·비디오 asset이 없고, tracked PNG는 프로젝트 검증용으로 생성된 screenshot이다.
- `LICENSE` 또는 `NOTICE` 파일은 아직 선언하지 않았다. 저장소를 볼 수 있다는 사실만으로 재사용 권한이 부여되는 것은 아니므로, 배포 전에 프로젝트 라이선스를 별도로 결정해야 한다.

## Git workflow

기본 브랜치는 `main`이다. 변경 후에는 다음 순서로 확인한다.

```bash
git status --short --branch
git diff --check
npm run typecheck
npm run build
git add <intended-files>
git commit -m "<scoped message>"
```

생성 파일과 의존성 디렉터리를 실수로 커밋하지 않도록 staging 전에 `git diff --cached --name-only`를 확인한다.
