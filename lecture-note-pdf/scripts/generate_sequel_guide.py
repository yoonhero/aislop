#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "study-guide-3-4.md"
sys.path.insert(0, str(ROOT / "scripts"))

import generate_source_guide as base  # noqa: E402


SECTIONS = [
    {"code": "3.1", "title": "고윳값, 고유벡터, 대각화", "slug": "03-01-eigen", "important": {2, 4, 5, 7}, "extras": [
        {"title": "추가 문제 1", "body": "유한차원 복소벡터공간의 선형변환 $T$가 서로 다른 $n$개의 고윳값을 가지면 대각화 가능함을 증명하시오."},
        {"title": "추가 문제 2", "body": "PageRank의 power method를 $Av=\\lambda v$ 문제로 해석하고, 확률행렬에서 지배적 고유벡터가 갖는 의미를 설명하시오."},
    ]},
    {"code": "3.2", "title": "행렬식과 특성다항식", "slug": "03-02-char", "important": {1, 3, 6, 8}, "extras": [
        {"title": "추가 문제 1", "body": "$2\\times2$ 행렬 $A$에 대하여 $p_A(t)=t^2-\\operatorname{tr}(A)t+\\det(A)$임을 직접 계산하시오."},
        {"title": "추가 문제 2", "body": "수치계산에서 $\\det(A)=0$ 판정보다 조건수나 분해법이 더 신뢰되는 이유를 예시와 함께 설명하시오."},
    ]},
    {"code": "3.3", "title": "케일리-해밀턴 정리와 최소다항식", "slug": "03-03-cayley", "important": {1, 2, 5, 7}, "extras": [
        {"title": "추가 문제 1", "body": "대각화 가능한 선형변환의 최소다항식이 서로 다른 일차인자의 곱임을 보이시오."},
        {"title": "추가 문제 2", "body": "행렬다항식 $p(A)$를 반복곱으로 계산하는 방식과 Horner 방식의 연산량 차이를 비교하시오."},
    ]},
    {"code": "3.4", "title": "삼각화와 조르당 표준형", "slug": "03-04-triangulation-and-jordan", "important": {1, 3, 4, 6}, "extras": [
        {"title": "추가 문제 1", "body": "하나의 조르당 블록 $J=\\lambda I+N$에 대해 $N^k$의 rank와 kernel 차원을 구하고, 블록 크기를 복원하는 방법을 설명하시오."},
        {"title": "추가 문제 2", "body": "수치선형대수에서 조르당 표준형보다 Schur 분해가 선호되는 이유를 안정성 관점에서 정리하시오."},
    ]},
    {"code": "4.1", "title": "텐서곱", "slug": "04-01-tensor-product", "important": {1, 2, 4, 5}, "extras": [
        {"title": "추가 문제 1", "body": "기저 $\\{v_i\\}$와 $\\{w_j\\}$가 주어졌을 때 $\\{v_i\\otimes w_j\\}$가 $V\\otimes W$의 기저가 되는 이유를 보편성질로 설명하시오."},
        {"title": "추가 문제 2", "body": "행렬곱을 텐서 수축으로 보고, NumPy broadcasting이 어떤 지표를 암묵적으로 복제하는지 작은 예제로 설명하시오."},
    ]},
    {"code": "4.2", "title": "실수에서 복소수로의 확장", "slug": "04-02-real-to-complex", "important": {1, 2, 3, 5}, "extras": [
        {"title": "추가 문제 1", "body": "실수 행렬 $A$를 복소수체 위로 확장했을 때, 실수 고유값과 복소 고유값의 의미가 어떻게 달라지는지 설명하시오."},
        {"title": "추가 문제 2", "body": "FFT가 복소수 스칼라 확장을 자연스럽게 사용하는 이유를 선형변환의 기저변환 관점에서 정리하시오."},
    ]},
]


INTRO = """---
title: "추상선형대수학 3-4장 교과서화 노트"
author: "김도형 원문 재구성 / Codex 편집"
date: "2026-04-27"
lang: "ko-KR"
---

# 안내

이 문서는 김도형 교수님의 웹 강의노트 *추상선형대수학: 벡터공간과 대수학의 원리* 중 `3.1`부터 `4.2`까지를 후속 교과서처럼 읽히도록 재구성한 것이다.

- 편집 원칙: 원문 흐름은 보존하고, 장별 관점, `★ 중요`, `추가 문제`, 수치선형대수 사이드바를 덧붙였다.
- 포함 범위: `3.1`, `3.2`, `3.3`, `3.4`, `4.1`, `4.2`
- 원문 출처: <https://dohyeong-kim.github.io/abstract-linear-algebra/frontmatter.html>
- 수치선형대수 참고: <https://github.com/fastai/numerical-linear-algebra>
- 저작권 및 이용허락: 김도형 원문은 CC BY-SA 4.0으로 배포된다. fast.ai 자료는 원문 링크를 통해 참고하고, 이 문서에서는 개념적 연결만 요약한다.

## 표시

- `★ 중요`: 다음 절과 계산 문제로 이어지는 핵심 원문 연습문제
- `추가 문제`: 추상 이론을 계산, 알고리즘, 응용과 연결하기 위해 덧붙인 문제
- `Numerical Aside`: fast.ai Computational Linear Algebra에서 얻을 수 있는 잡다하지만 유용한 계산 관점

## 원문 링크

| 절 | 링크 |
| --- | --- |
| 3.1 | <https://dohyeong-kim.github.io/abstract-linear-algebra/03-01-eigen.html> |
| 3.2 | <https://dohyeong-kim.github.io/abstract-linear-algebra/03-02-char.html> |
| 3.3 | <https://dohyeong-kim.github.io/abstract-linear-algebra/03-03-cayley.html> |
| 3.4 | <https://dohyeong-kim.github.io/abstract-linear-algebra/03-04-triangulation-and-jordan.html> |
| 4.1 | <https://dohyeong-kim.github.io/abstract-linear-algebra/04-01-tensor-product.html> |
| 4.2 | <https://dohyeong-kim.github.io/abstract-linear-algebra/04-02-real-to-complex.html> |

<div class="guide-strip">
  <div class="guide-pill">고유공간</div><div class="guide-arrow">→</div>
  <div class="guide-pill">특성다항식</div><div class="guide-arrow">→</div>
  <div class="guide-pill">최소다항식</div><div class="guide-arrow">→</div>
  <div class="guide-pill">조르당</div><div class="guide-arrow">→</div>
  <div class="guide-pill">텐서곱</div><div class="guide-arrow">→</div>
  <div class="guide-pill">복소화</div>
</div>
"""


SECTION_GUIDES = {
    "3.1": ("고유벡터는 선형변환이 방향을 바꾸지 못하는 축이다.", "fast.ai의 PageRank 단원은 고유벡터를 큰 그래프에서 반복으로 찾아내는 중요도로 읽게 해 준다. 추상식 <code>Av = λv</code>가 링크 행렬의 정상상태를 찾는 알고리즘이 된다."),
    "3.2": ("행렬식은 부피 스케일이고, 특성다항식은 고유값을 찾기 위한 압축된 지문이다.", "계산에서는 행렬식 자체보다 분해법과 안정성이 중요하다. fast.ai는 LU, pivoting, block multiplication을 통해 공식과 실제 계산의 차이를 보여 준다."),
    "3.3": ("케일리-해밀턴은 행렬이 자기 특성다항식을 만족한다는 압축 법칙이다.", "행렬다항식은 Krylov 방법, power method, Arnoldi iteration의 언어와 맞닿아 있다. 큰 행렬에서는 벡터에 반복 적용하며 정보를 뽑아낸다."),
    "3.4": ("조르당 표준형은 대각화가 실패할 때 남는 결함의 지도다.", "조르당형은 이론적으로 선명하지만 수치적으로 불안정하다. 계산 현장에서는 QR algorithm, Schur form, Arnoldi iteration처럼 작은 오차에 덜 예민한 표현을 선호한다."),
    "4.1": ("텐서곱은 쌍선형성을 선형성으로 번역하는 장치다.", "fast.ai의 tensor product, broadcasting, block multiplication 관점은 텐서곱을 추상기호가 아니라 데이터 배열의 shape와 연산 규칙으로 읽게 해 준다."),
    "4.2": ("복소화는 실수 공간에서 보이지 않던 인수분해를 보이게 한다.", "복소수는 FFT, 스펙트럼 방법, 신호처리의 기본 언어다. 실수 데이터를 복소 기저로 읽으면 진동 모드가 좌표처럼 분해된다."),
}


SECTION_INTERLUDES = {
    "3.4": """
<div class="guide-card guide-card-accent">
  <div class="guide-kicker">Chapter 3 Compression</div>
  <div class="guide-title">대각화 가능성은 하나의 질문으로 줄어든다: 공간을 고유방향만으로 다 채울 수 있는가?</div>
  <p>특성다항식은 후보 고유값을 준다. 최소다항식은 변환이 실제로 만족하는 가장 짧은 규칙을 준다. 조르당형은 고유벡터가 모자란 만큼 일반화된 고유벡터 사슬을 붙인다.</p>
</div>
""",
    "4.2": """
<div class="guide-card">
  <div class="guide-kicker">fast.ai Reading Map</div>
  <p>이 후속편과 함께 읽기 좋은 fast.ai 노트는 PageRank with Eigen Decompositions, Implementing QR Factorization, Background Removal with Robust PCA, Topic Modeling with NMF and SVD, Matrix and Tensor Products이다. 추상 이론을 큰 행렬을 빠르고 안정적으로 다루는 기술로 번역해 준다.</p>
</div>
""",
}


def guide_block(title: str, aside: str) -> str:
    return f"""
<div class="guide-grid">
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Section Lens</div>
    <div class="guide-title">{title}</div>
    <p>본문을 읽을 때는 정의보다 먼저 이 절이 어떤 불변량을 보존하고 압축하는지 붙잡는다.</p>
  </div>
  <div class="guide-card">
    <div class="guide-kicker">Numerical Aside</div>
    <p>{aside}</p>
  </div>
</div>
"""


def main() -> None:
    base.SECTION_GUIDES = {code: guide_block(*pair) for code, pair in SECTION_GUIDES.items()}
    base.SUBSECTION_GUIDES = {}
    base.BODY_INSERTS = {}
    base.CHALLENGE_FIGURES = {}
    base.SECTION_INTERLUDES = SECTION_INTERLUDES

    parts = [INTRO.strip(), ""]
    for section in SECTIONS:
        url = f"https://dohyeong-kim.github.io/abstract-linear-algebra/{section['slug']}.html"
        parts.append(base.convert_plain_to_markdown(section, base.fetch_plain(url)))

    OUTPUT.write_text("\n\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
