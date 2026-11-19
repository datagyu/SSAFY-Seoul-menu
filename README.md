# 싸밥서울 로컬 미리보기

검증 기록과 스크린샷은 로컬에만 보관하며 Git 추적에서 제외합니다. `npm test`로 자동 테스트, 서버 실행 후 `npm run check:preview`로 리소스 경로를 재검증할 수 있습니다.

`node scripts/preview.mjs` 실행 후 http://127.0.0.1:4173 에 접속합니다.

- [겨울 테마 미리보기](http://127.0.0.1:4173/?theme=winter)
- [가을 테마 미리보기](http://127.0.0.1:4173/?theme=autumn)
- [기본 테마 미리보기](http://127.0.0.1:4173/?theme=default)

일반 주소는 한국 시간 기준 2026년 10월 18일~11월 17일에 가을 테마, 2026년 11월 19일~2027년 2월 28일에 겨울 테마를 표시합니다. 그 외 기간에는 기본 테마가 적용됩니다. 적용 기간은 `themes/seasonal.js`에서 관리하며, 페이지를 켜 둔 상태에서도 1분마다 또는 화면으로 돌아올 때 확인합니다. 미리보기는 현재 URL에만 적용됩니다.

## Tailwind CSS

스타일은 Tailwind CSS CLI로 빌드합니다. `npm ci` 후 `npm run build:css`를 실행하세요. 수정 중에는 `npm run watch:css`를 사용할 수 있습니다. 빌드 진입점은 `styles/app.css`, 공통 컴포넌트·기본 색상 변수는 `styles/base.css`입니다. 테마별 색상과 장식은 `styles/autumn.css`와 `styles/winter.css`에서 관리합니다. 생성된 `assets/app.css`를 포함하므로 미리보기와 정적 호스팅에는 Node.js 빌드 런타임이 필요하지 않습니다. 프리플라이트는 브라우저 기본 스타일 보존을 위해 사용하지 않습니다. UI에 이모티콘을 사용하지 않습니다.

### 개발 의존성 보안 조치

Tailwind CLI 4.3.3이 고정 사용하는 `@parcel/watcher` 2.5.1에는 `micromatch` → `braces` 경로로 GHSA-vfj7-8cjw-p6xm 취약점이 포함됩니다. `package.json`의 범위를 제한한 `overrides`로 watcher를 2.6.0에 고정해 해당 의존성 경로를 제거했습니다. CLI에서 이 버전 이상을 직접 사용하게 되면 override 제거를 검토하세요. 버전 변경 시 `npm audit`, `npm run build:css`, `npm run watch:css`의 변경 감지를 확인하세요. 이 패키지들은 개발 도구이며 브라우저에는 생성된 CSS만 전달됩니다.
