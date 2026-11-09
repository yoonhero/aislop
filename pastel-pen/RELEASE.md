# Firefox 자동 업데이트

HiBulb은 같은 확장 ID를 유지하고 Firefox의 자체 배포 업데이트 채널을 사용한다. 업데이트 주소는 확장 매니페스트의 `browser_specific_settings.gecko.update_url`에 있다.

1. Mozilla Add-ons 개발자 계정에서 자체 배포 서명용 API 자격 증명을 발급받는다. GitHub 저장소의 Actions secrets에 `AMO_JWT_ISSUER`와 `AMO_JWT_SECRET`을 등록한다.
2. 배포할 커밋의 `pastel-pen/extension/manifest.json`에서 버전을 올리고, 같은 버전의 태그를 푸시한다. 현재 후보의 태그는 `pastel-pen-v0.8.12`이다.
3. GitHub Actions에서 서명과 게시가 끝나면 [업데이트 채널](https://github.com/yoonhero/aislop/releases/tag/pastel-pen-updates)의 서명된 XPI를 Firefox의 확장 관리자에서 기존 설치 위에 한 번 설치한다. 0.8.2에는 업데이트 주소가 없으므로 이 단계가 필요하다.
4. 다음 릴리스부터는 Firefox가 업데이트를 확인한다. 실제 수신을 검증할 때는 더 높은 버전을 배포한 뒤 확장 관리자의 업데이트 확인을 실행한다.

`pastel-pen-updates` 릴리스는 고정 주소로 사용되므로 유지한다. 각 배포는 버전별 XPI를 먼저 올린 다음 `updates.json`을 갱신한다. 이 릴리스의 에셋을 갱신할 수 있도록 저장소의 릴리스 불변 설정을 확인한다. Mozilla 검토를 기다리느라 CI가 끝난 경우, 개발자 허브에서 해당 버전의 서명된 XPI를 받아 같은 릴리스에 버전별 파일명으로 올린 뒤(첫 배포라면 해당 태그의 릴리스를 먼저 생성) 작업을 다시 실행할 수 있다.

워크플로는 Markdown과 KaTeX 번들을 재생성해 배포 파일과 비교하고, 빌드 방법이 담긴 소스 ZIP을 서명 요청에 첨부한다. 게시가 끝나면 공개 주소에서 업데이트 목록과 XPI를 다시 다운로드해 비교한다.

개발자 허브에서 첫 서명을 직접 요청할 때도 확장 ZIP과 검토용 소스 ZIP을 함께 제출한다. 검토용 소스 ZIP은 저장소 루트에서 `bash pastel-pen/build-review-source.sh <출력 폴더>`로 만들 수 있다.

[Mozilla 자체 배포 문서](https://extensionworkshop.com/documentation/publish/self-distribution/)
