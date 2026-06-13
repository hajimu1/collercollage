# layer-collage-editor 개발 가이드라인

본 문서는 `layer-collage-editor` 프로젝트의 개요, 기술 스택, 디렉토리 구조 및 주요 개발 규칙을 정의합니다.

---

## 1. 프로젝트 개요 (Project Overview)
`layer-collage-editor`는 레이어 기반의 이미지 디자인 및 콜라주 에디터 웹 애플리케이션입니다. 포토샵이나 캔바(Canva)와 유사한 멀티 레이어 구조를 가지고 있어 이미지, 텍스트, 벡터 도형, 스티커/오버레이, 조정 레이어(Solid Color/Gradient)를 캔버스에 추가, 수정, 결합 및 배치할 수 있습니다. 

### 주요 핵심 기능
- **멀티 레이어 관리:** 각 오브젝트는 하나의 독립적인 레이어로 관리되며 레이어 패널에서 가시성 토글, 잠금, 불투명도 및 블렌딩 모드(Normal, Multiply, Screen, Overlay 등)를 제어합니다.
- **콜라주 기능:** 격자 레이아웃을 제공하고 셀 간격(Gap)과 모서리 둥글기(Radius)를 조정하여 각 셀에 이미지를 삽입, 정렬(Focus X, Y), 줌(Zoom) 제어할 수 있습니다.
- **도형 및 클리핑 마스크:** 여러 벡터 도형(하트, 별, 원, Squircle 등)을 추가할 수 있으며, 이미지 레이어에 클리핑 모양 마스크를 씌워 둥글게 자르거나 특정 형태로 잘라낼 수 있습니다.
- **조정 레이어 (Adjustment Layer):** 캔버스 전체 혹은 특정 영역에 적용할 단색 및 그라데이션 필터 레이어를 지원합니다.
- **히스토리 시스템:** 변경 사항이 생길 때마다 프로젝트의 전체 상태 스냅샷을 캡처하여 안정적인 Undo/Redo 기능을 제공합니다.
- **프로젝트 내보내기/불러오기:** 에디터의 상태와 레이어 데이터를 하나의 JSON 프로젝트 파일(.json)로 저장(Export)하고 불러올(Load) 수 있습니다.

---

## 2. 기술 스택 (Technology Stack)
- **Core Library:** React 19.x
- **Development Tool/Bundler:** Vite 6.x (TypeScript 개발 모드 빌드 지원)
- **Canvas engine:** Fabric.js v6.x (객체 지향형 HTML5 캔버스 프레임워크)
- **Language:** TypeScript 5.7.x
- **Icons:** Lucide React
- **Styling:** Vanilla CSS (`src/styles.css`) - 테일윈드나 CSS-in-JS 없이 단일 CSS 구조로 화면 스타일 및 반응형 레이아웃 관리.

---

## 3. 디렉토리 구조 (Directory Structure)

```text
/ (Project Root)
├── public/                     # 정적 에셋 폴더
│   └── assets/                 # 이미지, 배경, 스티커, 오버레이 등의 에셋 및 메니페스트
│       ├── manifest.json       # 에셋 카테고리별 하위 메니페스트 정보 통합
│       ├── ui-overlays/        # UI 장식용 SVG 에셋들 (Music, Bottom Nav 등)
│       └── ...
├── src/                        # 애플리케이션 소스 코드
│   ├── App.tsx                 # 최상위 컴포넌트 (useFabricEditor, EditorShell 조율)
│   ├── main.tsx                # 엔트리 포인트
│   ├── styles.css              # 애플리케이션의 핵심 Vanilla CSS 스타일 시트
│   ├── components/             # UI 컴포넌트 폴더
│   │   ├── layout/             # EditorShell, TopBar, RightSidebar 등 전반적 레이아웃 컴포넌트
│   │   ├── panels/             # PropertiesPanel(활성화된 탭 및 도구별 속성 패널)
│   │   └── *Panel.tsx          # 각 레이어 및 도구에 대응하는 설정 패널 (Layer, Text, Shape, Crop 등)
│   ├── constants/              # 시스템 상수 폴더 (Canvas 크기 기본값, 프리셋, 디폴트 스타일 등)
│   ├── hooks/                  # 비즈니스 로직 및 Fabric.js 조작 훅 폴더
│   │   ├── useFabricEditor.ts  # 최상위 Fabric 상태 관리 훅 (각 서브 훅들을 조합하여 에디터 API 노출)
│   │   ├── useCanvasBackground.ts # 배경 모드(단색, 이미지, 투명) 및 핏(Fit) 속성 처리
│   │   ├── useImageLayer.ts    # 이미지 추가, 클리핑, 자르기(Crop), 필터 및 속성 처리
│   │   ├── useCollageLayer.ts  # 콜라주 격자 템플릿 처리 및 셀 안 이미지 배치/포커스 줌 제어
│   │   ├── useTextLayer.ts     # 텍스트 추가, 서체 로딩, 그림자, 텍스트 배경박스 처리
│   │   ├── useShapeLayer.ts    # 벡터 도형 추가 및 그라데이션/그림자 채우기
│   │   ├── useAdjustmentLayer.ts # 단색 및 그라데이션 필터 조정 레이어
│   │   ├── useLayerManagement.ts # 레이어 정렬(Z-Index), 삭제, 잠금, 복제 처리
│   │   ├── useExport.ts        # 프로젝트 내보내기/불러오기(JSON) 및 이미지 익스포트(PNG/JPEG)
│   │   └── useHistory.ts       # 히스토리 스택 관리 (Undo/Redo)
│   ├── types/                  # TypeScript 정의 폴더 (layers.ts, editor-ui.ts)
│   └── utils/                  # 캔버스 렌더링 헬퍼 및 유틸리티 폴더
│       ├── fabricHelpers.ts    # Fabric 객체 메타데이터(data) 읽기/쓰기, 클리핑, 그림자 처리 핵심 함수군
│       ├── clipFactories.ts    # 클리핑 마스크 패스 생성 팩토리
│       ├── collageLayouts.ts   # 콜라주 격자 계산식 및 프리셋 레이아웃 데이터
│       ├── customSvgShapeData.ts # 사용자 정의 SVG 도형의 패스(path) 데이터 백업
│       └── image.ts            # 이미지 업로드 크기 조절, 다운로드, SVG 크기 보정(ensureSvgSizing)
└── tsconfig.json               # TypeScript 컴파일 속성 정의
```

---

## 4. 주요 작업 및 설계 규칙 (Principal Coding Rules)

### ① Fabric.js 객체 메타데이터 동기화
- Fabric.js의 `FabricObject` 내부 상태와 React 컴포넌트의 상태 불일치를 막기 위해, 모든 캔버스 내 레이어 객체는 **`FabricLayerObject`** 인터페이스를 따르며, `data` 필드(`FabricLayerMetadata`)를 통해 고유 ID, 레이어 이름, 블렌딩 모드, 필터 속성 등의 메타데이터를 소유합니다.
- `src/utils/fabricHelpers.ts`에 정의된 `getMetadata(object)` 및 `setMetadata(object, metadata)`를 사용하여 메타데이터에 접근하고 동기화해야 합니다.

### ② 서브 훅 위임 패턴 (Delegation Sub-hooks)
- 에디터 기능이 방대하기 때문에 `useFabricEditor.ts` 훅에 모든 코드를 작성하지 않고, 기능군에 맞게 서브 훅(`useImageLayer`, `useTextLayer` 등)을 분리하여 상태와 콜백 함수들을 분산 배치합니다.
- 최상위 `useFabricEditor`는 캔버스 참조값(`fabricCanvasRef`), 레이어 상태 스냅샷(`layers`), 히스토리 저장 트리거(`triggerSaveHistory`)를 서브 훅으로 전달하여 동작을 조율합니다.

### ③ SVG 에셋 로딩 및 잘림 방지 규칙 (`ensureSvgSizing`)
- **버그 원인:** 브라우저 내부 메모리에서 `viewBox`만 존재하고 `width`/`height` 속성이 정의되지 않은 SVG를 `FabricImage.fromURL`로 직접 로드할 때 브라우저 기본 해상도(300x150)로 고정되어 종횡비가 망가지고 이미지가 잘리는 현상이 발생합니다.
- **해결 규칙:** 
  1. 외부 및 빌트인 SVG 에셋 경로를 캔버스에 추가할 때, 먼저 `src/utils/image.ts`의 **`ensureSvgSizing(url)`**을 거치도록 합니다. 이 함수는 SVG 파일의 `viewBox` 값을 파싱해 누락된 `width`, `height` 속성을 명시적으로 주입한 후 Blob URL로 변환해 줍니다.
  2. 로컬에서 SVG 파일을 직접 업로드할 때는 래스터화(rasterization)를 방지하기 위해 일반 이미지 리사이즈 프로세스를 우회하고, 원본 벡터 데이터를 그대로 살린 상태에서 크기 값만 보정하여 Blob URL로 만들어 캔버스에 공급합니다.
  3. 로드된 레이어를 프로젝트 JSON 파일로 저장할 때는 일시적인 Blob URL 대신 persistent한 에셋 원본 URL(`asset.src`, `/assets/ui-overlays/...`)이 메타데이터(`source` 또는 `src` 필드)에 보존되도록 구성해야 합니다.

### ④ 스냅샷 기반 히스토리 관리
- 변경 사항이 발생할 때마다 캔버스 개별 객체들의 상대적인 변경점을 수집하는 대신, 전체 캔버스의 구성을 반영하는 **`CollageProjectFile`** 형태의 풀 스냅샷 데이터 구조로 추출하여 히스토리 스택(`undoStack`, `redoStack`)에 보관합니다.
- 이를 통해 캔버스의 상태가 꼬이거나 손실되는 일 없이 완벽하고 직관적인 Undo/Redo 실행을 보장합니다.

### ⑤ 이벤트 버블링 방지 (UI Overlap Handling)
- 레이어 목록이나 패널 내부의 특정 엘리먼트(예: Opacity 조절 슬라이더, 드롭다운 메뉴 등)를 제어할 때 에디터의 마우스 드래그/이동 액션이 의도치 않게 작동하는 현상을 막기 위해, 해당 UI 컴포넌트의 컨트롤 콘테이너 영역에 이벤트 버블링 차단 코드(`onPointerDown={(e) => e.stopPropagation()}`)를 누락 없이 적용해야 합니다.
