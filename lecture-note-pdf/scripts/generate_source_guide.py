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
                "body": "8. Determine whether the following sets are subspaces of $\\mathbf{R}^3$ under the operations of addition and scalar multiplication defined on $\\mathbf{R}^3$. Justify your answers.\n\n(a) $W_1 = \\{(a_1, a_2, a_3) \\in \\mathbf{R}^3 : a_1 = 3a_2 \\text{ and } a_3 = -a_2\\}$\n\n(b) $W_2 = \\{(a_1, a_2, a_3) \\in \\mathbf{R}^3 : a_1 = a_3 + 2\\}$\n\n(c) $W_3 = \\{(a_1, a_2, a_3) \\in \\mathbf{R}^3 : 2a_1 - 7a_2 + a_3 = 0\\}$\n\n(d) $W_4 = \\{(a_1, a_2, a_3) \\in \\mathbf{R}^3 : a_1 - 4a_2 - a_3 = 0\\}$\n\n(e) $W_5 = \\{(a_1, a_2, a_3) \\in \\mathbf{R}^3 : a_1 + 2a_2 - 3a_3 = 1\\}$\n\n(f) $W_6 = \\{(a_1, a_2, a_3) \\in \\mathbf{R}^3 : 5a_1^2 - 3a_2^2 + 6a_3^2 = 0\\}$",
                "source": "lenearal.pdf, Section 1.3, Exercise 8, PDF p. 32 (printed p. 20)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "9. Let $W_1$, $W_3$, and $W_4$ be as in Exercise 8. Describe $W_1 \\cap W_3$, $W_1 \\cap W_4$, and $W_3 \\cap W_4$, and observe that each is a subspace of $\\mathbf{R}^3$.",
                "source": "lenearal.pdf, Section 1.3, Exercise 9, PDF p. 32 (printed p. 20)",
            },
            {
                "title": "Challenge Problem 3",
                "body": "33. (a) Let $W_1$ and $W_2$ be subspaces of a vector space $V$ such that $V = W_1 \\oplus W_2$. If $\\beta_1$ and $\\beta_2$ are bases for $W_1$ and $W_2$, respectively, show that $\\beta_1 \\cap \\beta_2 = \\varnothing$ and $\\beta_1 \\cup \\beta_2$ is a basis for $V$.\n\n(b) Conversely, let $\\beta_1$ and $\\beta_2$ be disjoint bases for subspaces $W_1$ and $W_2$, respectively, of a vector space $V$. Prove that if $\\beta_1 \\cup \\beta_2$ is a basis for $V$, then $V = W_1 \\oplus W_2$.",
                "source": "lenearal.pdf, Section 1.6, Exercise 33, PDF p. 70 (printed p. 58)",
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
                "body": "4. Let $W$ be a subspace of a (not necessarily finite-dimensional) vector space $V$. Prove that any basis for $W$ is a subset of a basis for $V$.",
                "source": "lenearal.pdf, Section 1.7, Exercise 4, PDF p. 74 (printed p. 62)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "5. Prove the following infinite-dimensional version of Theorem 1.8 (p. 43): Let $\\beta$ be a subset of an infinite-dimensional vector space $V$. Then $\\beta$ is a basis for $V$ if and only if for each nonzero vector $v$ in $V$, there exist unique vectors $u_1, u_2, \\ldots, u_n$ in $\\beta$ and unique nonzero scalars $c_1, c_2, \\ldots, c_n$ such that $v = c_1u_1 + c_2u_2 + \\cdots + c_nu_n$.",
                "source": "lenearal.pdf, Section 1.7, Exercise 5, PDF p. 74 (printed p. 62)",
            },
            {
                "title": "Challenge Problem 3",
                "body": "6. Prove the following generalization of Theorem 1.9 (p. 44): Let $S_1$ and $S_2$ be subsets of a vector space $V$ such that $S_1 \\subseteq S_2$. If $S_1$ is linearly independent and $S_2$ generates $V$, then there exists a basis $\\beta$ for $V$ such that $S_1 \\subseteq \\beta \\subseteq S_2$. Hint: Apply the maximal principle to the family of all linearly independent subsets of $S_2$ that contain $S_1$, and proceed as in the proof of Theorem 1.13.",
                "source": "lenearal.pdf, Section 1.7, Exercise 6, PDF p. 74 (printed p. 62)",
            },
            {
                "title": "Challenge Problem 4",
                "body": "7. Prove the following generalization of the replacement theorem. Let $\\beta$ be a basis for a vector space $V$, and let $S$ be a linearly independent subset of $V$. There exists a subset $S_1$ of $\\beta$ such that $S \\cup S_1$ is a basis for $V$.",
                "source": "lenearal.pdf, Section 1.7, Exercise 7, PDF p. 74 (printed p. 62)",
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
                "body": "17. Let $V$ and $W$ be finite-dimensional vector spaces and $T : V \\to W$ be linear.\n\n(a) Prove that if $\\dim(V) < \\dim(W)$, then $T$ cannot be onto.\n\n(b) Prove that if $\\dim(V) > \\dim(W)$, then $T$ cannot be one-to-one.",
                "source": "lenearal.pdf, Section 2.1, Exercise 17, PDF p. 88 (printed p. 76)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "20. Let $V$ and $W$ be vector spaces with subspaces $V_1$ and $W_1$, respectively. If $T : V \\to W$ is linear, prove that $T(V_1)$ is a subspace of $W$ and that $\\{x \\in V : T(x) \\in W_1\\}$ is a subspace of $V$.",
                "source": "lenearal.pdf, Section 2.1, Exercise 20, PDF p. 88 (printed p. 76)",
            },
            {
                "title": "Challenge Problem 3",
                "body": "21. Let $V$ be the vector space of sequences described in Example 5 of Section 1.2. Define the functions $T, U : V \\to V$ by\n\n$T(a_1, a_2, \\ldots) = (a_2, a_3, \\ldots)$ and $U(a_1, a_2, \\ldots) = (0, a_1, a_2, \\ldots).$\n\n$T$ and $U$ are called the left shift and right shift operators on $V$, respectively.\n\n(a) Prove that $T$ and $U$ are linear.\n\n(b) Prove that $T$ is onto, but not one-to-one.\n\n(c) Prove that $U$ is one-to-one, but not onto.",
                "source": "lenearal.pdf, Section 2.1, Exercise 21, PDF p. 88 (printed p. 76)",
            },
            {
                "title": "Challenge Problem 4",
                "body": "23. Let $T : \\mathbf{R}^3 \\to \\mathbf{R}$ be linear. Describe geometrically the possibilities for the null space of $T$. Hint: Use Exercise 22.",
                "source": "lenearal.pdf, Section 2.1, Exercise 23, PDF p. 88 (printed p. 76)",
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
                "body": "34. (a) Prove that if $W_1$ is any subspace of a finite-dimensional vector space $V$, then there exists a subspace $W_2$ of $V$ such that $V = W_1 \\oplus W_2$.\n\n(b) Let $V = \\mathbf{R}^2$ and $W_1 = \\{(a_1, 0) : a_1 \\in \\mathbf{R}\\}$. Give examples of two different subspaces $W_2$ and $W_2'$ such that $V = W_1 \\oplus W_2$ and $V = W_1 \\oplus W_2'$.",
                "source": "lenearal.pdf, Section 1.6, Exercise 34, PDF p. 70 (printed p. 58)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "35. Let $W$ be a subspace of a finite-dimensional vector space $V$, and consider the basis $\\{u_1, u_2, \\ldots, u_k\\}$ for $W$. Let $\\{u_1, u_2, \\ldots, u_k, u_{k+1}, \\ldots, u_n\\}$ be an extension of this basis to a basis for $V$.\n\n(a) Prove that $\\{u_{k+1} + W, u_{k+2} + W, \\ldots, u_n + W\\}$ is a basis for $V/W$.\n\n(b) Derive a formula relating $\\dim(V)$, $\\dim(W)$, and $\\dim(V/W)$.",
                "source": "lenearal.pdf, Section 1.6, Exercise 35, PDF p. 70 (printed p. 58)",
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
                "body": "15. Let $V$ and $W$ be $n$-dimensional vector spaces, and let $T : V \\to W$ be a linear transformation. Suppose that $\\beta$ is a basis for $V$. Prove that $T$ is an isomorphism if and only if $T(\\beta)$ is a basis for $W$.",
                "source": "lenearal.pdf, Section 2.4, Exercise 15, PDF p. 120 (printed p. 108)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "16. Let $B$ be an $n \\times n$ invertible matrix. Define $\\Phi : M_{n \\times n}(F) \\to M_{n \\times n}(F)$ by $\\Phi(A) = B^{-1}AB$. Prove that $\\Phi$ is an isomorphism.",
                "source": "lenearal.pdf, Section 2.4, Exercise 16, PDF p. 120 (printed p. 108)",
            },
            {
                "title": "Challenge Problem 3",
                "body": "17. Let $V$ and $W$ be finite-dimensional vector spaces and $T : V \\to W$ be an isomorphism. Let $V_0$ be a subspace of $V$.\n\n(a) Prove that $T(V_0)$ is a subspace of $W$.\n\n(b) Prove that $\\dim(V_0) = \\dim(T(V_0))$.",
                "source": "lenearal.pdf, Section 2.4, Exercise 17, PDF p. 120 (printed p. 108)",
            },
            {
                "title": "Challenge Problem 4",
                "body": "20. Let $T : V \\to W$ be a linear transformation from an $n$-dimensional vector space $V$ to an $m$-dimensional vector space $W$. Let $\\beta$ and $\\gamma$ be ordered bases for $V$ and $W$, respectively. Prove that $\\operatorname{rank}(T) = \\operatorname{rank}(L_A)$ and that $\\operatorname{nullity}(T) = \\operatorname{nullity}(L_A)$, where $A = [T]_{\\beta}^{\\gamma}$. Hint: Apply Exercise 17 to Figure 2.2.",
                "source": "lenearal.pdf, Section 2.4, Exercise 20, PDF p. 120 (printed p. 108)",
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
                "body": "16. Let $B$ be an $n \\times n$ invertible matrix. Define $\\Phi : M_{n \\times n}(F) \\to M_{n \\times n}(F)$ by $\\Phi(A) = B^{-1}AB$. Prove that $\\Phi$ is an isomorphism.",
                "source": "lenearal.pdf, Section 2.4, Exercise 16, PDF p. 120 (printed p. 108)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "21. Let $V$ and $W$ be finite-dimensional vector spaces with ordered bases $\\beta = \\{v_1, v_2, \\ldots, v_n\\}$ and $\\gamma = \\{w_1, w_2, \\ldots, w_m\\}$, respectively. By Theorem 2.6 (p. 72), there exist linear transformations $T_{ij} : V \\to W$ such that\n\n$T_{ij}(v_k) = \\begin{cases} w_i & \\text{if } k = j \\cr 0 & \\text{if } k \\ne j. \\end{cases}$\n\nFirst prove that $\\{T_{ij} : 1 \\le i \\le m, 1 \\le j \\le n\\}$ is a basis for $\\mathcal{L}(V, W)$. Then let $M^{ij}$ be the $m \\times n$ matrix with 1 in the $ith$ row and $jth$ column and 0 elsewhere, and prove that $[T_{ij}]_{\\beta}^{\\gamma} = M^{ij}$. Again by Theorem 2.6, there exists a linear transformation $\\Phi : \\mathcal{L}(V, W) \\to M_{m \\times n}(F)$ such that $\\Phi(T_{ij}) = M^{ij}$. Prove that $\\Phi$ is an isomorphism.",
                "source": "lenearal.pdf, Section 2.4, Exercise 21, PDF p. 120 (printed p. 108)",
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
                "body": "13. (e) For subspaces $W_1$ and $W_2$, show that $(W_1 + W_2)^0 = W_1^0 \\cap W_2^0$.",
                "source": "lenearal.pdf, Section 2.6, Exercise 13(e), PDF p. 138 (printed p. 126)",
            },
            {
                "title": "Challenge Problem 2",
                "body": "14. Prove that if $W$ is a subspace of $V$, then $\\dim(W) + \\dim(W^0) = \\dim(V)$. Hint: Extend an ordered basis $\\{x_1, x_2, \\ldots, x_k\\}$ of $W$ to an ordered basis $\\beta = \\{x_1, x_2, \\ldots, x_n\\}$ of $V$. Let $\\beta^* = \\{f_1, f_2, \\ldots, f_n\\}$. Prove that $\\{f_{k+1}, f_{k+2}, \\ldots, f_n\\}$ is a basis for $W^0$.",
                "source": "lenearal.pdf, Section 2.6, Exercise 14, PDF p. 138 (printed p. 126)",
            },
            {
                "title": "Challenge Problem 3",
                "body": "15. Suppose that $W$ is a finite-dimensional vector space and that $T : V \\to W$ is linear. Prove that $N(T^t) = (R(T))^0$.",
                "source": "lenearal.pdf, Section 2.6, Exercise 15, PDF p. 139 (printed p. 127)",
            },
            {
                "title": "Challenge Problem 4",
                "body": "20. Let $V$ and $W$ be nonzero vector spaces over the same field, and let $T : V \\to W$ be a linear map.\n\n(a) Prove that $T$ is onto if and only if $T^t$ is one-to-one.\n\n(b) Prove that $T^t$ is onto if and only if $T$ is one-to-one.\n\nHint: Parts of the proof require the result of Exercise 19 for the infinite-dimensional case.",
                "source": "lenearal.pdf, Section 2.6, Exercise 20, PDF p. 139 (printed p. 127)",
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
- `Challenge Problem`: `lenearal.pdf`의 문제를 수정 없이 그대로 옮긴 문제

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


CHALLENGE_FIGURES = {}


BODY_INSERTS = {
    ("1.1", "### 정의 1.1.4. 부분공간."): [
        """
<figure class="challenge-figure">
  <img src="../assets/figures/subspace-vs-affine.svg" alt="Plane through the origin versus shifted plane" />
  <figcaption>A plane through the origin can be a subspace; translating the same plane away from the origin usually breaks the subspace condition.</figcaption>
</figure>
"""
    ],
    ("1.2", "### 정의 1.2.2. 기저."): [
        """
<figure class="cat-meme cat-meme-basis">
  <div class="cat-meme-stage">
    <img src="../assets/cats/four-sleeping-kittens.jpg" alt="Four sleeping kittens curled up together" />
    <div class="cat-meme-banner">하나 빼도 <code>span</code>이 그대로면, 그 벡터는 basis가 아니다.</div>
    <div class="cat-meme-bubble meme-basis-bubble"><code>already in span(others)</code><br />= 귀엽지만 새 방향은 못 준다</div>
  </div>
  <figcaption>기저의 묘한 웃음 포인트는 “많이 모으기”가 아니라 “군식구를 끝까지 못 참기”에 있다. Photo: Eli Duke/Wikimedia Commons (CC BY-SA 2.0).</figcaption>
</figure>
"""
    ],
    ("1.3", "### 정의 1.3.9. 커널."): [
        """
<figure class="challenge-figure">
  <img src="../assets/figures/kernel-plane.svg" alt="Kernel plane in three-dimensional space" />
  <figcaption>For a nonzero linear map from <code>R^3</code> to <code>R</code>, the null space is typically a plane through the origin.</figcaption>
</figure>
"""
    ],
    ("2.2", "## 소절 2.2.1 제1동형정리"): [
        """
<figure class="cat-meme cat-meme-kernel">
  <div class="cat-meme-stage">
    <img src="../assets/cats/cat-in-the-box.jpg" alt="Orange cat sitting inside a cardboard box" />
    <div class="cat-meme-banner">제1동형정리 버전 고양이: <code>T</code>가 기억하는 건 상자 밖으로 나온 정보뿐</div>
    <div class="cat-meme-bubble meme-kernel-left">상자 안에서만 달라지는 부분<br />= <code>ker(T)</code></div>
    <div class="cat-meme-bubble meme-kernel-right">밖에서 결국 보이는 것<br />= <code>im(T)</code></div>
  </div>
  <figcaption><code>mod ker(T)</code>로 접으면 “안에서만 다른 차이”는 사라지고, 남는 건 진짜로 관측되는 출력뿐이다. Photo: Matthew Paul Argall/Wikimedia Commons (CC BY 3.0).</figcaption>
</figure>
"""
    ],
    ("2.1", "## 소절 2.1.2 직합"): [
        """
<figure class="challenge-figure">
  <img src="../assets/figures/complement-lines.svg" alt="Two complementary lines spanning the plane" />
  <figcaption>In a direct sum, every vector splits into one part along <code>W1</code> and one part along <code>W2</code>, with no overlap ambiguity.</figcaption>
</figure>
"""
    ],
    ("1.4", "### 정의 1.4.2. 잉여류와 몫공간."): [
        """
<figure class="cat-meme cat-meme-quotient">
  <div class="cat-meme-stage">
    <img src="../assets/cats/two-cats-under-blanket.jpg" alt="Two cats hiding under a blanket" />
    <div class="cat-meme-banner"><code>v</code>와 <code>v+w</code>가 담요 아래에서만 다르면, quotient에서는 그냥 같은 덩어리다</div>
    <div class="cat-meme-bubble meme-quotient-left">difference inside <code>W</code><br />겉에서는 안 보임</div>
    <div class="cat-meme-bubble meme-quotient-right">same coset<br /><code>v + W</code></div>
  </div>
  <figcaption>몫공간 농담의 핵심은 “정말 중요한 차이만 남기고, <code>W</code> 안의 차이는 단체로 무시한다”는 데 있다. Photo: tenz1225/Wikimedia Commons (CC BY-SA 2.0).</figcaption>
</figure>
"""
    ],
    ("2.3", "### 정의 2.3.9. 소멸자."): [
        """
<figure class="challenge-figure">
  <img src="../assets/figures/annihilator-plane.svg" alt="A plane and a covector that vanishes on it" />
  <figcaption>The annihilator consists of exactly those functionals that vanish on every vector of the chosen subspace.</figcaption>
</figure>
""",
        """
<figure class="cat-meme cat-meme-whiskers">
  <div class="cat-meme-stage">
    <img src="../assets/cats/cat-whiskers-closeup.jpg" alt="Close-up photo of a cat's whiskers" />
    <div class="cat-meme-banner"><code>W</code> 안에서 스치면 0, 수염 바깥 방향으로 건드리면 바로 nonzero</div>
    <div class="cat-meme-bubble meme-whisker-left">inside <code>W</code><br />무반응</div>
    <div class="cat-meme-bubble meme-whisker-right">normal direction<br />즉시 반응</div>
  </div>
  <figcaption>소멸자를 “수염 센서”로 보면, 왜 <code>W</code> 안의 모든 방향에 0을 주는지가 꽤 덜 추상적으로 보인다. Photo: Wolf Reynolds/Wikimedia Commons (CC BY 3.0).</figcaption>
</figure>
"""
    ],
    ("2.3", "### 정의 2.3.1."): [
        """
<figure class="cat-meme cat-meme-shadow">
  <div class="cat-meme-stage">
    <img src="../assets/cats/cat-shadow.jpg" alt="Shadow silhouette of a cat on a curtain" />
    <div class="cat-meme-banner">사영은 고양이 전체를 보존하는 게 아니라, 선택한 방향의 그림자만 남긴다</div>
    <div class="cat-meme-bubble meme-shadow-left">full vector<br /><code>v</code></div>
    <div class="cat-meme-bubble meme-shadow-right">projected part<br /><code>P(v)</code></div>
  </div>
  <figcaption>사영을 처음 볼 때는 “성분 하나만 남기고 납작하게 누른다”는 그림이 제일 빨리 들어온다. Photo: Jennifer C./Wikimedia Commons (CC BY 2.0).</figcaption>
</figure>
"""
    ],
}


SECTION_INTERLUDES = {}


def append_body_inserts(
    out: list[str],
    section_code: str,
    heading: str,
) -> None:
    blocks = BODY_INSERTS.get((section_code, heading), [])
    for block in blocks:
        out.extend([normalize_html_block(block), ""])


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
            heading = f"## {stripped}"
            out.extend([heading, ""])
            guide = SUBSECTION_GUIDES.get((section_code, stripped))
            if guide:
                out.extend([normalize_html_block(guide), ""])
            append_body_inserts(out, section_code, heading)
            continue

        if stripped.startswith("연습문제 "):
            in_exercises = True
            out.extend([f"## {stripped}", ""])
            continue

        if re.match(r"^(정의|정리|명제|예시|보조설명)\s+\d+(?:\.\d+)*\.(?:\s|$)", stripped):
            heading = f"### {stripped}"
            out.extend([heading, ""])
            append_body_inserts(out, section_code, heading)
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
            source = challenge.get("source")
            out.append(f"### {challenge['title']}")
            out.append("")
            if source:
                out.append(f"*Source: {source}*")
                out.append("")
            figure = CHALLENGE_FIGURES.get((section_code, challenge["title"]))
            if figure:
                out.extend([normalize_html_block(figure), ""])
            out.extend([challenge["body"], ""])

    interlude = SECTION_INTERLUDES.get(section_code)
    if interlude:
        out.extend(["", normalize_html_block(interlude), ""])

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
