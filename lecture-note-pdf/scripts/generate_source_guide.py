#!/usr/bin/env python3

from __future__ import annotations

import re
import subprocess
import textwrap
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "study-guide.md"

SECTIONS = [
    {
        "code": "1.1",
        "title": "벡터공간, 부분공간, 선형결합",
        "slug": "01-01-vector-spaces",
        "important": {4, 6, 10},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "부분집합 $S_1, S_2 \\subseteq V$에 대하여 $\\operatorname{span}(S_1 \\cup S_2) = \\operatorname{span}(S_1) + \\operatorname{span}(S_2)$임을 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Let $U_1,\\dots,U_k \\le V$ and assume that $U_i \\cap (U_1+\\cdots+U_{i-1}) = \\{0\\}$ for every $i=2,\\dots,k$. Prove that every $v \\in U_1+\\cdots+U_k$ can be written uniquely in the form $v=u_1+\\cdots+u_k$ with $u_i \\in U_i$. Prove the converse as well.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "Let $U,W \\le V$. Prove that $U \\cup W$ is a subspace if and only if $U\\subseteq W$ or $W\\subseteq U$.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Let $S=\\{v_1,\\dots,v_n\\}\\subseteq V$ be finite. Prove that the following are equivalent: (i) $S$ is linearly independent. (ii) Every $x\\in\\operatorname{span}(S)$ has a unique expression of the form $x=a_1v_1+\\cdots+a_nv_n$.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Define $\\phi:U\\times W\\to V$ by $\\phi(u,w)=u+w$. Show that the image of $\\phi$ is $U+W$, and prove that $\\phi$ is injective if and only if $U\\cap W=\\{0\\}$.",
            },
        ],
    },
    {
        "code": "1.2",
        "title": "기저의 존재성과 차원",
        "slug": "01-02-basis",
        "important": {6, 7, 12, 13},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "$\\dim(V)=n$인 유한차원 공간에서 $n$개의 벡터가 선형독립이면 기저이고, $n$개의 벡터가 $V$를 생성하면 기저임을 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Let $F$ be an infinite field and let $\\dim(V)=n\\ge 1$. Prove that if $W_1,\\dots,W_m$ are proper subspaces of $V$, then $W_1\\cup\\cdots\\cup W_m \\ne V$. Deduce that one can choose a basis of $V$ avoiding any prescribed finite subset $S\\subset V$.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "Let $\\dim(V)=n$ and let $U,W\\le V$. Prove that if $\\dim(U)+\\dim(W)>n$, then $U\\cap W\\ne\\{0\\}$.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Let $V$ be $n$-dimensional, and let $\\{0\\}=V_0 < V_1 < \\cdots < V_k=V$ be a strict chain of subspaces. Prove that $k\\le n$. Show moreover that if $k=n$, then $\\dim(V_i)=i$ for every $i$.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Let $S$ be a spanning set of $V$ and let $L$ be a linearly independent set. Prove that the vectors in $L$ can be exchanged for suitable vectors of $S$ so as to obtain a new spanning set of $V$.",
            },
        ],
    },
    {
        "code": "1.3",
        "title": "선형변환, 커널, 이미지",
        "slug": "01-03-linear-transformation",
        "important": {2, 4, 8, 11},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "부분공간 $U \\le V$에 대한 제한사상 $T|_U : U \\to W$에 대하여 $\\ker(T|_U)=U\\cap\\ker(T)$, $\\operatorname{im}(T|_U)=T(U)$임을 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Let $T:V\\to V$ be a linear transformation on a finite-dimensional space $V$. Prove that the following are equivalent: (i) $T^2=T$. (ii) $V=\\ker(T)\\oplus\\operatorname{im}(T)$. (iii) There is a basis in which the matrix of $T$ has the form $\\begin{bmatrix}I_r & 0 \\\\ 0 & 0\\end{bmatrix}$.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "Let $T:V\\to W$ be linear. Prove that the following are equivalent: (i) $T$ is injective. (ii) The image of every finite linearly independent subset of $V$ is linearly independent.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Let $T:V\\to W$ be linear. Prove that there exists a linear map $S:W\\to V$ such that $ST=I_V$ if and only if $T$ is injective. In the converse direction, construct $S$ by choosing a basis.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Let $T:V\\to V$ be linear on a finite-dimensional space and assume that $T^2=0$. Prove that $\\operatorname{im}(T)\\subseteq\\ker(T)$ and $\\operatorname{rank}(T)\\le \\frac{1}{2}\\dim(V)$.",
            },
        ],
    },
    {
        "code": "1.4",
        "title": "몫과 코커널",
        "slug": "01-04-quotients-cokernel",
        "important": {6, 9, 11},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "$V = U \\oplus W$일 때 $\\Phi((u+w)+U)=w$로 정의한 사상 $\\Phi : V/U \\to W$가 well-defined한 동형사상임을 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Fix the natural projection $\\pi:V\\twoheadrightarrow V/W$. Prove that for every linear map $T:V\\to X$ with $W\\subseteq\\ker(T)$, there exists a unique linear map $\\overline{T}:V/W\\to X$ such that $T=\\overline{T}\\circ\\pi$. Deduce a natural bijection between $\\operatorname{Hom}(V/W,X)$ and $\\{S\\in\\operatorname{Hom}(V,X):W\\subseteq\\ker(S)\\}$.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "With respect to the natural projection $\\pi:V\\to V/W$, prove that the assignment $U\\mapsto U/W$ gives a bijection between the subspaces of $V$ containing $W$ and the subspaces of $V/W$.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Assume $U\\subseteq W\\subseteq V$. Define $\\Psi:(V/U)/(W/U)\\to V/W$ by $\\Psi((v+U)+(W/U))=v+W$. Prove that $\\Psi$ is a well-defined isomorphism.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Suppose that $\\{v_1+W,\\dots,v_n+W\\}$ is a basis of $V/W$ and that $\\{w_1,\\dots,w_m\\}$ is a basis of $W$. Prove that $\\{v_1,\\dots,v_n,w_1,\\dots,w_m\\}$ is a basis of $V$.",
            },
        ],
    },
    {
        "code": "2.1",
        "title": "동형사상",
        "slug": "02-01-isomorphisms",
        "important": {6, 8, 11, 12},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "$V = U \\oplus W$일 때 $P_U(u+w)=u$, $P_W(u+w)=w$로 정의한 두 사상이 well-defined한 선형변환임을 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Let $U,W\\le V$, and let $q:V\\to V/U$ be the natural projection. Prove that the restriction $q|_W:W\\to V/U$ is an isomorphism if and only if $V=U\\oplus W$. Deduce that every quotient space of a finite-dimensional vector space is isomorphic to a complementary subspace.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "Let $U,W,Z$ be finite-dimensional vector spaces. Prove that if $U\\oplus Z\\cong W\\oplus Z$, then $U\\cong W$.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Let $V,W$ be finite-dimensional and let $T:V\\to W$ be linear with $\\dim(V)=\\dim(W)$. Prove that the following are equivalent: (i) $T$ is injective. (ii) $T$ is surjective. (iii) $T$ is an isomorphism.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Let $P,Q:V\\to V$ satisfy $P^2=P$ and $Q^2=Q$. Prove that if $\\operatorname{im}(P)=\\operatorname{im}(Q)$ and $\\ker(P)=\\ker(Q)$, then $P=Q$.",
            },
        ],
    },
    {
        "code": "2.2",
        "title": "동형정리",
        "slug": "02-02-isomorphism-theorems",
        "important": {4, 5, 9, 10},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "선형변환 $T:V\\to W$가 전사일 필요충분조건이 $V/\\ker(T) \\cong W$임을 제1동형정리를 이용하여 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Let $U,W\\le V$ and define $\\Phi:V\\to V/U \\times V/W$ by $\\Phi(v)=(v+U, v+W)$. (a) Prove that $\\ker(\\Phi)=U\\cap W$. (b) Apply the First Isomorphism Theorem to prove that $V/(U\\cap W)\\cong\\operatorname{im}(\\Phi)$. (c) Describe $\\operatorname{im}(\\Phi)$ as a subspace of $V/U \\times V/W$.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "Let $T:V\\to W$ be linear and let $U\\le V$. Prove that $U/(U\\cap\\ker T)\\cong T(U)$.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Let $U,W\\le V$. Prove that the map $u+(U\\cap W)\\mapsto u+W$ is a well-defined isomorphism from $U/(U\\cap W)$ onto $(U+W)/W$.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Assume $U\\subseteq W\\subseteq V$. Prove that the map $(v+U)+(W/U)\\mapsto v+W$ is a well-defined isomorphism from $(V/U)/(W/U)$ onto $V/W$.",
            },
        ],
    },
    {
        "code": "2.3",
        "title": "직곱, 사영, 쌍대공간",
        "slug": "02-03-product-projection-dual",
        "important": {1, 4, 5, 7, 8},
        "extras": [
            {
                "title": "추가 문제 1",
                "body": "유한차원 공간 $V, W$의 기저와 쌍대기저를 택했을 때, 선형변환 $T:V\\to W$의 행렬이 $A$이면 쌍대사상 $T^*:W^*\\to V^*$의 행렬이 $A^\\mathsf{T}$임을 증명하시오.",
            }
        ],
        "challenges": [
            {
                "title": "Challenge Problem 1",
                "body": "Let $P:V\\to V$ be a projection on a finite-dimensional space $V$. Prove that the dual map $P^*:V^*\\to V^*$ is also a projection, that $\\operatorname{im}(P^*)=(\\ker P)^0$, and that $\\ker(P^*)=(\\operatorname{im} P)^0$. Deduce that $V^*=(\\ker P)^0\\oplus(\\operatorname{im} P)^0$.",
            },
            {
                "title": "Challenge Problem 2",
                "body": "Let $\\beta,\\gamma$ be bases of finite-dimensional spaces $V,W$, and let $\\beta^*,\\gamma^*$ be the corresponding dual bases. If $[T]_{\\beta}^{\\gamma}=A$ for a linear map $T:V\\to W$, prove that $[T^*]_{\\gamma^*}^{\\beta^*}=A^{\\mathsf T}$.",
            },
            {
                "title": "Challenge Problem 3",
                "body": "Let $T:V\\to W$ be linear between finite-dimensional spaces. Prove that (i) if $T$ is injective, then $T^*$ is surjective, and (ii) if $T$ is surjective, then $T^*$ is injective.",
            },
            {
                "title": "Challenge Problem 4",
                "body": "Let $U,W\\le V$ with $V$ finite-dimensional. Prove that $(U+W)^0=U^0\\cap W^0$ and $(U\\cap W)^0=U^0+W^0$.",
            },
        ],
    },
]


INTRO = """---
title: "추상선형대수학 1.1-2.3 원문 정리본"
author: "김도형 원문 재구성 / Codex 편집"
date: "2026-04-12"
lang: "ko-KR"
---

# 안내

이 문서는 김도형 교수님의 웹 강의노트 *추상선형대수학: 벡터공간과 대수학의 원리* 중 `1.1`부터 `2.3`까지를 읽기 좋은 단일 PDF로 재구성한 것이다.

- 편집 원칙: 원문 내용은 가능한 한 유지하고, 서식 정리와 `★ 중요`, `추가 문제`, `Challenge Problem`만 덧붙였다.
- 포함 범위: `1.1`, `1.2`, `1.3`, `1.4`, `2.1`, `2.2`, `2.3`
- 원문 출처: <https://dohyeong-kim.github.io/abstract-linear-algebra/frontmatter.html>
- Challenge Problem 참고: <https://anandinstitute.org/pdf/lenearal.pdf>
- 저작권 및 이용허락: © 2026 김도형, CC BY-SA 4.0  
  국문 안내: <https://creativecommons.org/licenses/by-sa/4.0/deed.ko/>  
  영문 안내: <https://creativecommons.org/licenses/by-sa/4.0/>

## 표시

- `★ 중요`: 시험 대비나 다음 절 연결상 특히 다시 풀어볼 만한 원문 연습문제
- `추가 문제`: 원문 본문을 바꾸지 않고, 복습용으로 덧붙인 문제
- `Challenge Problem`: 지정한 선형대수학 교재를 참고해 영어로 덧붙인 고난도 문제

## 원문 링크

| 절 | 링크 |
| --- | --- |
| 1.1 | <https://dohyeong-kim.github.io/abstract-linear-algebra/01-01-vector-spaces.html> |
| 1.2 | <https://dohyeong-kim.github.io/abstract-linear-algebra/01-02-basis.html> |
| 1.3 | <https://dohyeong-kim.github.io/abstract-linear-algebra/01-03-linear-transformation.html> |
| 1.4 | <https://dohyeong-kim.github.io/abstract-linear-algebra/01-04-quotients-cokernel.html> |
| 2.1 | <https://dohyeong-kim.github.io/abstract-linear-algebra/02-01-isomorphisms.html> |
| 2.2 | <https://dohyeong-kim.github.io/abstract-linear-algebra/02-02-isomorphism-theorems.html> |
| 2.3 | <https://dohyeong-kim.github.io/abstract-linear-algebra/02-03-product-projection-dual.html> |

<div class="guide-strip">
  <div class="guide-pill">벡터공간과 부분공간</div>
  <div class="guide-arrow">→</div>
  <div class="guide-pill">기저와 차원</div>
  <div class="guide-arrow">→</div>
  <div class="guide-pill">선형변환</div>
  <div class="guide-arrow">→</div>
  <div class="guide-pill">몫공간</div>
  <div class="guide-arrow">→</div>
  <div class="guide-pill">동형정리</div>
  <div class="guide-arrow">→</div>
  <div class="guide-pill">사영과 쌍대성</div>
</div>
"""


SECTION_GUIDES = {
    "1.3": """
<div class="guide-grid">
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Section Lens</div>
    <div class="guide-title">선형변환은 벡터를 어디로 보내는가보다, 어떤 방향을 죽이고 어떤 방향을 남기는가가 더 중요하다.</div>
    <p>이 절에서 계속 봐야 할 대상은 <code>ker(T)</code>와 <code>im(T)</code>다. 하나는 정의역 안의 정보 손실이고, 다른 하나는 공역 안의 실제 도달 영역이다.</p>
  </div>
  <div class="guide-card">
    <div class="guide-kicker">Map</div>
    <div class="diagram-eqn">\\[
    V \\xrightarrow{T} W,\\qquad
    \\ker(T) \\subseteq V,\\qquad
    \\operatorname{im}(T) \\subseteq W
    \\]</div>
    <p class="guide-note">뒤의 <code>1.4</code>에서는 \\(V/\\ker(T)\\)를 만들고, <code>2.2</code>에서는 그것이 실제로 \\(\\operatorname{im}(T)\\)와 같아짐을 본다.</p>
  </div>
</div>
""",
    "1.4": """
<div class="guide-grid">
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Quotient Intuition</div>
    <div class="guide-title">몫공간은 “어느 차이를 무시할 것인가”를 선형대수학적으로 구현한 공간이다.</div>
    <p>부분공간 <code>W</code> 안에서만 다른 두 벡터는 같은 것으로 본다. 그래서 몫공간은 벡터 하나가 아니라 <em>방향 하나를 접어 만든 덩어리</em>를 원소로 갖는다.</p>
  </div>
  <div class="guide-card">
    <div class="guide-kicker">Map</div>
    <div class="diagram-eqn">\\[
    \\pi: V \\twoheadrightarrow V/W,\\qquad
    \\pi(v)=v+W
    \\]</div>
    <p class="guide-note">이 투영은 뒤의 동형정리에서 반복해서 재등장한다. “원래 공간에서 어떤 부분을 접고 내려간다”는 그림을 계속 유지하면 된다.</p>
  </div>
</div>
""",
    "2.1": """
<div class="guide-grid">
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Section Lens</div>
    <div class="guide-title">동형사상은 모양이 아니라 선형 구조를 기준으로 두 공간을 같다고 보는 기준이다.</div>
    <p>유한차원에서는 결국 차원이 같으면 동형이다. 직합은 이 구조를 더 작은 조각으로 분해하는 방식이다.</p>
  </div>
  <div class="guide-card">
    <div class="guide-kicker">Direct Sum Picture</div>
    <div class="diagram-eqn">\\[
    V = U \\oplus W
    \\iff
    v = u+w \\text{ 가 유일하다}
    \\]</div>
    <p class="guide-note">즉 직합은 “서로 겹치지 않는 두 좌표축으로 한 공간을 읽는 법”이다. 이 관점이 다음 절의 사영과 동형정리로 이어진다.</p>
  </div>
</div>
""",
    "2.2": """
<div class="guide-grid guide-grid-wide">
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Section Lens</div>
    <div class="guide-title">동형정리는 항상 “무엇을 같은 것으로 묶어 없애면, 남는 구조가 무엇과 정확히 같아지는가?”를 말한다.</div>
    <p>세 정리 모두 먼저 자연스러운 사상을 잡고, 그 사상이 죽이는 부분을 몫으로 접어 없앤 뒤, 남은 공간이 이미지와 동형이라는 패턴을 따른다.</p>
  </div>
  <div class="guide-card">
    <div class="guide-kicker">Three Patterns</div>
    <table class="compact-table">
      <thead>
        <tr><th>정리</th><th>지우는 것</th><th>남는 구조</th></tr>
      </thead>
      <tbody>
        <tr><td>제1동형정리</td><td>\\(\\ker(T)\\)</td><td>\\(\\operatorname{im}(T)\\)</td></tr>
        <tr><td>제2동형정리</td><td>\\(U \\cap W\\)</td><td>\\((U+W)/W\\)</td></tr>
        <tr><td>제3동형정리</td><td>\\(U\\) 다음 \\(W/U\\)</td><td>\\(V/W\\)</td></tr>
      </tbody>
    </table>
  </div>
</div>
""",
    "2.3": """
<div class="guide-grid">
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Section Lens</div>
    <div class="guide-title">이 절은 앞 절의 구조를 연산자와 쌍대성으로 다시 묶는다.</div>
    <p>사영은 직합 분해를 한 연산자로 표현하고, 쌍대공간은 원래 공간의 정보를 함수 공간으로 옮겨서 다시 읽게 해 준다.</p>
  </div>
  <div class="guide-card">
    <div class="guide-kicker">Dual Direction</div>
    <div class="diagram-eqn">\\[
    T: V \\to W
    \\qquad \\Longrightarrow \\qquad
    T^*: W^* \\to V^*,\\quad T^*(g)=g\\circ T
    \\]</div>
    <p class="guide-note">원래 화살표가 뒤집히는 이유는, 범함수는 항상 “결과를 평가”하기 때문에 선형변환 뒤에서 합성되기 때문이다.</p>
  </div>
</div>
""",
}


SUBSECTION_GUIDES = {
    ("2.2", "소절 2.2.1 제1동형정리"): """
<div class="guide-grid guide-grid-wide">
  <div class="guide-card">
    <div class="guide-kicker">Morphism Diagram</div>
    <div class="diagram-eqn">\\[
    \\begin{array}{ccc}
    V & \\xrightarrow{T} & W \\\\
    \\downarrow \\pi & & \\uparrow \\iota \\\\
    V/\\ker(T) & \\xrightarrow[\\cong]{\\bar{T}} & \\operatorname{im}(T)
    \\end{array}
    \\]</div>
    <p class="guide-note">\\(\\pi\\)는 커널 방향을 접어 없애는 투영이고, \\(\\iota\\)는 이미지를 \\(W\\) 안에 포함시키는 화살표다.</p>
  </div>
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Intuition</div>
    <div class="guide-title">같은 값을 주는 벡터들은 이미 커널만큼 차이 난다.</div>
    <p>즉 \\(T(v_1)=T(v_2)\\)이면 두 벡터를 굳이 구분할 이유가 없다. 그래서 커널 방향을 하나의 점으로 접으면, 남는 정보는 정확히 이미지와 일치한다.</p>
    <p class="guide-note">핵심 등식: \\(v_1 \\sim v_2 \\iff T(v_1)=T(v_2) \\iff v_1-v_2 \\in \\ker(T)\\).</p>
  </div>
</div>
""",
    ("2.2", "소절 2.2.2 제2동형정리"): """
<div class="guide-grid guide-grid-wide">
  <div class="guide-card">
    <div class="guide-kicker">Morphism Diagram</div>
    <div class="diagram-eqn">\\[
    U \\twoheadrightarrow U/(U\\cap W)
    \\xrightarrow[\\cong]{\\Phi}
    (U+W)/W
    \\]</div>
    <p class="guide-note">직접 쓰면 \\(\\Phi(u+(U\\cap W)) = u+W\\) 이다. 즉 \\(U\\) 안의 벡터를 \\(W\\) 기준의 잉여류로 본다.</p>
  </div>
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Intuition</div>
    <div class="guide-title">\\(U\\)가 이미 \\(W\\) 안에 갖고 있던 방향은 새 정보가 아니다.</div>
    <p>그래서 \\(U \\cap W\\)를 먼저 지우고 나면, \\(U\\)가 \\(W\\)에 덧붙이는 새 자유도만 남는다. 그 남은 자유도가 바로 \\((U+W)/W\\)다.</p>
  </div>
</div>
""",
    ("2.2", "소절 2.2.3 제3동형정리"): """
<div class="guide-grid guide-grid-wide">
  <div class="guide-card">
    <div class="guide-kicker">Morphism Diagram</div>
    <div class="diagram-eqn">\\[
    (V/U)/(W/U)
    \\xrightarrow[\\cong]{\\Psi}
    V/W
    \\]</div>
    <div class="diagram-eqn">\\[
    V/U \\xrightarrow{S} V/W,\\qquad
    S(v+U)=v+W
    \\]</div>
  </div>
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Intuition</div>
    <div class="guide-title">작은 것을 먼저 접고, 그다음 남은 큰 조각을 한 번 더 접는 과정은 큰 것을 한 번에 접는 것과 같다.</div>
    <p>즉 \\(U\\)를 먼저 무시한 뒤에도 여전히 남아 있는 \\(W/U\\)를 없애면, 결과는 처음부터 \\(W\\) 전체를 무시한 것과 같다.</p>
  </div>
</div>
""",
    ("2.3", "소절 2.3.1 사영"): """
<div class="guide-grid">
  <div class="guide-card">
    <div class="guide-kicker">Operator Picture</div>
    <div class="diagram-eqn">\\[
    V = \\ker(P) \\oplus \\operatorname{im}(P),\\qquad
    v=(v-P(v))+P(v)
    \\]</div>
  </div>
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Intuition</div>
    <div class="guide-title">사영은 한 성분은 지우고, 다른 성분은 그대로 남기는 연산자다.</div>
    <p>직합 분해가 이미 주어져 있다면 사영은 “좌표 하나만 읽어 오는 함수”로 생각하면 된다.</p>
  </div>
</div>
""",
    ("2.3", "소절 2.3.3 쌍대공간"): """
<div class="guide-grid guide-grid-wide">
  <div class="guide-card">
    <div class="guide-kicker">Morphism Diagram</div>
    <div class="diagram-eqn">\\[
    T: V \\to W
    \\qquad\\leadsto\\qquad
    T^*: W^* \\to V^*
    \\]</div>
    <div class="diagram-eqn">\\[
    T^*(g)=g\\circ T
    \\]</div>
  </div>
  <div class="guide-card guide-card-accent">
    <div class="guide-kicker">Intuition</div>
    <div class="guide-title">범함수는 “출력값을 검사하는 장치”라서 선형변환 뒤에 붙는다.</div>
    <p>그래서 원래 사상이 <code>V → W</code>라면, 쌍대사상은 <code>W^* → V^*</code>로 방향이 뒤집힌다. 먼저 <code>T</code>로 보내고, 그다음 <code>g</code>로 값을 읽는다.</p>
  </div>
</div>
""",
}


def fetch_plain(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        html = response.read()

    proc = subprocess.run(
        ["pandoc", "-f", "html", "-t", "plain"],
        input=html,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    text = proc.stdout.decode("utf-8")
    text = text.split("Prev")[0].strip()
    match = re.search(r"Section\s+\d+\.\d+.+", text)
    if match:
        text = text[match.start() :].strip()
    # PreTeXt source exposes helper MathJax macros such as \amp, \lt, \gt.
    # Our standalone build does not inject those macro definitions, so convert
    # them back to the intended TeX tokens during extraction.
    text = (
        text.replace("\\amp", "&")
        .replace("\\lt", "<")
        .replace("\\gt", ">")
    )
    return text


def normalize_html_block(block: str) -> str:
    lines = textwrap.dedent(block).strip().splitlines()
    return "\n".join(line.lstrip() for line in lines)


def convert_plain_to_markdown(section: dict[str, object], text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    out: list[str] = [f"# {section['code']} {section['title']}", ""]
    section_code = str(section["code"])

    if section_code in SECTION_GUIDES:
        out.extend([normalize_html_block(SECTION_GUIDES[section_code]), ""])

    in_exercises = False
    first_line_skipped = False
    important = section["important"]

    for line in lines:
        if not first_line_skipped and line.startswith("Section "):
            first_line_skipped = True
            continue

        stripped = line.strip()

        if not stripped:
            out.append("")
            continue

        if stripped.startswith("소절 "):
            out.extend([f"## {stripped}", ""])
            guide = SUBSECTION_GUIDES.get((section_code, stripped))
            if guide:
                out.extend([normalize_html_block(guide), ""])
            continue

        if stripped.startswith("연습문제 "):
            in_exercises = True
            out.extend([f"## {stripped}", ""])
            continue

        if re.match(r"^(정의|정리|명제|예시|보조설명)\s+\d+(?:\.\d+)*\.(?:\s|$)", stripped):
            out.extend([f"### {stripped}", ""])
            continue

        if stripped in {"증명.", "정답.", "Solution."}:
            out.extend([f"**{stripped}**", ""])
            continue

        if in_exercises:
            match = re.match(r"^(\d+)\.\s*(.*)$", stripped)
            if match:
                number = int(match.group(1))
                title = match.group(2)
                prefix = "### ★ 중요 " if number in important else "### "
                heading = f"{prefix}{number}."
                if title:
                    heading += f" {title}"
                out.extend([heading, ""])
                continue

        out.append(stripped)

    extras = section["extras"]
    if extras:
        out.extend(["", "## 추가 문제", ""])
        for extra in extras:
            out.extend([f"### {extra['title']}", "", extra["body"], ""])

    challenges = section.get("challenges", [])
    if challenges:
        out.extend(["", "## Challenge Problems", ""])
        for challenge in challenges:
            out.extend([f"### {challenge['title']}", "", challenge["body"], ""])

    return "\n".join(out).strip() + "\n"


def main() -> None:
    parts = [INTRO.strip(), ""]
    for section in SECTIONS:
        url = f"https://dohyeong-kim.github.io/abstract-linear-algebra/{section['slug']}.html"
        plain = fetch_plain(url)
        parts.append(convert_plain_to_markdown(section, plain))

    OUTPUT.write_text("\n\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
