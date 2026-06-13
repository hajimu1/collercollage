# 도형/SVG 일괄 추가 작업 규칙

이 문서는 콜라주/이미지 편집기 프로젝트에서 도형을 추가할 때 따라야 하는 기준 문서다.

특히 사용자가 SVG 여러 개를 한 번에 제공하고 “추가해줘”라고 요청했을 때,  
SVG를 무조건 그대로 넣거나 strokeWidth만 적용하지 말고, 도형 구조를 먼저 판별한 뒤 안전한 렌더링 방식을 선택해야 한다.

---

# 0. 최우선 원칙

## 결론

SVG 도형 추가의 핵심은 “SVG를 넣는 것”이 아니라,  
각 SVG가 어떤 구조인지 판별하고 그에 맞는 렌더 전략을 고르는 것이다.

특히 얇은 선처럼 보이는 SVG는 실제로는 선이 아닐 수 있다.  
겉보기에는 선이어도 코드상으로는 아주 얇은 폐곡선 path일 수 있으며, 이 경우 Fabric stroke를 적용하면 선이 한쪽으로 밀리거나, 선택 영역이 이상하게 잡히거나, 굵기가 의도대로 적용되지 않는다.

---

# 1. 이번 프로젝트에서 이미 확인된 문제

## 별빛 도형 문제

별빛 SVG는 겉으로는 얇은 선 4개처럼 보였지만, 실제로는 다음 구조였다.

```text
진짜 선 4개 ❌
아주 얇은 면 path 4개 ✅
```

그래서 `strokeWidth`를 주면 Fabric이 중심선 기준으로 굵히지 않고,  
얇은 면 path의 외곽선을 기준으로 stroke를 둘렀다.

그 결과:

```text
검은 선이 노란 선의 중앙에 오지 않음
선이 한쪽으로 밀려 보임
굵기 10px 제한을 걸어도 해결 안 됨
outline/fill을 따로 만들어도 여전히 밀림
Line으로 바꿔도 Fabric bounds 문제 때문에 안정적이지 않음
```

최종 해결은 stroke가 아니라 geometry였다.

```text
SVG path 사용 ❌
Fabric Line stroke 사용 ❌
strokeWidth로 외곽선 만들기 ❌

중앙 정렬된 Rect 막대 4개로 재구성 ✅
검은 막대를 아래에 깔고 노란 막대를 위에 얹기 ✅
strokeWidth: 0 ✅
fill만 사용 ✅
```

---

# 2. 도형 추가 시 반드시 먼저 해야 하는 것

SVG를 받으면 바로 코드에 넣지 말고, 각 SVG를 아래 기준으로 분류한다.

## SVG 구조 판별

각 SVG마다 다음을 확인한다.

```text
1. 닫힌 면 도형인가?
2. 실제 line/polyline 계열인가?
3. path지만 선처럼 보이는 얇은 면인가?
4. stroke가 이미 포함된 SVG인가?
5. fill만으로 완성되는 아이콘인가?
6. 색상 변경이 필요한가?
7. 선 굵기 조절이 필요한가?
8. 선택 영역이 실제 도형 크기와 맞아야 하는가?
```

---

# 3. 도형 분류표

SVG 10개를 한 번에 받으면 반드시 아래 표처럼 하나씩 분류한다.

| 분류 | 설명 | 예시 | 권장 렌더 방식 |
|---|---|---|---|
| `basicShape` | 기본 폐곡선 도형 | 원, 사각형, 둥근 사각형, 별, 하트 | Fabric 기본 도형 + native stroke |
| `solidIcon` | 면 중심 아이콘 | 말풍선, 구름, 배지, 리본 | SVG Path fill + 제한된 stroke |
| `thinIcon` | 얇은 선형 장식 | 별빛, 반짝이, 십자선, 스파크, 방사선 | stroke 금지 우선, geometry 재구성 |
| `fillOnly` | 선 없이 색면만 필요한 도형 | 스티커형 아이콘, 실루엣 | fill만 사용 |
| `complexDecorative` | 복잡한 장식 SVG | 꽃, 프레임, 레이스, 장식 테두리 | 개별 분석 후 renderer 선택 |

---

# 4. stroke profile 규칙

현재 도형 선 굵기 규칙은 profile 기반으로 관리한다.

```ts
basic
solidIcon
thinIcon
fillOnly
```

## 권장 profile 규칙

| profile | 최대 굵기 | 사용 대상 | 주의사항 |
|---|---:|---|---|
| `basic` | 80px | 원, 사각형, 별, 하트 | Fabric native stroke 허용 |
| `solidIcon` | 64px | 면 중심 아이콘 | SVG path stroke 가능하나 테스트 필수 |
| `thinIcon` | 10px | 얇은 선형 장식 | stroke 직접 적용 금지 우선 |
| `fillOnly` | 0px | 선 없는 도형 | stroke UI는 비활성 또는 0 처리 |

---

# 5. 가장 중요한 규칙: thinIcon

## thinIcon은 stroke를 직접 주면 안 된다

`thinIcon`은 다음 의미로 해석한다.

```text
얇은 SVG에 strokeWidth를 10px까지 주자 ❌
얇은 장식 도형은 stroke 없이 geometry로 굵기를 구현하자 ✅
```

특히 별빛, 반짝이, 십자선, 방사형 선, 얇은 sparkle 계열은 SVG path 그대로 쓰지 말고, 가능하면 중심 기준 geometry로 다시 만든다.

---

# 6. thinIcon 구현 방식

## 성공한 방식

얇은 선형 도형은 아래처럼 만든다.

```text
검은 외곽 도형 = 두꺼운 fill 도형
노란 내부 도형 = 얇은 fill 도형
둘 다 strokeWidth: 0
둘 다 originX: center
둘 다 originY: center
둘 다 같은 중심점 사용
```

## 예시: 별빛

별빛은 이렇게 구성한다.

```text
가로 막대
세로 막대
대각선 막대 /
대각선 막대 \
```

각 막대는 `Rect`로 만든다.

```text
strokeWidth: 0
fill만 사용
originX: center
originY: center
left: 0
top: 0
angle만 다르게 설정
```

굵기 적용 개념:

```text
outlineThickness = 사용자가 선택한 선 굵기
fillThickness = 기본 내부선 두께

검은 막대 두께 = fillThickness + outlineThickness * 2
노란 막대 두께 = fillThickness
```

이 구조에서는 Fabric stroke bounds 계산을 사용하지 않으므로, 선이 한쪽으로 밀릴 가능성이 낮다.

---

# 7. SVG 10개 일괄 추가 시 작업 순서

사용자가 SVG 여러 개를 제공하면 다음 순서로 작업한다.

## 1단계: 파일/라벨 목록화

먼저 제공된 SVG를 전부 목록화한다.

예시:

```text
sparkle.svg / 라벨: 별빛
flower.svg / 라벨: 꽃
ribbon.svg / 라벨: 리본
cloud.svg / 라벨: 구름
burst.svg / 라벨: 반짝 폭발
```

라벨은 UI에 표시되는 이름으로 사용한다.  
shapeType은 코드용 ID로 변환한다.

예시:

| 라벨 | shapeType |
|---|---|
| 별빛 | `sparkle` |
| 꽃 | `flower` |
| 리본 | `ribbon` |
| 구름 | `cloud` |
| 반짝 폭발 | `burstSparkle` |

shapeType은 영어 소문자 camelCase 또는 kebab 없이 TS 타입에 맞춰 사용한다.

---

## 2단계: 각 SVG 구조 분석

각 SVG를 열어서 다음을 본다.

```text
path가 면인지
path가 선처럼 보이는 얇은 면인지
stroke 속성이 이미 있는지
fill이 있는지
viewBox가 정상인지
좌표가 지나치게 큰지
도형이 viewBox 중앙에 있는지
```

특히 아래 경우는 위험하다.

```text
선처럼 보이는데 path가 닫힌 형태
매우 얇은 path
stroke-linecap이 필요한 장식선
원본 viewBox보다 실제 path가 한쪽에 치우친 SVG
```

---

## 3단계: renderer 결정

각 도형마다 renderer를 하나씩 지정한다.

| renderer | 의미 |
|---|---|
| `nativeStroke` | Fabric 기본 stroke 사용 |
| `svgPathStroke` | SVG path에 제한된 stroke 사용 |
| `centeredGeometry` | stroke 없이 Rect/Polygon 등 geometry로 재구성 |
| `fillOnly` | fill만 사용 |
| `customRenderer` | 도형별 전용 함수 작성 |

---

## 4단계: profile 결정

renderer와 별개로 stroke profile도 지정한다.

| 도형 성격 | profile |
|---|---|
| 기본 도형 | `basic` |
| 면 아이콘 | `solidIcon` |
| 얇은 장식선 | `thinIcon` |
| 선 없음 | `fillOnly` |

중요:

```text
profile은 굵기 제한 규칙이다.
renderer는 실제 그리는 방식이다.
둘을 섞어 생각하지 않는다.
```

예시:

```text
sparkle:
  profile: thinIcon
  renderer: centeredGeometry
```

---

# 8. 코드 수정 위치

도형을 추가할 때 일반적으로 수정되는 파일은 다음이다.

```text
src/types/layers.ts
src/components/ShapePanel.tsx
src/utils/shapeStrokeProfiles.ts
src/hooks/useFabricEditor.ts
```

단, 프로젝트 구조가 바뀌었을 수 있으므로 항상 현재 파일을 기준으로 확인한다.

---

# 9. 파일별 수정 원칙

## src/types/layers.ts

`ShapeType`에 새 도형 ID를 추가한다.

예시:

```ts
export type ShapeType =
  | 'circle'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'star'
  | 'heart'
  | 'sparkle'
  | 'flower'
  | 'ribbon';
```

주의:

```text
기존 타입 삭제 금지
기존 이름 변경 금지
순서 변경은 최소화
```

---

## src/components/ShapePanel.tsx

도형 버튼 목록에 라벨과 아이콘을 추가한다.

예시:

```ts
{ type: 'flower', label: '꽃', icon: Flower }
```

주의:

```text
라벨은 사용자가 제공한 라벨 우선
lucide-react 아이콘이 없으면 임시 아이콘 사용 가능
도형 렌더링과 패널 아이콘은 별개다
```

---

## src/utils/shapeStrokeProfiles.ts

도형별 profile을 지정한다.

예시:

```ts
export const getShapeStrokeProfile = (shapeType?: ShapeType): ShapeStrokeProfileId => {
  if (shapeType === 'sparkle') return 'thinIcon';
  if (shapeType === 'flower') return 'solidIcon';
  if (shapeType === 'sticker') return 'fillOnly';
  return 'basic';
};
```

주의:

```text
thinIcon 최대 굵기는 10px 유지
fillOnly는 0px 유지
basic/solidIcon 수치는 임의 변경 금지
```

---

## src/hooks/useFabricEditor.ts

실제 도형 생성 로직을 추가한다.

일반적인 위치:

```ts
const createShapeObject = (...)
```

또는 도형 생성 factory 내부.

주의:

```text
기존 도형 동작 변경 금지
sparkle처럼 이미 성공한 renderer는 건드리지 말 것
새 도형은 분기 추가 방식으로 최소 수정
도형별 renderer를 분리하면 더 안정적
```

---

# 10. renderer 선택 상세 규칙

## A. nativeStroke

사용 대상:

```text
원
사각형
둥근 사각형
별
하트
일반적인 폐곡선 도형
```

사용 방식:

```text
fill: 사용자가 선택한 채우기 색
stroke: 사용자가 선택한 선 색
strokeWidth: profile로 clamp된 값
strokeUniform: true
```

주의:

```text
이 방식은 기본 도형에만 안정적이다.
얇은 SVG 장식에는 사용하지 않는다.
```

---

## B. svgPathStroke

사용 대상:

```text
면 중심 SVG 아이콘
두께가 충분한 실루엣 도형
닫힌 path 기반 도형
```

가능 예시:

```text
구름
리본
배지
말풍선
스티커형 단순 아이콘
```

주의:

```text
얇은 path에는 사용 금지
stroke 적용 후 중심이 밀리는지 확인
선 굵기 최대값은 profile로 clamp
padding box 필요 여부 확인
```

---

## C. centeredGeometry

사용 대상:

```text
얇은 선형 장식
별빛
반짝이
십자선
방사선
선 여러 개로 이루어진 장식
```

구현 원칙:

```text
strokeWidth 사용 금지
outline도 fill 도형으로 만든다
내부선도 fill 도형으로 만든다
모든 파트 origin center
모든 파트 같은 좌표 중심 사용
```

성공 패턴:

```text
outlineParts 먼저 생성
fillParts 나중에 생성
Group 안에서 outline이 아래, fill이 위
```

예시 구조:

```text
Group
 ├─ paddingBox
 ├─ outlinePart 가로
 ├─ outlinePart 세로
 ├─ outlinePart 대각선 /
 ├─ outlinePart 대각선 \
 ├─ fillPart 가로
 ├─ fillPart 세로
 ├─ fillPart 대각선 /
 └─ fillPart 대각선 \
```

---

## D. fillOnly

사용 대상:

```text
선이 없어야 예쁜 도형
스티커 느낌 도형
이미 내부 디테일이 있는 도형
```

규칙:

```text
strokeWidth는 항상 0
선 색 UI는 보여도 실제 적용하지 않음
또는 선 없음 상태로 강제
```

---

# 11. 선택 영역 규칙

선택 영역은 도형 사용성에 매우 중요하다.

## 반드시 지켜야 하는 것

```text
선택 영역이 실제 도형보다 지나치게 크면 안 된다.
선택 영역이 도형을 자르면 안 된다.
0px 상태와 최대 굵기 상태 모두 확인한다.
```

## padding box 사용 기준

stroke나 외곽 geometry가 잘릴 수 있는 도형은 투명 padding box를 둘 수 있다.

```text
paddingBox fill: rgba(0,0,0,0)
strokeWidth: 0
selectable: false
evented: false
```

주의:

```text
paddingBox 좌표계와 실제 도형 좌표계를 섞지 말 것
paddingBox만 원본 SVG 좌표이고 도형 group은 0,0이면 선택 영역이 망가질 수 있음
```

---

# 12. 절대 하면 안 되는 것

다음 방식은 피한다.

```text
얇은 SVG path에 strokeWidth만 키우기
strokeWidth * 2로 바깥선 흉내내기
fill path와 outline path를 서로 다른 좌표계로 그룹화하기
전체 group scale로 선 굵기 흉내내기
Fabric Line stroke로 얇은 장식선 해결 기대하기
도형 10개에 같은 stroke 규칙 일괄 적용하기
profile만 보고 renderer를 결정하기
```

특히 금지:

```text
thinIcon = SVG path + strokeWidth 10px
```

이 방식은 별빛 문제를 재발시킬 수 있다.

---

# 13. SVG 10개를 한 번에 받을 때 보고 형식

작업 전 또는 작업 후 반드시 아래 형식으로 보고한다.

```md
## 도형 추가 분석표

| 라벨 | shapeType | 구조 판단 | profile | renderer | 주의사항 |
|---|---|---|---|---|---|
| 별빛 | sparkle | 얇은 선형 장식 | thinIcon | centeredGeometry | stroke 사용 금지 |
| 꽃 | flower | 복잡한 면 장식 | solidIcon | svgPathStroke 또는 fillOnly | 테스트 필요 |
| 리본 | ribbon | 면 중심 아이콘 | solidIcon | svgPathStroke | stroke 가능 |
```

---

# 14. 작업 전 확인 질문이 필요한 경우

아래 상황이면 바로 구현하지 말고 사용자에게 확인한다.

```text
라벨이 없거나 중복됨
SVG가 너무 복잡해서 단색화가 어려움
원본 색을 유지해야 하는지 불명확함
채우기/선 색을 사용자 팔레트와 연동해야 하는지 불명확함
선 굵기 조절이 필요한 도형인지 불명확함
도형이 장식용인지 실제 프레임/마스크용인지 불명확함
```

질문 예시:

```text
이 SVG들은 전부 채우기/선 색을 패널 색상으로 바꾸는 방식인가요,
아니면 원본 SVG 색을 유지해야 하나요?
```

---

# 15. 테스트 기준

도형 추가 후 반드시 아래를 확인한다.

## 기본 테스트

```text
도형 버튼이 패널에 표시되는가
라벨이 맞는가
클릭 시 캔버스 중앙에 생성되는가
선택 영역이 정상인가
이동/확대/축소가 되는가
레이어 목록에 정상 표시되는가
```

## 스타일 테스트

```text
채우기 색 변경이 적용되는가
선 색 변경이 적용되는가
굵기 0px이 정상인가
굵기 중간값이 정상인가
굵기 최대값이 정상인가
```

## 얇은 도형 테스트

thinIcon 계열은 특히 아래를 본다.

```text
선이 한쪽으로 밀리지 않는가
outline이 내부 fill을 잡아먹지 않는가
0px일 때 너무 흐릿하거나 사라지지 않는가
10px일 때 너무 뭉개지지 않는가
선택 영역이 과하게 커지지 않는가
```

---

# 16. 패치 원칙

## 최소 수정

항상 현재 파일을 기준으로 최소 수정한다.

```text
관련 없는 리팩터링 금지
기존 도형 동작 변경 금지
기존 UI 구조 변경 금지
기존 타입 이름 변경 금지
이미 성공한 sparkle renderer 임의 수정 금지
```

## 새 도형 추가 방식

가능하면 다음 구조로 추가한다.

```text
1. ShapeType 추가
2. ShapePanel 버튼 추가
3. stroke profile 지정
4. createShapeObject 분기 추가
5. 필요 시 renderer helper 함수 추가
6. 테스트
```

---

# 17. 향후 권장 구조

도형이 많아지면 `useFabricEditor.ts` 안에 모든 도형 생성 로직을 계속 넣지 말고, 도형 renderer를 분리하는 것이 좋다.

권장 구조 예시:

```text
src/utils/shapeRenderers/
  createBasicShape.ts
  createSvgPathShape.ts
  createThinGeometryShape.ts
  createSparkleShape.ts
  shapeRendererRegistry.ts
```

개념:

```ts
shapeType: 'sparkle'
profile: 'thinIcon'
renderer: 'centeredGeometry'
```

또는:

```ts
const SHAPE_RENDERER_REGISTRY = {
  circle: 'nativeStroke',
  rectangle: 'nativeStroke',
  heart: 'nativeStroke',
  sparkle: 'centeredGeometry',
  flower: 'svgPathStroke',
  sticker: 'fillOnly',
};
```

이렇게 하면 도형이 10개, 20개로 늘어도 관리가 쉽다.

---

# 18. 도형 추가 시 최종 보고 형식

작업 완료 후에는 반드시 아래를 보고한다.

```md
## 수정 파일

- src/types/layers.ts
- src/components/ShapePanel.tsx
- src/utils/shapeStrokeProfiles.ts
- src/hooks/useFabricEditor.ts

## 추가 도형

| 라벨 | shapeType | profile | renderer |
|---|---|---|---|
| 별빛 | sparkle | thinIcon | centeredGeometry |
| 꽃 | flower | solidIcon | svgPathStroke |

## 검증

- TypeScript 체크 통과 여부
- 빌드 통과 여부
- 로컬 확인 필요 항목
- 알려진 제한 사항
```

---

# 19. 핵심 요약

도형 추가의 핵심 규칙은 다음이다.

```text
1. SVG를 바로 넣지 않는다.
2. SVG 구조를 먼저 판별한다.
3. profile과 renderer를 분리해서 결정한다.
4. thinIcon은 stroke 직접 적용을 피한다.
5. 얇은 선형 도형은 geometry로 재구성한다.
6. 선택 영역과 중심 정렬을 반드시 확인한다.
7. 도형 10개를 한 번에 받아도 같은 규칙을 일괄 적용하지 않는다.
8. 각 도형마다 구조 판단표를 만든다.
```

최종 원칙:

```text
얇은 장식 도형은 stroke로 꾸미는 것이 아니라,
처음부터 두께가 있는 geometry로 만든다.
```
