# ElfKey Studio

[웹사이트 열기](https://codevilot.github.io/elfkey-web/) · [배포 상태](https://github.com/codevilot/elfkey-web/actions/workflows/pages.yml)

![Verify and deploy GitHub Pages](https://github.com/codevilot/elfkey-web/actions/workflows/pages.yml/badge.svg)

React + TypeScript + Vite로 만든 순수 WebHID 앱입니다. Electron이나 로컬 USB 중계 서버 없이 브라우저에서 장치와 직접 통신합니다.

```sh
npm ci
npm run dev
```

데스크톱 Chrome / Edge에서 http://localhost:5173 을 엽니다. HTTPS 배포도 지원합니다.

개발 중 HMR로 테스트 화면이 갱신되는 것을 피하려면 고정 빌드를 사용합니다.

```sh
npm run build
npm run preview
```

## 폴더와 컴포넌트

```text
src/
  app/                  # 앱 구성, 기능 조합, 스타일 진입점
    App.tsx
  components/ui/        # 공용 Button, SVG Icon, 파일 다운로드
  features/
    device/             # USB 연결 상태와 세션 관리, 장치 카드, SVG 장치 그림
    keymap/             # 키 편집, 기기 현재 값과 초안 비교, 미저장 변경 복원
    testing/            # 실제 브라우저 입력 테스트
    diagnostics/        # 보고서 구조, 로그, 원본 백업 다운로드
  lib/elfkey/           # 화면과 독립된 타입·모델·프로토콜·WebHID 전송
  styles/               # 토큰, 레이아웃, 장치, 편집기, 피드백, 반응형 스타일
public/                 # 배포할 정적 분석 정보
```

통신 계층은 React에 의존하지 않습니다. 기능별 Hook이 상태와 작업을 담당하고, UI 컴포넌트는 props와 이벤트로 연결합니다. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`를 적용했습니다. 배포용 `dist/`는 Vite 빌드 결과이며 직접 수정하지 않습니다.

## 사용자 흐름

1. USB 장치를 선택합니다. 설정용 인터페이스를 구분하고 실제 HID 보고서의 ID와 길이를 확인합니다. FS23-P의 3553:B001은 기본 입력 인터페이스와 설정 인터페이스가 분리되어 있고 설정용 Report ID는 0입니다.
2. 모델과 기기에 저장된 키 값을 읽습니다. 풋스위치는 SVG 페달 그림, 매크로 키보드는 키 그림으로 표시합니다.
3. 그림이나 카드에서 대상을 고르고 새 키·조합키를 지정합니다. 현재 저장값과 변경 예정값을 구분합니다. 저장하지 않은 변경은 노란 안내로 강조합니다.
4. 대상 이름과 새 키가 적힌 저장 버튼을 누릅니다. 원본 읽기/백업 → 저장 → 읽기 비교 → 설정용 HID 핸들 해제를 수행합니다. 다음 저장 때 핸들을 다시 엽니다.
5. 입력 칸에서 실제 출력을 확인합니다. 저장 데이터 읽기 일치와 실제 페달 출력 확인은 서로 다른 검증입니다.

이미 허용한 장치는 페이지를 열 때 자동 재연결하며, 같은 모델의 미저장 변경은 브라우저에서 복원합니다. 명시적으로 연결 해제하면 자동 재연결을 끕니다. 상단 로고는 페이지를 다시 불러오지 않습니다.

전체 플래시가 필요한 구형 모델은 모든 키를 원본으로 백업한 뒤 변경하지 않은 키도 재작성·검증합니다. 전원 차단 중의 원자성은 장치 펌웨어에 의존합니다.

## 지원 범위와 검증

USB 일반 키·조합키 재지정과 RD_Dongle/Delta21 수신기의 추가 모델 조회 및 64바이트 응답 처리를 구현했습니다. MK321/MK424/MK623/MK1225, HK, FootSwitch/FS, DIY, AnyKey 등의 모델 규칙을 설치 파일에서 복원했습니다.

**모든 모델에서 실제 동작을 검증한 상태는 아닙니다.** 실제 FS23-P_V5.7에서 모델과 저장된 키 데이터(D/B/C) 조회를 확인했습니다. 실제 페달 출력은 사용자 확인이 남아 있습니다. Bluetooth 직접 연결, 문자열·매크로·마우스·LED·펌웨어 업데이트는 구현하지 않았습니다.

```sh
npm run check
npm test
npm run build
```

모델별 키 번호는 기존 앱 `init` 출력과 280개 합성 사례로 대조했습니다. 실물 280종 테스트라는 의미는 아닙니다. 패킷·읽기 검증·백업 실패·플래시 보존·연결 해제·Report ID·미저장 변경 복원에 대한 자동 테스트가 있습니다. 브라우저에서는 가상 USB를 사용해 SVG 선택, 실제 저장값 표시, 연속 저장, 세션 해제, 입력 칸 포커스, 새로고침 후 재연결 및 미저장 초안 복원을 확인했습니다.

설치 파일, 제조사 앱 코드·바이트코드 및 역분석 도구는 배포하지 않습니다.

## GitHub Pages

주소: https://codevilot.github.io/elfkey-web/

`main`에 push하면 GitHub Actions가 `npm ci` → 자동 테스트 → 전체 TypeScript 검사 → Vite 빌드 → Pages 배포를 실행합니다. PR에서는 배포 없이 같은 검사를 실행합니다. 저장소 Settings → Pages의 배포 소스는 **GitHub Actions**입니다. API 키나 별도 서버가 필요하지 않습니다.

CI에서는 `BASE_PATH=/elfkey-web/`을 사용해 저장소 하위 경로에 맞게 자산 주소를 생성합니다. 로컬 개발은 기본 `/` 경로를 사용합니다. Pages에서 로컬과 같은 USB 권한을 다시 허용해야 합니다.

Node.js 24를 권장합니다 (`.nvmrc`). 직접 Pages용 결과를 확인하려면 다음과 같이 실행합니다.

```sh
BASE_PATH=/elfkey-web/ npm run build
npm run preview
# http://localhost:5173/elfkey-web/
```

배포에는 소스와 빌드된 정적 파일만 사용합니다. 제조사 ZIP, 역분석 자료, 로컬 장치 정보 및 기존 호스팅 메타데이터는 저장소에 포함하지 않습니다.
