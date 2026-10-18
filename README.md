# 싸밥서울 로컬 미리보기

배포 전 점검 결과는 `VERIFICATION.md`에 정리했습니다. `npm test`로 자동 테스트, 서버 실행 후 `npm run check:preview`로 리소스 경로를 재검증할 수 있습니다.

`node scripts/preview.mjs` 실행 후 http://127.0.0.1:4173 에 접속합니다.

- 가을 디자인 강제 미리보기: http://127.0.0.1:4173/?theme=autumn
- 기존 디자인 비교: http://127.0.0.1:4173/?theme=default
- 일반 주소: 한국 시간 2026-10-18부터 2026-11-17까지 가을 테마, 11-18 00:00부터 기존 디자인.

가을 색상과 장식은 `styles/autumn.css`와 `themes/leaf.svg`에 분리되어 있습니다. 다음에 재사용하려면 `themes/seasonal.js`의 start/end 기간을 변경하세요. 즉시 기본 테마로 복원하려면 end를 지난 시각으로 설정하세요. URL 미리보기 설정은 저장되지 않습니다. 식단 데이터는 변경하지 않았으며, 공통 UI 개선은 기본·가을 테마 모두에 적용됩니다. 기간 종료 시 기본 올리브·플럼 색상으로 돌아옵니다. 페이지를 계속 켜 둔 경우에도 1분 이내 또는 다시 화면으로 돌아올 때 적용 기간을 확인합니다.

## Tailwind CSS

스타일은 Tailwind CSS CLI로 빌드합니다. `npm ci` 후 `npm run build:css`를 실행하세요. 수정 중에는 `npm run watch:css`를 사용할 수 있습니다. 빌드 진입점은 `styles/app.css`, 공통 컴포넌트·기본 색상 변수는 `styles/base.css`, 재사용 가능한 가을 색상·장식은 `styles/autumn.css`입니다. 테마에서 컴포넌트 레이아웃이나 버튼 규칙을 다시 정의하지 않고 색상 변수를 변경합니다. 생성된 `assets/app.css`를 포함하므로 미리보기와 정적 호스팅에는 Node.js 빌드 런타임이 필요하지 않습니다. 프리플라이트는 브라우저 기본 스타일 보존을 위해 사용하지 않습니다. UI에 이모티콘을 사용하지 않습니다.

### 개발 의존성 보안 조치

Tailwind CLI 4.3.3이 고정 사용하는 `@parcel/watcher` 2.5.1에는 `micromatch` → `braces` 경로로 GHSA-vfj7-8cjw-p6xm 취약점이 포함됩니다. `package.json`의 범위를 제한한 `overrides`로 watcher를 2.6.0에 고정해 해당 의존성 경로를 제거했습니다. CLI에서 이 버전 이상을 직접 사용하게 되면 override 제거를 검토하세요. 버전 변경 시 `npm audit`, `npm run build:css`, `npm run watch:css`의 변경 감지를 확인하세요. 이 패키지들은 개발 도구이며 브라우저에는 생성된 CSS만 전달됩니다.
