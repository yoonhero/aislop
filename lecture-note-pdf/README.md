# lecture-note-pdf

교수님 lecture note website를 원문 보존형 PDF로 다시 구성한 프로젝트다. 원문 내용은 가능한 한 유지하고, `★ 중요` 표시, `추가 문제`, 후속편의 수치선형대수 사이드바를 별도로 덧붙인다.

## 산출물

- `dist/abstract-linear-algebra-1-1-to-2-3.html`
- `dist/abstract-linear-algebra-1-1-to-2-3.pdf`
- `dist/abstract-linear-algebra-3-4.html`
- `dist/abstract-linear-algebra-3-4.pdf`

## 빌드

```bash
python3 scripts/build.py
python3 scripts/build_sequel.py
```

`pandoc`와 macOS의 Google Chrome이 필요하다. 빌드 과정은 다음 순서로 동작한다.

1. 원문 웹페이지를 가져온다.
2. 원문 보존형 Markdown을 자동 생성한다.
3. HTML과 PDF를 생성한다.

`build.py`는 1.1-2.3, `build_sequel.py`는 3-4장 후속편을 만든다.

## 라이선스

원문은 김도형 교수님의 웹문서이며 `CC BY-SA 4.0`으로 배포된다. 이 프로젝트의 생성 산출물도 그 조건을 따르도록 출처와 라이선스를 문서 안에 명시한다.

후속편의 `Numerical Aside`는 fast.ai의 `numerical-linear-algebra` 저장소를 참고해 개념적 연결만 요약한다.

## 원문 범위

- 1.1 <https://dohyeong-kim.github.io/abstract-linear-algebra/01-01-vector-spaces.html>
- 1.2 <https://dohyeong-kim.github.io/abstract-linear-algebra/01-02-basis.html>
- 1.3 <https://dohyeong-kim.github.io/abstract-linear-algebra/01-03-linear-transformation.html>
- 1.4 <https://dohyeong-kim.github.io/abstract-linear-algebra/01-04-quotients-cokernel.html>
- 2.1 <https://dohyeong-kim.github.io/abstract-linear-algebra/02-01-isomorphisms.html>
- 2.2 <https://dohyeong-kim.github.io/abstract-linear-algebra/02-02-isomorphism-theorems.html>
- 2.3 <https://dohyeong-kim.github.io/abstract-linear-algebra/02-03-product-projection-dual.html>
- 3.1 <https://dohyeong-kim.github.io/abstract-linear-algebra/03-01-eigen.html>
- 3.2 <https://dohyeong-kim.github.io/abstract-linear-algebra/03-02-char.html>
- 3.3 <https://dohyeong-kim.github.io/abstract-linear-algebra/03-03-cayley.html>
- 3.4 <https://dohyeong-kim.github.io/abstract-linear-algebra/03-04-triangulation-and-jordan.html>
- 4.1 <https://dohyeong-kim.github.io/abstract-linear-algebra/04-01-tensor-product.html>
- 4.2 <https://dohyeong-kim.github.io/abstract-linear-algebra/04-02-real-to-complex.html>
