# Layer Collage Editor v0.2

Fabric.js 기반의 정적 이미지 편집/콜라주 웹앱입니다. 서버와 DB 없이 브라우저 안에서 캔버스 편집, 로컬 이미지 업로드, 레이어 관리, PNG 내보내기, 프로젝트 저장/복원을 처리합니다.

## 주요 기능

- 캔버스 비율 선택: 1:1, 4:5, 3:4, 9:16, 16:9, custom
- 배경 설정: 단색, 투명, 로컬 배경 이미지
- 배경 이미지 fit: cover, contain, stretch
- 로컬 이미지 추가: 중앙 배치, 이동, 크기 조절, 회전, 복제, 삭제
- 이미지 선 설정: 색상, 굵기(px), 0px 선 없음
- 이미지 자르기 crop mode: 프레임 너비/높이, 확대, 좌우/상하 위치 조절, 완료/취소/초기화
- 이미지 클리핑: none, rect, roundRect, circle, ellipse, star, heart, speechBubble
- 텍스트 레이어: 내용, 크기, 색상, 정렬
- 도형 레이어: 원, 사각형, 둥근 사각형, 별, 하트
- 레이어 패널: 선택, 숨김/표시, 잠금/해제, 순서 변경, 삭제
- PNG 내보내기: 배경 포함, 현재 캔버스 비율 유지
- 프로젝트 저장/불러오기: `.collage.json`
- IndexedDB 자동 저장과 이전 작업 복원 버튼
- 모바일 우선 하단 탭 UI와 빠른 액션바

## 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

빌드 결과는 `dist` 폴더에 생성됩니다. Vite `base`가 `./`로 설정되어 GitHub Pages의 하위 경로 배포에서도 정적 파일이 동작합니다.

## GitHub Pages 배포

1. GitHub 저장소에 이 프로젝트를 push합니다.
2. 저장소 `Settings > Pages`에서 `Source`를 `GitHub Actions`로 선택합니다.
3. `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 실행되어 `dist`를 Pages에 배포합니다.

GitHub Pages 배포에서도 서버 저장은 제공하지 않습니다. 프로젝트 자동 저장은 사용자의 브라우저 IndexedDB에 저장되며, 다른 기기나 다른 브라우저와 동기화되지 않습니다.

## 배경 이미지

1. `배경` 탭에서 `배경 이미지 업로드`를 누릅니다.
2. 로컬 이미지 파일을 선택합니다.
3. fit 옵션을 고릅니다.

fit 옵션:

- `cover`: 캔버스를 꽉 채웁니다. 이미지 일부가 잘릴 수 있습니다.
- `contain`: 이미지 전체가 보입니다. 남는 영역이 생길 수 있습니다.
- `stretch`: 캔버스에 강제로 맞춥니다. 이미지 비율이 깨질 수 있습니다.

`투명` 모드를 선택하면 PNG export에서 투명 배경을 유지합니다.

## 이미지 자르기

1. 이미지 레이어를 선택합니다.
2. 빠른 액션바 또는 `이미지` 탭에서 `자르기`를 누릅니다.
3. 프레임 너비/높이 슬라이더로 실제 잘릴 영역 크기를 바꿉니다.
4. 이미지 확대, 좌우, 상하 슬라이더로 프레임 안 이미지를 조절합니다.
5. `완료`로 적용하거나 `취소`로 되돌립니다.

자르기는 원본 이미지를 파괴하지 않고 crop 상태값으로 저장됩니다.

## 이미지 클리핑

이미지 레이어를 선택한 뒤 `이미지` 탭의 `클리핑` 섹션에서 모양을 선택합니다. `roundRect`는 radius 슬라이더를 제공합니다.

지원 모양:

- none
- rect
- roundRect
- circle
- ellipse
- star
- heart
- speechBubble

클리핑은 원본 이미지를 파괴하지 않고 clip 상태값으로 저장됩니다.

## 프로젝트 저장/불러오기

`내보내기` 탭에서 사용할 수 있습니다.

- `프로젝트 저장`: 현재 작업을 `.collage.json` 파일로 다운로드합니다.
- `프로젝트 불러오기`: 저장한 `.collage.json` 파일을 업로드해 캔버스, 배경, 레이어, crop, clip 상태를 복원합니다.

앱은 작업 중 상태를 IndexedDB에 자동 저장합니다. 새로고침 후 이전 작업이 있으면 복원 버튼이 표시됩니다.

## 설계 메모

- 모든 캔버스 요소는 `LayerItem` 모델을 기준으로 관리합니다.
- Fabric 객체에는 `layerId`, `layerType`, `layerName`, `crop`, `clip` 메타데이터를 붙여 레이어 패널과 동기화합니다.
- 배경 이미지는 일반 이미지 레이어가 아니라 `CanvasBackground` 상태로 관리합니다.
- 업로드 이미지는 브라우저 내부 canvas에서 최대 변 길이를 제한해 모바일 메모리 부담을 줄입니다.
- 서버, DB, 외부 이미지 URL import는 사용하지 않습니다.

## 알려진 제한

- 외부 이미지 URL 불러오기는 CORS export 문제 때문에 지원하지 않습니다.
- 서버 저장, 로그인, 계정 동기화는 지원하지 않습니다.
- 매우 큰 이미지는 모바일 브라우저에서 느릴 수 있습니다.
- crop mode는 현재 슬라이더 기반 조작을 우선 지원합니다.

## 회귀 체크리스트

- 새 이미지 추가, 이동, 크기 조절, 회전
- 이미지 삭제, 복제
- 텍스트 추가와 수정
- 도형 추가와 선 색상/굵기 변경
- 레이어 숨김/표시, 잠금/해제, 순서 변경
- 배경 이미지 업로드, fit 변경, 제거
- 이미지 crop 완료/취소/초기화
- clip 모양 변경과 none 되돌리기
- `.collage.json` 저장/불러오기
- 자동 저장 복원
- PNG export
- 모바일 하단 탭 조작

## 이미지 렌더링 개발 메모

- 이미지 crop은 프레임 안에 보이는 원본 픽셀 위치와 확대율만 바꿉니다.
- clip과 stroke 도형은 crop offset/scale이 아니라 이미지 레이어 프레임 기준으로 계산합니다.
- 이미지 stroke는 현재 clip과 같은 도형을 그린 뒤 같은 도형 mask로 바깥쪽 stroke를 숨겨 안쪽 선처럼 보이게 합니다.
- 이미지 stroke companion object는 직접 선택되지 않으며 clip, crop, stroke, 표시 상태, transform, 복제, 삭제, 프로젝트 불러오기 시 기존 object를 제거하고 다시 생성합니다.

## Current implementation notes (Phase 3)

- Editor shell structure: `TopBar`, `LeftToolBar`, `CanvasEditor`, `RightSidebar`, `StatusBar`, `BottomSheet`, and `MobileToolBar`.
- Mobile layout keeps selected-layer quick actions available inside the bottom sheet and keeps desktop quick actions in the right sidebar.
- Implemented image clip types: `none`, `rect`, `roundRect`, `circle`, `ellipse`, `squircle`, `capsuleH`, `capsuleV`, `heart`, `heartSoft`, `heartLong`, `arch`, `droplet`, `blob1`, `blob2`, `star`, `ticket`, `speechBubble`, `heartClassic`.
- Built-in asset picker currently loads integrated manifest entries for `overlays`, `ui-overlays`, and `stickers` if that category exists. In the current public asset pack, `overlays` and `ui-overlays` are present; `stickers` is supported by code but no `public/assets/stickers` folder is present.
- Public asset categories such as `backgrounds`, `frames`, `masks`, `presets`, and `templates` are included in the asset pack but are not currently loaded into the Image panel asset picker.
- `dist` and `node_modules` are generated/runtime folders and should not be treated as source code.
