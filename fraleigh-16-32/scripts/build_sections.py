#!/usr/bin/env python3

from __future__ import annotations

from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sections"


def block(title: str, statement: str, proof: str = "", use: str = "") -> dict[str, str]:
    return {"title": title, "statement": statement, "proof": proof, "use": use}


SECTIONS = [
    {
        "no": 16,
        "title": "Group Action on a Set",
        "mission": "군을 원소들의 추상 집합이 아니라, 어떤 집합 X 위에서 실제로 움직이는 대칭으로 읽는다.",
        "read_first": "action의 두 공리, orbit, stabilizer만 정확히 잡으면 나머지는 coset 계산이다.",
        "definitions": [
            "A left action of G on X is a map G x X -> X with e x = x and (gh)x = g(hx).",
            "The orbit of x is Gx = {gx | g in G}. It is x가 작용으로 도달 가능한 모든 위치다.",
            "The stabilizer of x is G_x = {g in G | gx = x}. It is x를 고정하는 G의 부분군이다.",
            "A G-map f:X->Y satisfies f(gx)=g f(x). Bijective G-map은 G-set isomorphism이다.",
        ],
        "theorems": [
            block(
                "Orbit partition theorem",
                "The orbits of a G-set X form a partition of X: every x lies in exactly one orbit, and two orbits are either equal or disjoint.",
                "Define x~y iff y=gx for some g. The action laws give reflexive, symmetric, transitive. Equivalence classes are exactly orbits.",
                "서로 다른 상태 수를 셀 때 먼저 X를 orbit들로 찢는다.",
            ),
            block(
                "Orbit-stabilizer theorem",
                "For x in X, the orbit Gx is in bijection with the left cosets G/G_x. Hence, if G is finite, |Gx|=[G:G_x]=|G|/|G_x|.",
                "Send gG_x to gx. This is well-defined because ghx=gx for h in G_x. Conversely gx=kx implies k^{-1}g in G_x, so gG_x=kG_x.",
                "몇 개로 움직이는지와 몇 개가 고정하는지는 곱해서 |G|가 된다.",
            ),
            block(
                "Transitive G-sets are coset spaces",
                "If X is transitive and x0 in X, then X is isomorphic as a G-set to G/G_{x0}.",
                "Map gG_{x0} to gx0. Orbit-stabilizer의 대응이 G-action과도 호환된다.",
                "transitive action 문제는 사실 coset action 문제로 바꿔 풀 수 있다.",
            ),
        ],
        "propositions": [
            block("Stabilizers are subgroups", "For every x in X, G_x is a subgroup of G.", "e fixes x. If g,h fix x, then gh fixes x. If g fixes x, then g^{-1} fixes x by applying g^{-1} to gx=x."),
            block("Conjugate points have conjugate stabilizers", "If y=gx, then G_y = g G_x g^{-1}.", "k fixes gx iff g^{-1}kg fixes x."),
        ],
        "examples": [
            block("Left regular action", "G acts on itself by g*x=gx. The orbit of any x is all of G, and the stabilizer is {e}.", use="This is the cleanest model of a free transitive action."),
            block("D4 acting on square vertices", "Let D4 act on the four vertices of a square. The action is transitive; the stabilizer of one vertex has two elements, so the orbit size is 8/2=4.", use="대칭군 문제에서 stabilizer를 세면 orbit 크기가 즉시 나온다."),
            block("Coset action", "G acts on G/H by g*(aH)=(ga)H. The stabilizer of H is H itself.", use="이 예시는 모든 transitive action의 표준형이다."),
        ],
        "exercises": [
            block("Orbit check", "Let G act on X. Prove that x and y are in the same orbit iff Gx=Gy.", "Use y=gx, then show each element of Gy is also in Gx and conversely."),
            block("Stabilizer computation", "For the natural action of S3 on {1,2,3}, compute the orbit and stabilizer of 1.", "Orbit is all three points; stabilizer consists of permutations fixing 1."),
            block("Coset model", "If X is transitive and |G|=24, |G_x|=6, how many elements does X have?", "Orbit-stabilizer gives |X|=4."),
            block("G-map test", "For a conjugation action of G on itself, decide whether f(x)=x^{-1} is a G-map.", "Check f(gxg^{-1}) against g f(x) g^{-1}."),
        ],
        "proof_patterns": [
            "To prove an action is well-defined, check representative choices before checking the two action axioms.",
            "To prove a stabilizer statement, start from k(gx)=gx and multiply by g^{-1} on the correct side.",
        ],
    },
    {
        "no": 17,
        "title": "Applications of G-Sets to Counting",
        "mission": "대칭 때문에 같은 것으로 보이는 객체를 orbit 단위로 센다.",
        "read_first": "Burnside는 새로운 마법이 아니라, fixed point를 두 방향으로 세는 double counting이다.",
        "definitions": [
            "Fix(g) = {x in X | gx=x}. 한 group element가 고정하는 객체들의 집합.",
            "The number of essentially different objects under a group action is the number of orbits.",
            "Conjugation action is g*x=gxg^{-1}. Its orbits are conjugacy classes.",
            "The centralizer C_G(x) is the stabilizer of x under conjugation.",
        ],
        "theorems": [
            block(
                "Burnside lemma",
                "If a finite group G acts on a finite set X, then the number of orbits is (1/|G|) sum_{g in G} |Fix(g)|.",
                "Count S={(g,x):gx=x}. By g first, |S|=sum |Fix(g)|. By orbit first, each orbit contributes |G| using orbit-stabilizer.",
                "up to symmetry 문제의 기본 공식.",
            ),
            block(
                "Class equation",
                "For a finite group G under conjugation, |G| = |Z(G)| + sum [G:C_G(a_i)], where a_i run over representatives of noncentral conjugacy classes.",
                "Conjugation orbits of central elements have size 1. Other orbit sizes are centralizer indices.",
                "p-group의 center가 nontrivial임을 보이는 표준 입구다.",
            ),
            block(
                "p-group center theorem",
                "If |G|=p^n with p prime and n>0, then Z(G) is nontrivial.",
                "In the class equation, every noncentral conjugacy class has size divisible by p. Since |G| is divisible by p, |Z(G)| is divisible by p.",
                "Sylow 전 단계에서 자주 쓰는 group action 계산.",
            ),
        ],
        "propositions": [
            block("Fixed colors under a rotation", "For necklace colorings, a rotation by k positions fixes exactly c^{gcd(n,k)} colorings when c colors and n beads are used.", "The rotation splits positions into gcd(n,k) cycles, and each cycle must be monochromatic."),
            block("Conjugacy class size", "The size of the conjugacy class of a is [G:C_G(a)].", "This is orbit-stabilizer for the conjugation action."),
        ],
        "examples": [
            block("Three-bead necklaces with two colors", "C3 acts on 2^3 colorings. The identity fixes 8, each nontrivial rotation fixes 2. Burnside gives (8+2+2)/3=4 necklaces.", use="fixed set을 직접 세는 연습."),
            block("D4 colorings of a square", "D4 has rotations and reflections. Count colorings fixed by each symmetry type, then average over eight symmetries.", use="대칭을 conjugacy type별로 묶으면 계산이 짧아진다."),
            block("Conjugation in S3", "S3 has conjugacy classes: identity, three transpositions, two 3-cycles. This is exactly the orbit decomposition under conjugation.", use="conjugacy class는 추상 정의가 아니라 group action의 orbit이다."),
        ],
        "exercises": [
            block("Burnside warm-up", "Count binary bracelets of length 4 under rotations only.", "Use C4. Fixed counts: identity 16, 90-degree rotations 2 each, 180-degree rotation 4."),
            block("Class equation", "Write the class equation of S3.", "Use class sizes 1, 3, 2."),
            block("Center of order p^2 group", "Use the p-group center theorem to show every group of order p^2 is abelian.", "After Z(G) is nontrivial, consider whether its order is p or p^2 and use G/Z(G) cyclic."),
            block("Conjugacy stabilizer", "For a transposition in S4, compute the size of its conjugacy class via the centralizer.", "There are six transpositions; centralizer size must be 24/6=4."),
        ],
        "proof_patterns": [
            "Counting orbits usually means building the set of pairs (g,x) with gx=x.",
            "Conjugacy problems become stabilizer problems once you write the action explicitly.",
        ],
    },
    {
        "no": 18,
        "title": "Rings and Fields",
        "mission": "두 연산을 동시에 가진 구조를 시작한다. 덧셈은 군, 곱셈은 결합법칙, 둘 사이는 분배법칙.",
        "read_first": "field 판정은 ring axioms보다 unit 판정이 핵심이다.",
        "definitions": [
            "A ring R is an abelian group under +, has associative multiplication, and satisfies both distributive laws.",
            "A ring with unity has a multiplicative identity 1. A commutative ring has ab=ba.",
            "A unit is an element with a multiplicative inverse.",
            "A field is a commutative ring with unity 1 != 0 in which every nonzero element is a unit.",
            "A ring homomorphism preserves addition and multiplication; when unity matters, check whether it is required to preserve 1.",
        ],
        "theorems": [
            block("Zero multiplication laws", "In every ring, 0a=a0=0 and (-a)b=a(-b)=-(ab).", "Use distributivity: 0a=(0+0)a=0a+0a, then cancel in the additive group."),
            block("Product rings", "If R1,...,Rn are rings, their cartesian product is a ring under componentwise operations.", "All axioms reduce coordinate by coordinate."),
            block("Ring isomorphism transfer", "A ring isomorphism transports all purely ring-theoretic properties, such as commutativity, unity, units, and zero divisors.", "Apply the bijective homomorphism and its inverse to the defining equations."),
        ],
        "propositions": [
            block("Units form a group", "In a ring with unity, the set of units is a group under multiplication.", "Identity is a unit, products of units invert in reverse order, and inverses remain units."),
            block("Finite product fields are usually not fields", "F x K is never a field when F and K are nonzero rings, because (1,0)(0,1)=(0,0).", "It has zero divisors."),
        ],
        "examples": [
            block("Z_n", "Z_n is a commutative ring with unity. Its units are residue classes relatively prime to n.", use="이후 Fermat/Euler가 이 unit group을 사용한다."),
            block("Matrix rings", "M_n(R) is a ring with unity. For n>=2 it is typically noncommutative.", use="noncommutative 반례를 찾을 때 첫 후보."),
            block("Function rings", "All functions R->R form a commutative ring under pointwise addition and multiplication.", use="ideal 예제에서 특정 점에서 0인 함수들이 다시 등장한다."),
        ],
        "exercises": [
            block("Unit list", "Find all units in Z_12.", "The units are classes represented by 1,5,7,11."),
            block("Field test", "Decide whether Z_9 is a field.", "3 is nonzero and 3*3=0 mod 9, so no."),
            block("Homomorphism check", "Check whether phi:Z->Z_n, phi(m)=m mod n, is a ring homomorphism.", "Verify both operations. Kernel will be nZ later."),
            block("Matrix noncommutativity", "Give two 2x2 matrices over R with AB != BA.", "Elementary matrices E12 and E21 work."),
        ],
        "proof_patterns": [
            "When proving ring identities, use additive cancellation; do not divide unless a unit is known.",
            "When disproving field, exhibit one nonzero nonunit or one zero divisor.",
        ],
    },
    {
        "no": 19,
        "title": "Integral Domains",
        "mission": "zero divisor를 제거해 cancellation이 가능한 commutative ring을 얻는다.",
        "read_first": "finite integral domain -> field 증명은 이 범위에서 가장 중요한 한 줄짜리 finite argument다.",
        "definitions": [
            "A zero divisor is a nonzero a for which some nonzero b satisfies ab=0.",
            "An integral domain is a commutative ring with unity 1 != 0 and no zero divisors.",
            "The characteristic of a ring with unity is the least positive n with n*1=0, if it exists; otherwise it is 0.",
        ],
        "theorems": [
            block("Cancellation criterion", "In a ring, cancellation by every nonzero element is valid exactly when the ring has no zero divisors.", "If ac=bc, then a(c-b)=0. Without zero divisors and a != 0, c=b. Conversely, a zero divisor kills cancellation."),
            block("Finite integral domain is field", "Every finite integral domain is a field.", "For a nonzero a, the map x -> ax is injective by cancellation. A finite injective map is surjective, so ax=1 has a solution."),
            block("Characteristic of a domain", "The characteristic of an integral domain is either 0 or a prime number.", "If char is mn with 1<m,n<char, then (m*1)(n*1)=0 gives zero divisors."),
        ],
        "propositions": [
            block("Z_n zero divisors", "In Z_n, a nonzero class is a zero divisor iff gcd(a,n) != 1.", "If d=gcd(a,n)>1 then a*(n/d)=0 mod n. If gcd(a,n)=1, multiplication by a is invertible."),
            block("Subrings of domains", "A subring with the same nonzero unity inside an integral domain has no zero divisors.", "A zero divisor relation in the subring would be one in the domain."),
        ],
        "examples": [
            block("Z and Z_p", "Z is a domain but not a field. Z_p is a finite domain and therefore a field.", use="infinite domain과 finite domain의 차이를 고정한다."),
            block("Z_6", "In Z_6, 2*3=0 while 2 and 3 are nonzero. Hence Z_6 is not a domain.", use="composite modulus gives zero divisors."),
            block("Polynomial domain", "If D is a domain, D[x] is again a domain.", use="leading terms multiply without disappearing."),
        ],
        "exercises": [
            block("Cancellation", "In an integral domain, prove that ax=ay and a != 0 imply x=y.", "Move to a(x-y)=0."),
            block("Characteristic", "Show a finite field has prime characteristic.", "A field is a domain."),
            block("Z_15", "List the zero divisors of Z_15.", "Nonzero nonunits: 3,5,6,9,10,12."),
            block("Finite domain", "Let D have 10 elements and no zero divisors. Explain why every nonzero a has inverse.", "Use injective x->ax."),
        ],
        "proof_patterns": [
            "Finite + injective = surjective is the standard engine.",
            "Characteristic arguments turn composite n into (m*1)(k*1)=0.",
        ],
    },
    {
        "no": 20,
        "title": "Fermat's and Euler's Theorems",
        "mission": "정수 합동식을 Z_n의 unit group에서 푸는 법을 배운다.",
        "read_first": "Fermat와 Euler는 독립 공식이 아니라 Lagrange theorem의 unit-group 버전이다.",
        "definitions": [
            "U(n) is the group of units in Z_n.",
            "Euler phi function phi(n) is |U(n)|, the number of residues 1<=a<=n relatively prime to n.",
            "A linear congruence ax=b mod m is an equation in Z_m.",
        ],
        "theorems": [
            block("Fermat little theorem", "If p is prime and p does not divide a, then a^{p-1}=1 mod p.", "The nonzero elements of Z_p form a group of order p-1; apply Lagrange to a in that group."),
            block("Euler theorem", "If gcd(a,n)=1, then a^{phi(n)}=1 mod n.", "The class of a is in U(n), a finite group of order phi(n)."),
            block("Linear congruence criterion", "The congruence ax=b mod m has a solution iff d=gcd(a,m) divides b. If it has solutions, it has d solutions modulo m.", "Reduce by d; after division, a/d is a unit modulo m/d."),
        ],
        "propositions": [
            block("Unit criterion in Z_n", "The class a in Z_n is a unit iff gcd(a,n)=1.", "Bezout gives inverse when gcd is 1; an inverse gives a Bezout relation."),
            block("Power reduction", "When gcd(a,n)=1, exponents of a modulo n may be reduced modulo the order of a, and therefore modulo phi(n).", "The order of a divides phi(n)."),
        ],
        "examples": [
            block("Remainder of a large power", "To compute 7^100 mod 12, note phi(12)=4 and gcd(7,12)=1, so 7^100=(7^4)^25=1 mod 12.", use="지수만 줄이면 계산이 끝난다."),
            block("Solve 6x=9 mod 15", "d=gcd(6,15)=3 divides 9. Divide to 2x=3 mod 5. Since 2^{-1}=3 mod 5, x=9=4 mod 5, giving x=4,9,14 mod 15.", use="d개의 해가 나온다."),
            block("Fermat failure condition", "Fermat cannot be used for 5^k mod 10 because gcd(5,10) != 1.", use="공식 적용 전 unit 여부를 본다."),
        ],
        "exercises": [
            block("Euler reduction", "Find 3^100 mod 10.", "phi(10)=4 and 3^4=1 mod 10."),
            block("Congruence", "Solve 14x=21 mod 35.", "d=7; reduce to 2x=3 mod 5."),
            block("No solution", "Show 6x=5 mod 14 has no solution.", "gcd(6,14)=2 does not divide 5."),
            block("Phi count", "Compute phi(18).", "Units are 1,5,7,11,13,17, so phi(18)=6."),
        ],
        "proof_patterns": [
            "Before using Euler, verify gcd(a,n)=1.",
            "Linear congruence is unit inversion after dividing by gcd.",
        ],
    },
    {
        "no": 21,
        "title": "The Field of Quotients of an Integral Domain",
        "mission": "domain D를 분수체 안에 넣어 나눗셈을 가능하게 만든다.",
        "read_first": "정수에서 유리수를 만드는 방식이 모든 integral domain에 그대로 작동한다.",
        "definitions": [
            "Pairs (a,b) with a in D and b != 0 represent fractions a/b.",
            "(a,b) ~ (c,d) iff ad=bc. This is the equality rule for fractions.",
            "The canonical embedding D -> Quot(D) sends a to a/1.",
        ],
        "theorems": [
            block("Existence of quotient field", "Every integral domain D has a field F whose elements are fractions a/b with a,b in D and b != 0, and D embeds in F.", "Use the equivalence relation ad=bc, define operations on classes, and use no zero divisors to prove well-definedness."),
            block("Minimality of quotient field", "If D is embedded in a field E, then the smallest subfield of E containing D is isomorphic to Quot(D).", "Send a/b to a b^{-1} inside E and check this is a well-defined field map."),
            block("Universal property", "Any injective ring homomorphism from D to a field K extends uniquely to a field homomorphism Quot(D)->K by a/b |-> f(a)f(b)^{-1}.", "The formula is forced by preserving division."),
        ],
        "propositions": [
            block("Fraction equality", "a/b=c/d in Quot(D) iff ad=bc.", "This is the defining equivalence relation."),
            block("Nonzero inverse", "If a/b != 0, then its inverse is b/a.", "a != 0, and (a/b)(b/a)=1."),
        ],
        "examples": [
            block("Z to Q", "Quot(Z)=Q.", use="The general construction is exactly familiar fractions."),
            block("F[x] to rational functions", "For a field F, Quot(F[x]) is F(x), the field of rational functions.", use="polynomial fractions become legitimate elements."),
            block("Why domain is needed", "Z_6 cannot be used: 2/1 would equal 0/3 by cross multiplication, while 3 is nonzero but not cancellable.", use="zero divisors break fraction equality."),
        ],
        "exercises": [
            block("Well-defined addition", "Prove that a/b + c/d = (ad+bc)/bd does not depend on representatives.", "Replace a/b by a'/b' and use ab'=a'b."),
            block("Embedding", "Show a -> a/1 is injective.", "a/1=0/1 implies a=0."),
            block("Rational functions", "In Quot(Q[x]), simplify (x^2-1)/(x-1).", "It equals x+1 because x != 1 is not an evaluation condition; cancellation is polynomial factor cancellation."),
            block("Universal map", "Given f:Z->R, f(n)=n, identify the induced map Q->R.", "It is the usual inclusion of rationals into reals."),
        ],
        "proof_patterns": [
            "For fraction constructions, every proof has a representative-choice step.",
            "If a denominator might be a zero divisor, stop: quotient fields require domains.",
        ],
    },
    {
        "no": 22,
        "title": "Rings of Polynomials",
        "mission": "계수가 환/체에 있는 다항식의 ring 구조와 나눗셈 알고리즘을 정리한다.",
        "read_first": "F[x]에서만 division algorithm이 안정적으로 작동한다. 계수가 field인지 먼저 확인한다.",
        "definitions": [
            "R[x] consists of finite formal sums a0+a1 x+...+an x^n.",
            "The degree of a nonzero polynomial is the largest exponent with nonzero coefficient.",
            "The evaluation map at alpha sends f(x) to f(alpha) when alpha lies in an extension ring.",
        ],
        "theorems": [
            block("Polynomial domain theorem", "If D is an integral domain, then D[x] is an integral domain.", "The product of nonzero polynomials has leading coefficient equal to the product of leading coefficients, nonzero in D."),
            block("Division algorithm over a field", "If F is a field and g(x) != 0 in F[x], then every f(x) has unique q(x),r(x) with f=qg+r and r=0 or deg r<deg g.", "Cancel the leading term of f by multiplying g by a suitable scalar and power of x; repeat. Uniqueness follows by degree comparison."),
            block("Factor theorem", "For a in F, f(a)=0 iff x-a divides f(x).", "Divide f by x-a. The remainder has degree <1, so it is constant, and evaluating at a gives that constant."),
        ],
        "propositions": [
            block("Evaluation is a homomorphism", "For alpha in an extension ring E of R, evaluation phi_alpha:R[x]->E preserves addition and multiplication.", "Substitution distributes through finite sums and products."),
            block("Degree of product", "If D is a domain and f,g are nonzero, deg(fg)=deg f + deg g.", "Leading coefficients do not multiply to zero."),
        ],
        "examples": [
            block("Division in Q[x]", "Divide x^3+1 by x+1 to get quotient x^2-x+1 and remainder 0.", use="factor theorem also predicts this because -1 is a root."),
            block("Failure over Z", "Trying to divide x by 2 in Z[x] fails because 2 has no inverse in Z.", use="field coefficient condition matters."),
            block("Evaluation mod p", "In Z_5[x], f(x)=x^5-x evaluates to 0 for every element of Z_5 by Fermat.", use="polynomial function과 polynomial 자체는 구분해야 한다."),
        ],
        "exercises": [
            block("Factor test", "Show x^2+1 has no root in R but has roots in C.", "Evaluate real squares; in C use i and -i."),
            block("Degree", "Prove deg(f+g)<=max(deg f, deg g).", "Leading terms may cancel."),
            block("Division", "Divide x^4-1 by x^2+1 over Q.", "Quotient x^2-1, remainder 0."),
            block("Polynomial domain", "Why is Z[x] an integral domain?", "Z is an integral domain."),
        ],
        "proof_patterns": [
            "Division algorithm proofs are induction on degree.",
            "Root/factor questions should invoke division by x-a.",
        ],
    },
    {
        "no": 23,
        "title": "Factorization of Polynomials over a Field",
        "mission": "F[x]에서 irreducible factorization과 유일성을 확보한다.",
        "read_first": "degree 2,3에서는 root test가 irreducibility test다. 그 이상에서는 더 많은 도구가 필요하다.",
        "definitions": [
            "A nonconstant polynomial p in F[x] is irreducible if p=ab implies a or b is constant.",
            "Two factorizations are the same up to order and nonzero scalar factors.",
            "A prime polynomial p divides ab only when p divides a or p divides b.",
        ],
        "theorems": [
            block("Euclidean gcd theorem", "In F[x], gcds exist and can be expressed as sf+tg for polynomials s,t.", "Use the division algorithm exactly as in the Euclidean algorithm for integers."),
            block("Irreducible implies prime in F[x]", "If p is irreducible in F[x] and p divides ab, then p divides a or p divides b.", "If p does not divide a, gcd(p,a)=1; Bezout gives sp+ta=1. Multiply by b."),
            block("Unique factorization in F[x]", "Every nonconstant polynomial in F[x] factors into irreducibles, and the factorization is unique up to order and units.", "Existence by induction on degree. Uniqueness by irreducible implies prime."),
        ],
        "propositions": [
            block("Degree 2 or 3 criterion", "A polynomial over F of degree 2 or 3 is reducible iff it has a root in F.", "A proper factorization must include a linear factor."),
            block("Root bound", "A nonzero polynomial of degree n over a field has at most n roots.", "Each root contributes a factor x-a; degree limits how many can occur."),
        ],
        "examples": [
            block("x^2+x+1 over Z_2", "Evaluate at 0 and 1. Both are nonzero, so the quadratic is irreducible over Z_2.", use="This polynomial constructs the field with four elements later."),
            block("x^4-1 over Q", "x^4-1=(x-1)(x+1)(x^2+1), and x^2+1 is irreducible over Q.", use="factorization depends on the base field."),
            block("Finite subgroup of a field", "A finite subgroup of F* is cyclic.", use="This result explains multiplicative groups of finite fields later."),
        ],
        "exercises": [
            block("Irreducible cubic", "Determine whether x^3+x+1 is irreducible over Z_2.", "Check roots 0 and 1."),
            block("Root bound proof", "Prove a degree n polynomial has at most n roots.", "Induct using the factor theorem."),
            block("Factor over fields", "Factor x^2-2 over Q and over R.", "Irreducible over Q, linear factors over R."),
            block("GCD", "Find gcd(x^2-1, x^2-2x+1) in Q[x].", "Common factor is x-1."),
        ],
        "proof_patterns": [
            "Irreducibility is always relative to the field.",
            "For uniqueness proofs, use Bezout to turn irreducible into prime.",
        ],
    },
    {
        "no": 24,
        "title": "Noncommutative Examples",
        "mission": "곱셈이 교환되지 않는 ring에서 어떤 직관이 깨지는지 확인한다.",
        "read_first": "AB=BA를 아무 때나 쓰는 순간 이 장의 문제는 틀린다.",
        "definitions": [
            "A noncommutative ring is a ring whose multiplication need not satisfy ab=ba.",
            "A division ring has unity and every nonzero element is a unit, but multiplication may be noncommutative.",
            "The quaternions H have basis 1,i,j,k with i^2=j^2=k^2=-1 and ij=k=-ji.",
        ],
        "theorems": [
            block("Matrix ring theorem", "For any ring R with unity, M_n(R) is a ring with unity under matrix addition and multiplication.", "Associativity and distributivity follow from finite summation and ring distributivity in R."),
            block("Quaternion division theorem", "Every nonzero quaternion has a multiplicative inverse, so H is a division ring.", "Use conjugation: q^{-1}=conj(q)/N(q), where N(q)=q conj(q) is a positive real for q != 0."),
            block("Field distinction", "Every field is a division ring, but not every division ring is a field.", "H is the standard counterexample because ij=-ji."),
        ],
        "propositions": [
            block("Order reversal for inverses", "In a noncommutative ring, if a and b are units, then (ab)^{-1}=b^{-1}a^{-1}.", "Multiply ab by b^{-1}a^{-1} on both sides in the correct order."),
            block("Center is commutative", "The center Z(R)={a in R | ar=ra for all r in R} is a commutative subring when R has unity.", "Elements in the center commute with everything, in particular with each other."),
        ],
        "examples": [
            block("2x2 matrices", "Let A=E12 and B=E21. Then AB=E11 while BA=E22.", use="A tiny explicit witness of noncommutativity."),
            block("Quaternions", "ij=k but ji=-k. Both i and j are units, but their product order matters.", use="division does not force commutativity."),
            block("Endomorphism ring", "Linear maps V->V form a ring under addition and composition. Composition is generally noncommutative.", use="Functions and matrices share the same obstruction."),
        ],
        "exercises": [
            block("Inverse order", "Prove (abc)^{-1}=c^{-1}b^{-1}a^{-1}.", "Multiply in order."),
            block("Center of matrices", "Show the center of M_n(F) is the scalar matrices.", "Commute with elementary matrices."),
            block("Quaternion calculation", "Compute (i+j)^2 in H.", "i^2+ij+ji+j^2=-2."),
            block("Bad cancellation", "Find matrices A,B,C with AB=AC but B != C.", "Use a nonzero singular A."),
        ],
        "proof_patterns": [
            "Preserve order in every multiplication line.",
            "Counterexamples are easiest in M_2(F).",
        ],
    },
    {
        "no": 25,
        "title": "Ordered Rings and Fields",
        "mission": "대수 구조와 순서가 호환될 때 생기는 강한 제한을 본다.",
        "read_first": "ordered ring은 positive set P 하나로 제어된다.",
        "definitions": [
            "An ordered ring has a total order compatible with addition and multiplication by positive elements.",
            "A positive cone P satisfies closure under +, closure under multiplication, and exactly one of a=0, a in P, -a in P.",
            "a<b is defined by b-a in P.",
        ],
        "theorems": [
            block("Positive cone equivalence", "Giving an order compatible with ring operations is equivalent to giving a positive cone P with the three cone properties.", "From an order take P={a:a>0}. From P define a<b iff b-a in P and verify order laws."),
            block("Squares are nonnegative", "In an ordered ring, a^2>=0 for every a, and if a != 0 then a^2>0.", "If a>0, closure gives a^2>0. If a<0, then -a>0 and a^2=(-a)^2>0."),
            block("Ordered domains have characteristic 0", "An ordered ring with unity and no collapse of order has characteristic 0.", "1>0, so n*1 is positive for every n>0 and cannot be 0."),
        ],
        "propositions": [
            block("No finite ordered fields", "A finite field cannot be ordered.", "Finite fields have positive prime characteristic, but ordered fields have characteristic 0."),
            block("-1 is not a square", "In an ordered field, -1 cannot be a square.", "Squares are nonnegative while -1<0."),
        ],
        "examples": [
            block("Q and R", "The usual orders on Q and R make them ordered fields.", use="standard model."),
            block("C is not ordered", "C cannot be ordered as a field because i^2=-1.", use="one-line obstruction."),
            block("Polynomial rings", "R[x] can be ordered by declaring the leading coefficient of a polynomial positive.", use="order need not come from evaluating at a real number."),
        ],
        "exercises": [
            block("Z_p obstruction", "Show Z_p cannot be an ordered field.", "Use characteristic p."),
            block("Square argument", "Prove that if F is ordered then x^2+1 has no root in F.", "x^2>=0."),
            block("Cone check", "Given P in Q as positive rationals, verify the cone axioms.", "Closure and trichotomy."),
            block("Order transport", "If F is ordered and K is isomorphic to F, define an order on K.", "Pull back the positive cone through the isomorphism."),
        ],
        "proof_patterns": [
            "Ordered-field impossibility usually follows from characteristic or -1 square obstruction.",
            "Use P rather than informal sign language when proving abstract order facts.",
        ],
    },
    {
        "no": 26,
        "title": "Homomorphisms and Factor Rings",
        "mission": "kernel이 ideal이기 때문에 ring quotient가 가능해진다.",
        "read_first": "subring으로는 quotient ring을 만들 수 없다. 곱셈이 well-defined 되려면 ideal이어야 한다.",
        "definitions": [
            "A ring homomorphism preserves addition and multiplication.",
            "Ker(phi)={r in R | phi(r)=0}.",
            "An ideal N of R is an additive subgroup such that rN and Nr lie in N for all r in R.",
            "The factor ring R/N consists of additive cosets r+N with induced addition and multiplication.",
        ],
        "theorems": [
            block("Kernel ideal theorem", "The kernel of a ring homomorphism phi:R->R' is an ideal of R.", "Additive subgroup follows from group homomorphism. If a in Ker(phi), then phi(ra)=phi(r)phi(a)=0 and similarly phi(ar)=0."),
            block("Factor ring construction", "If N is an ideal of R, then (a+N)(b+N)=ab+N is well-defined and makes R/N a ring.", "Changing representatives adds terms in N: an, mb, nm. Ideal absorption keeps them in N."),
            block("Fundamental homomorphism theorem", "For a ring homomorphism phi:R->R', R/Ker(phi) is isomorphic to the image phi[R].", "Map r+Ker(phi) to phi(r). The kernel condition is exactly the well-definedness condition."),
        ],
        "propositions": [
            block("Natural projection", "The map pi:R->R/N, pi(r)=r+N, is a surjective ring homomorphism with kernel N.", "Directly check operations and pi(r)=N iff r in N."),
            block("Ideal test in commutative rings", "In a commutative ring, an additive subgroup N is an ideal iff r n in N for all r in R and n in N.", "Left and right absorption coincide."),
        ],
        "examples": [
            block("Z/nZ", "The map Z->Z_n has kernel nZ, so Z/nZ ≅ Z_n.", use="the prototype quotient ring."),
            block("Evaluation quotient", "For phi_a:F[x]->F, phi_a(f)=f(a), the kernel is (x-a), so F[x]/(x-a)≅F.", use="root/factor theorem as homomorphism theorem."),
            block("Function vanishing ideal", "Continuous or arbitrary functions vanishing at a point form an ideal in a function ring.", use="geometric intuition: quotient remembers the value at that point."),
        ],
        "exercises": [
            block("Kernel", "Find the kernel of phi:Z[x]->Z, phi(f)=f(0).", "Polynomials with constant term 0, i.e. (x)."),
            block("Well-defined", "Show multiplication in R/N is well-defined when N is an ideal.", "Expand (a+n)(b+m)-ab."),
            block("Not ideal", "Give a subring of a ring that is not an ideal.", "Z as scalar matrices? Easier: diagonal matrices inside M_2(F) are not ideal."),
            block("Image quotient", "Compute R[x]/(x^2+1) over R as a familiar field.", "It is isomorphic to C."),
        ],
        "proof_patterns": [
            "For quotient multiplication, always compare two representatives and show the difference is in N.",
            "For homomorphism theorem, define the map on cosets and prove well-definedness first.",
        ],
    },
    {
        "no": 27,
        "title": "Prime and Maximal Ideals",
        "mission": "ideal의 성질로 quotient ring이 domain인지 field인지 판정한다.",
        "read_first": "maximal <-> quotient field, prime <-> quotient domain. 이 두 줄을 외워도 된다.",
        "definitions": [
            "A maximal ideal M is a proper ideal with no proper ideal strictly between M and R.",
            "A prime ideal P in a commutative ring satisfies ab in P -> a in P or b in P.",
            "A principal ideal (a) consists of all multiples ra.",
            "Prime fields are the smallest subfields: Q in characteristic 0 and Z_p in characteristic p.",
        ],
        "theorems": [
            block("Maximal quotient theorem", "For a commutative ring R with unity, M is maximal iff R/M is a field.", "If M maximal and a notin M, then M+(a)=R, so 1=m+ra and a+M has inverse r+M. Conversely, ideals between M and R correspond to ideals of R/M."),
            block("Prime quotient theorem", "For a commutative ring R with unity, P is prime iff R/P is an integral domain.", "ab in P exactly means (a+P)(b+P)=0 in R/P. Domain zero-product property is the prime condition."),
            block("Ideals in F[x]", "If F is a field, every ideal of F[x] is principal.", "Choose a nonzero polynomial of least degree in the ideal; division shows every element is its multiple."),
        ],
        "propositions": [
            block("Maximal implies prime", "Every maximal ideal in a commutative ring with unity is prime.", "R/M field implies R/M domain."),
            block("Irreducible quotient", "For p(x) in F[x], the quotient F[x]/(p) is a field iff p is irreducible.", "In F[x], irreducible p generates a maximal ideal."),
        ],
        "examples": [
            block("Ideals of Z", "Every ideal of Z is nZ. The ideal nZ is maximal iff n is prime, and prime iff n is prime or n=0.", use="Z/nZ tells the quotient story."),
            block("F[x]/(x^2+1)", "Over R, (x^2+1) is maximal and the quotient is C. Over C, x^2+1 factors, so the ideal is not maximal.", use="base field matters."),
            block("Z x Z", "Z x {0} is prime but not maximal? The quotient is Z, a domain but not a field.", use="prime and maximal differ outside special rings."),
        ],
        "exercises": [
            block("Maximal in Z", "For which n is nZ maximal in Z?", "Exactly prime n."),
            block("Prime quotient", "Show (x) is prime in F[x,y].", "Quotient by (x) is isomorphic to F[y], a domain."),
            block("Maximal quotient", "Show (x-a) is maximal in F[x].", "Quotient is F by evaluation at a."),
            block("Not prime", "Show (6) is not prime in Z.", "2*3 in (6), but neither 2 nor 3 is in (6)."),
        ],
        "proof_patterns": [
            "Translate ideal questions into quotient questions whenever possible.",
            "Minimal-degree arguments in F[x] use division algorithm.",
        ],
    },
    {
        "no": 28,
        "title": "Groebner Bases for Ideals",
        "mission": "다변수 polynomial ideal에서 나머지와 membership을 계산 가능하게 만든다.",
        "read_first": "깊은 이론보다 term order, leading term, reduction, S-polynomial의 흐름을 잡는다.",
        "definitions": [
            "A monomial order is a total order on power products compatible with multiplication.",
            "The leading term LT(f) is the largest term of f under the chosen order.",
            "A Groebner basis G for I is a generating set whose leading terms generate all leading terms of elements of I.",
            "The S-polynomial of f and g cancels their leading terms using the least common multiple of leading monomials.",
        ],
        "theorems": [
            block("Division by a list", "Given an ordered list of polynomials, a polynomial f can be reduced to a remainder not divisible by any leading term in the list.", "Repeatedly cancel the current leading term when possible. Term order prevents infinite descent."),
            block("Groebner membership test", "If G is a Groebner basis for I, then f lies in I iff the remainder of f on division by G is 0.", "If remainder r is nonzero and f in I, then LT(r) should be divisible by some LT(g), contradicting reducedness."),
            block("Buchberger criterion", "A generating set G is a Groebner basis iff every S-polynomial S(g_i,g_j) reduces to 0 modulo G.", "The criterion detects whether all leading-term conflicts have been resolved."),
        ],
        "propositions": [
            block("Lex elimination signal", "With lex order, Groebner bases often contain polynomials involving fewer variables, enabling elimination.", "Leading terms prioritize variables, forcing reductions to remove the larger variables first."),
            block("One-variable case", "In F[x], a single generator of an ideal is already a Groebner basis.", "The division algorithm gives the membership test."),
        ],
        "examples": [
            block("Membership", "To test f in (g1,g2), reduce f by a Groebner basis for the ideal. Remainder 0 means yes; nonzero means no.", use="ordinary generators may not be enough unless they are Groebner."),
            block("Simple basis", "In F[x,y] with lex order x>y, {x-y, y^2-1} lets you eliminate x and solve y^2=1 first.", use="system solving becomes triangular."),
            block("Why S-polynomials appear", "If LT(f) and LT(g) overlap, their leading terms can cancel in a combination. S-polynomial tests whether that cancellation creates a new leading term.", use="Buchberger is conflict resolution."),
        ],
        "exercises": [
            block("Reduce", "Reduce f=x^2y+xy by G={x-y} under lex x>y.", "Replace x by y step by step; final expression is in y."),
            block("Membership idea", "Explain why a nonzero remainder proves f notin I when G is Groebner.", "Use the leading-term contradiction."),
            block("S-polynomial", "Write the S-polynomial formula for f and g using lcm of leading monomials.", "S = l/LT(f) * f - l/LT(g) * g, up to leading coefficients."),
            block("One-variable", "Why is every ideal in F[x] computationally easy compared with F[x,y]?", "Division by the gcd/single generator controls membership."),
        ],
        "proof_patterns": [
            "Term order arguments end because leading monomials strictly decrease.",
            "Membership proof is always: nonzero reduced remainder would have an impossible leading term.",
        ],
    },
    {
        "no": 29,
        "title": "Introduction to Extension Fields",
        "mission": "체 F에 없는 다항식의 근을 quotient로 붙인다.",
        "read_first": "F[x]/(irreducible f)는 f의 새 근을 포함하는 field다.",
        "definitions": [
            "An extension field E of F is a field containing a copy of F.",
            "An element alpha in E is algebraic over F if f(alpha)=0 for some nonzero f in F[x].",
            "If no such f exists, alpha is transcendental over F.",
            "The minimal polynomial of alpha over F is the monic irreducible polynomial in F[x] of least degree killing alpha.",
            "F(alpha) is the smallest subfield of E containing F and alpha.",
        ],
        "theorems": [
            block("Kronecker theorem", "For any nonconstant f in F[x], there is an extension field E of F in which f has a zero.", "Take an irreducible factor p of f. Since (p) is maximal, F[x]/(p) is a field. The class of x is a root of p, hence of f if p divides f."),
            block("Evaluation kernel theorem", "For alpha in an extension E, the evaluation map F[x]->E has kernel {0} if alpha is transcendental, and kernel (m_alpha) if alpha is algebraic.", "The kernel is an ideal of F[x]. Since F[x] is principal, a nonzero kernel has a monic generator, which is the minimal polynomial."),
            block("Simple algebraic extension form", "If deg m_alpha=n, every element of F(alpha) has a unique expression c0+c1 alpha+...+c_{n-1} alpha^{n-1}.", "Reduce higher powers by m_alpha(alpha)=0; uniqueness follows from minimality."),
        ],
        "propositions": [
            block("Minimal polynomial is irreducible", "The minimal polynomial of an algebraic element over F is irreducible in F[x].", "If it factored, one factor would vanish at alpha with smaller positive degree."),
            block("F[alpha]=F(alpha) for algebraic alpha", "When alpha is algebraic over F, the ring generated by alpha is already a field.", "Every nonzero polynomial in alpha has an inverse modulo the minimal polynomial."),
        ],
        "examples": [
            block("Complex numbers from R", "R[x]/(x^2+1) is a field where the class of x squares to -1; it is isomorphic to C.", use="adjoining i is quotienting by x^2+1."),
            block("Four-element field", "Z_2[x]/(x^2+x+1) has elements 0,1,a,1+a with a^2+a+1=0.", use="finite fields begin as quotient fields."),
            block("sqrt(1+sqrt3)", "This real number is algebraic over Q because repeated squaring gives a polynomial equation with rational coefficients.", use="algebraic does not mean easy-looking."),
        ],
        "exercises": [
            block("Minimal polynomial", "Find the minimal polynomial of sqrt2 over Q.", "x^2-2."),
            block("Quotient root", "In F[x]/(f), prove the class of x is a root of f.", "Evaluate f at x+(f)."),
            block("Element form", "List all elements of Z_2(a) where a^2+a+1=0.", "0,1,a,1+a."),
            block("Transcendental contrast", "Explain why Q(pi) is not covered by the finite-basis statement unless pi is algebraic.", "pi is transcendental over Q."),
        ],
        "proof_patterns": [
            "Adjoin a root by quotienting F[x] by an irreducible polynomial.",
            "To show algebraic, produce any nonzero polynomial over the base field that vanishes.",
        ],
    },
    {
        "no": 30,
        "title": "Vector Spaces",
        "mission": "extension field의 크기를 vector space dimension으로 잰다.",
        "read_first": "이 장의 선형대수는 F(alpha)의 basis와 degree 계산을 위한 도구다.",
        "definitions": [
            "A vector space over F is an abelian group V with scalar multiplication by F satisfying the usual distributive and identity laws.",
            "A set spans V if every vector is a finite linear combination of its elements.",
            "A set is linearly independent if only the trivial finite linear combination gives 0.",
            "A basis is a spanning linearly independent set.",
            "The dimension of a finite-dimensional vector space is the size of a basis.",
        ],
        "theorems": [
            block("Spanning set contains a basis", "Every finite spanning set of a vector space contains a basis.", "Remove dependent vectors one at a time without changing the span until independence remains."),
            block("Independent set bound", "In a finite-dimensional vector space, any linearly independent set has at most as many elements as any spanning set.", "Exchange one independent vector into a spanning set at a time."),
            block("Degree of simple extension", "If alpha is algebraic over F with minimal polynomial degree n, then [F(alpha):F]=n and {1,alpha,...,alpha^{n-1}} is a basis.", "Section 29 gives unique expression; that is exactly basis existence and uniqueness."),
        ],
        "propositions": [
            block("All finite bases have same size", "Any two finite bases of V have the same number of elements.", "Apply the independent set bound in both directions."),
            block("Finite-dimensional subspace bound", "A linearly independent set in an n-dimensional space has at most n vectors.", "Use any basis as a spanning set."),
        ],
        "examples": [
            block("R^n over R", "The standard unit vectors form a basis, so dim_R R^n=n.", use="baseline vector-space model."),
            block("C over R", "C has basis {1,i} over R, so [C:R]=2.", use="extension degree as dimension."),
            block("Q(sqrt2) over Q", "Every element has form a+b sqrt2 with a,b in Q; basis {1,sqrt2}.", use="minimal polynomial degree 2 becomes vector-space degree 2."),
        ],
        "exercises": [
            block("Basis check", "Show {1,sqrt2} is linearly independent over Q.", "a+b sqrt2=0 with rational a,b implies sqrt2 rational unless b=0."),
            block("Dimension", "Find [Q(cuberoot2):Q].", "Minimal polynomial x^3-2 is irreducible over Q."),
            block("Span", "Explain why F[x] is infinite-dimensional over F.", "The monomials 1,x,x^2,... cannot be spanned by finitely many of them."),
            block("Exchange", "If V is spanned by 3 vectors, can it contain 4 linearly independent vectors?", "No."),
        ],
        "proof_patterns": [
            "Basis proofs split into spanning and independence.",
            "Extension degree questions become minimal polynomial degree questions for simple algebraic extensions.",
        ],
    },
    {
        "no": 31,
        "title": "Algebraic Extensions",
        "mission": "여러 algebraic element를 붙일 때 degree와 algebraicity가 어떻게 누적되는지 배운다.",
        "read_first": "tower law 하나로 extension degree 계산의 대부분이 끝난다.",
        "definitions": [
            "The degree [E:F] of a field extension is dim_F E.",
            "A finite extension has finite degree.",
            "An algebraic extension is one in which every element of E is algebraic over F.",
            "A field is algebraically closed if every nonconstant polynomial over it has a root in it.",
        ],
        "theorems": [
            block("Tower law", "If F <= K <= E and the relevant degrees are finite, then [E:F]=[E:K][K:F].", "Multiply a basis of K over F with a basis of E over K; products form a basis of E over F."),
            block("Finite extensions are algebraic", "If [E:F] is finite, then every element of E is algebraic over F.", "For alpha in E, the list 1,alpha,...,alpha^n is linearly dependent once n=[E:F], producing a polynomial relation."),
            block("Algebraic elements form a field", "Inside an extension E of F, the set of all elements algebraic over F is a subfield of E.", "For alpha,beta algebraic, F(alpha,beta) is finite over F; sums, products, negatives, inverses lie in that finite extension and are algebraic."),
            block("Algebraically closed criterion", "A field F is algebraically closed iff every nonconstant polynomial in F[x] splits into linear factors over F.", "A root gives a linear factor; repeat by induction on degree."),
        ],
        "propositions": [
            block("Divisibility of degrees", "If beta lies in F(alpha), then [F(beta):F] divides [F(alpha):F].", "Use F <= F(beta) <= F(alpha) and tower law."),
            block("Algebraic over algebraic", "If E is algebraic over K and K is algebraic over F, then E is algebraic over F.", "Each element is contained in a finite extension generated by finitely many algebraic coefficients."),
        ],
        "examples": [
            block("Q(sqrt2,sqrt3)", "The degree is 4: Q(sqrt2,sqrt3) has basis {1,sqrt2,sqrt3,sqrt6} over Q.", use="tower law plus noncontainment."),
            block("Nested radicals", "Q(sqrt2, cuberoot2) has degree 6 if x^3-2 remains irreducible over Q(sqrt2).", use="multiply degrees when the second polynomial remains irreducible."),
            block("Algebraic numbers", "All complex numbers algebraic over Q form a field.", use="closure under field operations is nontrivial and useful."),
        ],
        "exercises": [
            block("Tower law use", "If [E:K]=3 and [K:F]=4, find [E:F].", "12."),
            block("Finite implies algebraic", "Produce the polynomial relation for alpha in a 3-dimensional extension.", "The four vectors 1,alpha,alpha^2,alpha^3 are dependent."),
            block("Degree divisibility", "Can Q(sqrt2) contain cuberoot2?", "No, degree 3 would divide degree 2 if it did."),
            block("Algebraically closed", "Why is R not algebraically closed?", "x^2+1 has no real root."),
        ],
        "proof_patterns": [
            "When stuck on algebraicity of a combination, put all ingredients in one finite extension.",
            "Degree impossibility is often divisibility via tower law.",
        ],
    },
    {
        "no": 32,
        "title": "Geometric Constructions",
        "mission": "자와 컴퍼스 문제를 extension degree 문제로 바꾼다.",
        "read_first": "constructible number는 사칙연산과 square root만으로 얻어진다.",
        "definitions": [
            "A real number is constructible if it appears as a coordinate of a point constructible from 0 and 1 by straightedge and compass.",
            "Constructible numbers form a subfield of R.",
            "A quadratic extension is obtained by adjoining a square root of an element already present.",
        ],
        "theorems": [
            block("Field operations are constructible", "If alpha and beta are constructible, then alpha+beta, alpha-beta, alpha beta, and alpha/beta for beta != 0 are constructible.", "Classical line constructions implement arithmetic on a fixed coordinate line."),
            block("Square roots are constructible", "If alpha>0 is constructible, then sqrt(alpha) is constructible.", "Use similar triangles or circle construction to realize geometric mean."),
            block("Constructible degree obstruction", "If alpha is constructible and algebraic over Q, then [Q(alpha):Q] is a power of 2 divisor; more precisely alpha lies in a tower of quadratic extensions over Q.", "Every new intersection point solves at most a quadratic equation over the previous coordinate field."),
        ],
        "propositions": [
            block("Line-circle algebra", "Coordinates of intersections of constructible lines and circles are obtained by solving linear or quadratic equations over the previous field.", "Line equations are linear; circle equations are quadratic."),
            block("Non-power-of-two obstruction", "If the minimal polynomial degree of alpha over Q is not a power of 2, then alpha is not constructible.", "The degree would need to divide a power of 2 by tower law."),
        ],
        "examples": [
            block("Doubling the cube", "cuberoot2 has minimal polynomial x^3-2 over Q, degree 3, so it is not constructible.", use="degree 3 is not compatible with quadratic towers."),
            block("Angle trisection", "Trisecting a general 60-degree angle would construct cos 20 degrees, which satisfies a cubic obstruction.", use="not every angle can be trisected."),
            block("Squaring the circle", "A square with area pi would construct sqrt(pi), which would make pi algebraic/constructible; pi is transcendental, so impossible.", use="this uses a deeper fact about pi."),
        ],
        "exercises": [
            block("Constructible closure", "Show constructible numbers are closed under subtraction.", "Use field operation theorem or reflect lengths on the line."),
            block("Degree test", "Can a root of an irreducible quintic over Q be constructible?", "Not if its degree is 5."),
            block("sqrt tower", "Explain why sqrt(1+sqrt2) is constructible.", "Start with sqrt2, then add 1, then take another square root."),
            block("Cube duplication", "Formalize the obstruction for constructing a cube with twice the volume.", "The side length would be cuberoot2."),
        ],
        "proof_patterns": [
            "Translate geometry into coordinates, then coordinates into field extensions.",
            "Impossibility proofs need algebraic degree evidence; pictures alone do not prove impossibility.",
        ],
    },
]


EXTRA = {
    17: {
        "examples": [
            block("Round-table seating", "Circular seating is counted by quotienting ordinary arrangements by the rotation action.", use="If all n people are distinct, rotations identify n linear arrangements, giving (n-1)! circular arrangements."),
            block("Cube face markings", "A cube-marking problem is a Burnside problem for the 24-element rotation group of the cube.", use="It is the canonical example where fixed counts are grouped by rotation type."),
        ],
        "exercises": [
            block("Table seating", "How many ways can seven distinct people sit around a round table up to rotation?", "6!."),
            block("Fixed-point table", "For a square with two colors on vertices, make the full Burnside fixed-point table for D4.", "Group the eight symmetries by type: identity, rotations, and reflections."),
        ],
    },
    18: {
        "theorems": [
            block("Subring test", "A nonempty subset S of a ring R is a subring if it is closed under subtraction and multiplication.", "Closure under subtraction gives an additive subgroup; multiplication closure supplies the inherited product."),
            block("Chinese remainder model for coprime moduli", "If gcd(r,s)=1, then Z_{rs} is isomorphic to Z_r x Z_s as rings.", "Send n mod rs to (n mod r, n mod s); Bezout gives bijectivity."),
        ],
        "examples": [
            block("Chinese remainder example", "Z_15 is isomorphic to Z_3 x Z_5.", use="This explains why arithmetic modulo a composite can split into prime-power pieces."),
        ],
        "exercises": [
            block("Subring test", "Use the subring test to show 2Z is a subring of Z without unity.", "It is closed under subtraction and multiplication but does not contain 1."),
            block("CRT calculation", "Find the element of Z_15 corresponding to (1,2) in Z_3 x Z_5.", "Solve n=1 mod 3 and n=2 mod 5."),
        ],
    },
    19: {
        "theorems": [
            block("Every field is a domain", "Every field is an integral domain.", "If ab=0 and a != 0, multiply by a^{-1} to get b=0."),
            block("Z_p field criterion", "Z_p is a field exactly when p is prime.", "Prime p gives no zero divisors; if n is composite, Z_n has zero divisors."),
        ],
        "examples": [
            block("Matrix zero divisors over a field", "Even if F is a field, M_2(F) has zero divisors such as nonzero singular matrices.", use="domain requires commutativity and no zero divisors; matrix rings fail both patterns."),
        ],
        "exercises": [
            block("Field to domain", "Write the one-line proof that a field has no zero divisors.", "Multiply ab=0 by a^{-1} when a is nonzero."),
        ],
    },
    21: {
        "theorems": [
            block("Uniqueness of quotient fields", "Any two fields of quotients of the same integral domain are isomorphic by an isomorphism fixing the original domain.", "Use the universal fraction map both ways; each fraction a/b must be sent to the corresponding fraction."),
        ],
        "exercises": [
            block("Uniqueness map", "If F and K are both quotient fields of D, describe the isomorphism F->K on a/b.", "It sends a/b to the same formal fraction inside K."),
        ],
    },
    22: {
        "theorems": [
            block("R[x] is a ring", "For any ring R, the set R[x] of polynomials with coefficients in R is a ring under formal addition and multiplication.", "Coefficient formulas reduce associativity and distributivity to the same laws in R."),
            block("Evaluation homomorphism", "If F <= E and alpha in E, then phi_alpha:F[x]->E, f |-> f(alpha), is a ring homomorphism.", "Substitution respects finite sums and products."),
            block("Irrationality of sqrt2 via polynomials", "The polynomial x^2-2 has no rational zero.", "If m/n is a rational root in lowest terms, parity forces both m and n even."),
        ],
        "exercises": [
            block("Evaluation kernel preview", "For phi_2:Q[x]->Q, find a nonzero polynomial in the kernel.", "Any multiple of x-2 works."),
            block("No rational root", "Prove x^2-3 has no rational zero by the same method as x^2-2.", "Use prime divisibility."),
        ],
    },
    23: {
        "theorems": [
            block("Gauss-type reducibility over Q", "A polynomial in Z[x] that factors over Q into lower-degree polynomials also factors over Z after clearing unit factors appropriately.", "Clear denominators and use primitive parts; this moves rational factorization back to integer coefficients."),
            block("Rational zero theorem", "If a monic or integer polynomial has a rational zero m/n in lowest terms, then numerator and denominator divide the appropriate constant and leading coefficients.", "Substitute m/n and compare divisibility after multiplying by n^d."),
            block("Eisenstein criterion", "If a prime p divides every coefficient except the leading coefficient, p does not divide the leading coefficient, and p^2 does not divide the constant term, then the polynomial is irreducible over Q.", "Assume a factorization in Z[x]; reduction of coefficients forces both constant terms to be divisible by p, contradicting the p^2 condition."),
        ],
        "examples": [
            block("Eisenstein example", "x^5+6x+3 is irreducible over Q by Eisenstein with p=3.", use="A fast irreducibility certificate."),
            block("Rational zero example", "For x^3-2, the rational zero theorem leaves possible rational roots ±1, ±2; none work, so the cubic is irreducible over Q.", use="Degree 3 plus no rational root gives irreducible."),
        ],
        "exercises": [
            block("Use Eisenstein", "Prove x^4+10x^2+5 is irreducible over Q.", "Use p=5."),
            block("Rational root list", "List all possible rational roots of 2x^3-3x+6.", "Numerators divide 6 and denominators divide 2."),
        ],
    },
    24: {
        "theorems": [
            block("Endomorphism ring", "For an abelian group A, End(A) is a ring under pointwise addition and composition.", "Addition is inherited from A; multiplication is composition, and composition distributes over pointwise addition."),
            block("Wedderburn theorem", "Every finite division ring is commutative; equivalently, every finite division ring is a field.", "The proof is deeper than this study page needs, but the statement is a major boundary between finite and infinite noncommutative algebra."),
        ],
        "examples": [
            block("End(Z_n)", "End(Z_n) is naturally isomorphic to Z_n: an endomorphism is determined by the image of 1.", use="A concrete endomorphism ring that is commutative."),
        ],
        "exercises": [
            block("Endomorphism addition", "For endomorphisms f,g of an abelian group A, prove f+g is again an endomorphism.", "Use commutativity of A to rearrange f(a+b)+g(a+b)."),
            block("Finite division ring consequence", "Why can there be no noncommutative division ring with exactly 8 elements?", "Wedderburn says every finite division ring is a field."),
        ],
    },
    25: {
        "theorems": [
            block("Order transport by isomorphism", "A ring isomorphism from an ordered ring transports the positive cone and hence the order to the target ring.", "Declare y positive when y=phi(x) for some positive x; cone axioms follow from the homomorphism laws."),
            block("Ordering the quotient field", "The field of quotients of an ordered integral domain has a natural compatible ordering extending the original one.", "Define a/b positive when ab is positive after choosing b with sign accounted for; check this is independent of representatives."),
        ],
        "examples": [
            block("Ordering Q from Z", "The usual order on Z extends to the usual order on Q by the quotient-field ordering theorem.", use="This is the prototype for ordered domains."),
        ],
        "exercises": [
            block("Transport order", "If phi:R->S is a ring isomorphism and R is ordered, write the positive cone of S.", "P_S=phi[P_R]."),
            block("Quotient field sign", "In an ordered domain, explain why a/b and (-a)/(-b) get the same sign.", "Their cross-products represent the same fraction and the sign rule is representative-independent."),
        ],
    },
    26: {
        "theorems": [
            block("Coset multiplication criterion", "For a subring H of R, multiplication on additive cosets by (a+H)(b+H)=ab+H is well-defined exactly when H absorbs multiplication as an ideal.", "Representative changes introduce ah, hb, and h1h2 terms; these must always lie in H."),
        ],
        "examples": [
            block("Factor ring Z/nZ", "Since nZ is an ideal of Z, the additive cosets form the ring Z/nZ.", use="This connects factor rings back to modular arithmetic."),
        ],
        "exercises": [
            block("Ideal necessity", "Find where the proof of quotient multiplication fails if H is merely a subring.", "The cross terms ah and hb need not lie in H."),
        ],
    },
    27: {
        "theorems": [
            block("Field ideal criterion", "A commutative ring with unity is a field iff it has no proper nontrivial ideals.", "If a nonzero a is not a unit, then (a) is a proper nontrivial ideal. Conversely, fields have only {0} and F."),
            block("Prime subfield theorem", "A field has characteristic p and contains a copy of Z_p, or has characteristic 0 and contains a copy of Q.", "Map Z into the field by n |-> n*1 and inspect the kernel."),
        ],
        "examples": [
            block("Prime but not maximal", "In Z x Z, the ideal Z x {0} is prime because the quotient is Z, but it is not maximal because Z is not a field.", use="This separates prime from maximal."),
        ],
        "exercises": [
            block("Finite prime is maximal", "Show that in a finite commutative ring with unity, every prime ideal is maximal.", "The quotient is a finite integral domain, hence a field."),
        ],
    },
    28: {
        "definitions": [
            "The algebraic variety V(S) is the set of common zeros of a finite set S of polynomials.",
            "A basis of an ideal I is a finite set of polynomials that generates I as an ideal.",
        ],
        "theorems": [
            block("Hilbert basis theorem", "Every ideal in F[x_1,...,x_n] has a finite basis.", "The proof is omitted here; its role is to guarantee finite data behind polynomial ideals."),
            block("Common zeros depend on ideal", "A set of polynomials and the ideal it generates have the same common zero set.", "If every generator vanishes at a point, every polynomial combination of them also vanishes there."),
        ],
        "examples": [
            block("Variety of a line", "For S={2x+y-2} in R[x,y], V(S) is the line 2x+y=2.", use="A variety is the geometric shadow of equations."),
            block("Ideal basis versus Groebner basis", "A generating set can be a basis of an ideal without being a Groebner basis.", use="Groebner basis is a stronger computational basis."),
        ],
        "exercises": [
            block("Same variety", "Show V(f,g)=V((f,g)) for two polynomials f,g.", "Use closure under polynomial combinations."),
            block("Groebner need", "Explain why Hilbert basis theorem alone does not give an algorithm for ideal membership.", "It gives finite generation, not a reduction procedure."),
        ],
    },
    29: {
        "definitions": [
            "An algebraic number is a complex number algebraic over Q.",
            "The degree deg(alpha,F) is the degree of the minimal polynomial of alpha over F.",
        ],
        "theorems": [
            block("Minimal polynomial uniqueness", "An algebraic element has a unique monic irreducible polynomial over F that generates the kernel of evaluation.", "The kernel is a principal ideal in F[x]; choosing the monic generator makes it unique."),
            block("Degree equals basis length", "If deg(alpha,F)=n, then F(alpha) has F-basis 1,alpha,...,alpha^{n-1}.", "Reduce by the minimal polynomial and use uniqueness of remainders."),
        ],
        "examples": [
            block("Transcendental examples", "The numbers pi and e are transcendental over Q, though proving this is outside the section.", use="They contrast with algebraic radicals such as sqrt2."),
        ],
        "exercises": [
            block("Degree", "Find deg(i,R) and deg(i,Q).", "Over R it is 2 via x^2+1; over Q it is also 2."),
        ],
    },
    30: {
        "theorems": [
            block("Vector space zero laws", "In a vector space, 0v=0, a0=0, and (-a)v=-(av).", "The proof mirrors ring zero laws using additive cancellation."),
            block("Finite-dimensional space has finite basis", "Every finite-dimensional vector space has a finite basis.", "Start from a finite spanning set and remove dependent vectors."),
        ],
        "examples": [
            block("Extension as vector space", "Every extension field E of F is a vector space over F by using field multiplication as scalar multiplication.", use="This is why field degree is a dimension."),
        ],
        "exercises": [
            block("Zero scalar", "Prove 0v=0 in a vector space.", "Use (0+0)v=0v+0v and cancel."),
        ],
    },
    31: {
        "theorems": [
            block("Algebraic closure exists", "Every field has an algebraic closure: an algebraic extension that is algebraically closed.", "The proof uses a maximality argument; keep the statement as a structural endpoint."),
            block("Fundamental theorem of algebra", "The field C of complex numbers is algebraically closed.", "The usual proof is analytic; algebraically, the key consequence is that every complex polynomial splits into linear factors."),
            block("No proper algebraic extension of algebraically closed field", "If F is algebraically closed, then it has no proper algebraic extension.", "An algebraic element over F has a minimal polynomial, which must be linear over an algebraically closed field."),
        ],
        "examples": [
            block("C versus R", "C is algebraically closed, while R is not because x^2+1 has no root in R.", use="This is the shortest contrast between algebraically closed and not."),
        ],
        "exercises": [
            block("Algebraically closed consequence", "If F is algebraically closed and alpha is algebraic over F, prove alpha in F.", "The minimal polynomial of alpha over F is linear."),
        ],
    },
    32: {
        "theorems": [
            block("Constructible iff quadratic tower", "A real algebraic number is constructible only if it lies in a field obtained from Q by finitely many quadratic extensions; conversely elements built by such field operations and square roots are constructible.", "Line and circle intersections solve equations of degree at most two over the previous coordinate field."),
            block("Regular polygon criterion", "A regular n-gon is constructible exactly when cos(2*pi/n) is constructible; the full classification leads to Fermat-prime conditions.", "Constructing the central angle and constructing the polygon are equivalent tasks."),
        ],
        "examples": [
            block("Regular polygons", "Regular 3-, 4-, 5-, 6-, 8-, 10-, 12-, 15-, 16-, 17-, 20-, and 30-gons fit the constructible pattern discussed in the exercises.", use="Polygon questions are constructibility questions for angles."),
        ],
        "exercises": [
            block("Regular 9-gon", "Use the cubic obstruction behind Theorem 32.11 to show the regular 9-gon is not constructible.", "Relate it to trisecting a 120-degree angle or to the degree of the relevant cosine."),
            block("Regular 10-gon", "Show a regular 10-gon is constructible.", "Use that a regular 5-gon is constructible and bisect the central angle."),
        ],
    },
}


for section in SECTIONS:
    extra = EXTRA.get(section["no"], {})
    for key, values in extra.items():
        section[key].extend(values)


def p(text: str) -> str:
    return "".join(f"<p>{render_inline(part)}</p>" for part in text.split("\n\n") if part.strip())


def li(items: list[str]) -> str:
    return "<ul>" + "".join(f"<li>{render_inline(item)}</li>" for item in items) + "</ul>"


MATH_REPLACEMENTS = {
    "G x X -> X": r"G\times X\to X",
    "e x = x": r"e x=x",
    "(gh)x = g(hx)": r"(gh)x=g(hx)",
    "Gx = {gx | g in G}": r"Gx=\{gx\mid g\in G\}",
    "G_x = {g in G | gx = x}": r"G_x=\{g\in G\mid gx=x\}",
    "f:X->Y": r"f:X\to Y",
    "f(gx)=g f(x)": r"f(gx)=g f(x)",
    "f(gx)=g f(x).": r"f(gx)=g f(x)",
    "G/G_x": r"G/G_x",
    "G/G_{x0}": r"G/G_{x_0}",
    "|Gx|=[G:G_x]=|G|/|G_x|": r"|Gx|=[G:G_x]=|G|/|G_x|",
    "G_y = g G_x g^{-1}": r"G_y=gG_xg^{-1}",
    "g^{-1}": r"g^{-1}",
    "x~y": r"x\sim y",
    "y=gx": r"y=gx",
    "gG_x": r"gG_x",
    "gx=kx": r"gx=kx",
    "k^{-1}g in G_x": r"k^{-1}g\in G_x",
    "Fix(g) = {x in X | gx=x}": r"\operatorname{Fix}(g)=\{x\in X\mid gx=x\}",
    "(1/|G|) sum_{g in G} |Fix(g)|": r"\frac{1}{|G|}\sum_{g\in G}|\operatorname{Fix}(g)|",
    "S={(g,x):gx=x}": r"S=\{(g,x)\mid gx=x\}",
    "g*x=gxg^{-1}": r"g*x=gxg^{-1}",
    "f(gxg^{-1})": r"f(gxg^{-1})",
    "g f(x) g^{-1}": r"g f(x)g^{-1}",
    "|G| = |Z(G)| + sum [G:C_G(a_i)]": r"|G|=|Z(G)|+\sum_i [G:C_G(a_i)]",
    "C_G(x)": r"C_G(x)",
    "Z(G)": r"Z(G)",
    "c^{gcd(n,k)}": r"c^{\gcd(n,k)}",
    "Z_n": r"\mathbb Z_n",
    "Z_p": r"\mathbb Z_p",
    "Z_2": r"\mathbb Z_2",
    "Z_3": r"\mathbb Z_3",
    "Z_5": r"\mathbb Z_5",
    "Z_6": r"\mathbb Z_6",
    "Z_9": r"\mathbb Z_9",
    "Z_12": r"\mathbb Z_{12}",
    "Z_15": r"\mathbb Z_{15}",
    "Z_18": r"\mathbb Z_{18}",
    "Z_24": r"\mathbb Z_{24}",
    "Z/nZ": r"\mathbb Z/n\mathbb Z",
    "Z/pZ": r"\mathbb Z/p\mathbb Z",
    "Z_{rs}": r"\mathbb Z_{rs}",
    "Z_r x Z_s": r"\mathbb Z_r\times\mathbb Z_s",
    "Z_3 x Z_5": r"\mathbb Z_3\times\mathbb Z_5",
    "Z x Z": r"\mathbb Z\times\mathbb Z",
    "Z x {0}": r"\mathbb Z\times\{0\}",
    "2Z": r"2\mathbb Z",
    "nZ": r"n\mathbb Z",
    "pZ": r"p\mathbb Z",
    "R[x]": r"R[x]",
    "F[x]": r"F[x]",
    "Q[x]": r"\mathbb Q[x]",
    "Z[x]": r"\mathbb Z[x]",
    "Z_2[x]": r"\mathbb Z_2[x]",
    "Z_5[x]": r"\mathbb Z_5[x]",
    "F[x,y]": r"F[x,y]",
    "F[x_1,...,x_n]": r"F[x_1,\ldots,x_n]",
    "F[x_1,...,x_n]": r"F[x_1,\ldots,x_n]",
    "F[x]/(p)": r"F[x]/(p)",
    "F[x]/(p(x))": r"F[x]/(p(x))",
    "F[x]/(x-a)": r"F[x]/(x-a)",
    "F[x]/(f)": r"F[x]/(f)",
    "R[x]/(x^2+1)": r"\mathbb R[x]/(x^2+1)",
    "Q(sqrt2)": r"\mathbb Q(\sqrt2)",
    "Q(sqrt2,sqrt3)": r"\mathbb Q(\sqrt2,\sqrt3)",
    "Q(cuberoot2)": r"\mathbb Q(\sqrt[3]{2})",
    "Q(pi)": r"\mathbb Q(\pi)",
    "F(alpha)": r"F(\alpha)",
    "Q(alpha)": r"\mathbb Q(\alpha)",
    "[Q(alpha):Q]": r"[\mathbb Q(\alpha):\mathbb Q]",
    "F(alpha,beta)": r"F(\alpha,\beta)",
    "F[alpha]": r"F[\alpha]",
    "F <= E": r"F\le E",
    "F <= K <= E": r"F\le K\le E",
    "[E:F]=[E:K][K:F]": r"[E:F]=[E:K][K:F]",
    "[E:F]": r"[E:F]",
    "[E:K]": r"[E:K]",
    "[K:F]": r"[K:F]",
    "[Q(sqrt2):Q]=2": r"[\mathbb Q(\sqrt2):\mathbb Q]=2",
    "[C:R]=2": r"[\mathbb C:\mathbb R]=2",
    "1,alpha,...,alpha^{n-1}": r"1,\alpha,\ldots,\alpha^{n-1}",
    "1, a, a^2, ..., a^{n-1}": r"1,a,a^2,\ldots,a^{n-1}",
    "c0+c1 alpha+...+c_{n-1} alpha^{n-1}": r"c_0+c_1\alpha+\cdots+c_{n-1}\alpha^{n-1}",
    "a/b": r"a/b",
    "a/b + c/d = (ad+bc)/bd": r"\frac ab+\frac cd=\frac{ad+bc}{bd}",
    "(a/b)(c/d)=ac/bd": r"\left(\frac ab\right)\left(\frac cd\right)=\frac{ac}{bd}",
    "(a,b) ~ (c,d)": r"(a,b)\sim(c,d)",
    "ad=bc": r"ad=bc",
    "a -> a/1": r"a\mapsto a/1",
    "a/b |-> f(a)f(b)^{-1}": r"a/b\mapsto f(a)f(b)^{-1}",
    "f |-> f(alpha)": r"f\mapsto f(\alpha)",
    "phi_alpha:F[x]->E": r"\varphi_\alpha:F[x]\to E",
    "phi_2:Q[x]->Q": r"\varphi_2:\mathbb Q[x]\to\mathbb Q",
    "f(a)=0": r"f(a)=0",
    "x-a": r"x-a",
    "x^2+1": r"x^2+1",
    "x^2-2": r"x^2-2",
    "x^2-2x+1": r"x^2-2x+1",
    "x^2-3": r"x^2-3",
    "x^3-2": r"x^3-2",
    "x^4-1": r"x^4-1",
    "x^5+6x+3": r"x^5+6x+3",
    "x^4+10x^2+5": r"x^4+10x^2+5",
    "2x^3-3x+6": r"2x^3-3x+6",
    "a^{p-1}=1 mod p": r"a^{p-1}\equiv1\pmod p",
    "a^{phi(n)}=1 mod n": r"a^{\varphi(n)}\equiv1\pmod n",
    "ax=b mod m": r"ax\equiv b\pmod m",
    "gcd(a,n)=1": r"\gcd(a,n)=1",
    "d=gcd(a,m)": r"d=\gcd(a,m)",
    "U(n)": r"U(n)",
    "phi(n)": r"\varphi(n)",
    "7^100 mod 12": r"7^{100}\bmod 12",
    "3^100 mod 10": r"3^{100}\bmod 10",
    "14x=21 mod 35": r"14x\equiv21\pmod{35}",
    "6x=5 mod 14": r"6x\equiv5\pmod{14}",
    "6x=9 mod 15": r"6x\equiv9\pmod{15}",
    "2x=3 mod 5": r"2x\equiv3\pmod5",
    "M_n(R)": r"M_n(R)",
    "M_2(F)": r"M_2(F)",
    "End(A)": r"\operatorname{End}(A)",
    "End(Z_n)": r"\operatorname{End}(\mathbb Z_n)",
    "(ab)^{-1}=b^{-1}a^{-1}": r"(ab)^{-1}=b^{-1}a^{-1}",
    "(abc)^{-1}=c^{-1}b^{-1}a^{-1}": r"(abc)^{-1}=c^{-1}b^{-1}a^{-1}",
    "ij=k=-ji": r"ij=k=-ji",
    "i^2=j^2=k^2=-1": r"i^2=j^2=k^2=-1",
    "(i+j)^2": r"(i+j)^2",
    "a<b": r"a<b",
    "b-a in P": r"b-a\in P",
    "P_S=phi[P_R]": r"P_S=\varphi(P_R)",
    "R/N": r"R/N",
    "Ker(phi)": r"\ker\varphi",
    "Ker(phi)={r in R | phi(r)=0}": r"\ker\varphi=\{r\in R\mid\varphi(r)=0\}",
    "R/Ker(phi)": r"R/\ker\varphi",
    "R->R'": r"R\to R'",
    "pi:R->R/N": r"\pi:R\to R/N",
    "pi(r)=r+N": r"\pi(r)=r+N",
    "(a+N)(b+N)=ab+N": r"(a+N)(b+N)=ab+N",
    "(a+H)(b+H)=ab+H": r"(a+H)(b+H)=ab+H",
    "V(S)": r"V(S)",
    "LT(f)": r"\operatorname{LT}(f)",
    "S-polynomial": r"S\text{-polynomial}",
    "x_1,...,x_n": r"x_1,\ldots,x_n",
    "2x+y=2": r"2x+y=2",
    "sqrt(alpha)": r"\sqrt\alpha",
    "alpha and beta": r"\alpha\text{ and }\beta",
    "alpha is constructible": r"\alpha\text{ is constructible}",
    "alpha lies": r"\alpha\text{ lies}",
    "over Q": r"\text{over }\mathbb Q",
    "alpha/beta": r"\alpha/\beta",
    "alpha beta": r"\alpha\beta",
    "alpha+beta": r"\alpha+\beta",
    "alpha-beta": r"\alpha-\beta",
    "alpha>0": r"\alpha>0",
    "beta != 0": r"\beta\ne0",
    "sqrt2": r"\sqrt2",
    "sqrt3": r"\sqrt3",
    "sqrt(1+sqrt2)": r"\sqrt{1+\sqrt2}",
    "cuberoot2": r"\sqrt[3]{2}",
    "cos(2*pi/n)": r"\cos(2\pi/n)",
    "cos 20": r"\cos20^\circ",
}


def render_inline(text: str) -> str:
    rendered = escape(text)
    protected: list[str] = []

    def protect(html_fragment: str, tex: str) -> None:
        nonlocal rendered
        token = f"@@MATH{len(protected)}@@"
        protected.append(f"\\({tex}\\)")
        rendered = rendered.replace(escape(html_fragment), token)

    for raw, tex in sorted(MATH_REPLACEMENTS.items(), key=lambda pair: len(pair[0]), reverse=True):
        protect(raw, tex)

    for i, tex in enumerate(protected):
        rendered = rendered.replace(f"@@MATH{i}@@", tex)
    return rendered


def item(kind: str, entry: dict[str, str]) -> str:
    bits = [f'<article class="item kind-{kind}">', f"<h3>{escape(entry['title'])}</h3>"]
    bits.append(f'<span class="formula">{render_inline(entry["statement"])}</span>')
    if entry.get("proof"):
        bits.append(f"<p><b>Proof spine.</b> {render_inline(entry['proof'])}</p>")
    if entry.get("use"):
        bits.append(f"<p><b>Use.</b> {render_inline(entry['use'])}</p>")
    bits.append("</article>")
    return "\n".join(bits)


def fold(label: str, kind: str, entries: list[dict[str, str]]) -> str:
    return "\n".join([
        '<details class="fold" open>',
        f"<summary>{escape(label)} <span>{len(entries)}</span></summary>",
        '<div class="fold-body">',
        "\n".join(item(kind, entry) for entry in entries),
        "</div>",
        "</details>",
    ])


def section_grid(current: int) -> str:
    links = []
    for s in SECTIONS:
        no = s["no"]
        current_attr = ' aria-current="page"' if no == current else ""
        links.append(f'<a href="{no}.html"{current_attr}>{no}. {escape(s["title"])}</a>')
    return '<div class="chapter-grid">' + "\n".join(links) + "</div>"


def page(section: dict) -> str:
    no = section["no"]
    ix = [s["no"] for s in SECTIONS].index(no)
    prev_link = f'{SECTIONS[ix - 1]["no"]}.html' if ix else "../index.html"
    next_link = f'{SECTIONS[ix + 1]["no"]}.html' if ix + 1 < len(SECTIONS) else "../index.html"
    prev_label = f'Prev {SECTIONS[ix - 1]["no"]}' if ix else "Overview"
    next_label = f'Next {SECTIONS[ix + 1]["no"]}' if ix + 1 < len(SECTIONS) else "Overview"
    definitions = [
        '<details class="fold" open>',
        f'<summary>Definitions <span>{len(section["definitions"])}</span></summary>',
        '<div class="fold-body">',
        '<article class="item">',
        li(section["definitions"]),
        "</article>",
        "</div>",
        "</details>",
    ]
    proofs = [
        '<details class="fold">',
        f'<summary>Proof Patterns <span>{len(section["proof_patterns"])}</span></summary>',
        '<div class="fold-body">',
        '<article class="item kind-proof">',
        li(section["proof_patterns"]),
        "</article>",
        "</div>",
        "</details>",
    ]
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Section {no}: {escape(section["title"])}</title>
  <link rel="stylesheet" href="../assets/detail.css" />
  <script>
    window.MathJax = {{
      tex: {{ inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] }},
      svg: {{ fontCache: 'global' }}
    }};
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <a class="button" href="../index.html">Overview</a>
      <nav aria-label="section pager">
        <a class="mini-link" href="{prev_link}">{escape(prev_label)}</a>
        <a class="mini-link" href="{next_link}">{escape(next_label)}</a>
      </nav>
    </div>

    <header>
      <div>
        <p class="eyebrow">Fraleigh 7th Section {no}</p>
        <h1>{escape(section["title"])}</h1>
        <p class="lead">{escape(section["mission"])}</p>
      </div>
      <aside class="meta">
        <span><b>Read first</b><br />{escape(section["read_first"])}</span>
        <span><b>Folded blocks</b><br />definitions, theorems, propositions, examples, exercises</span>
      </aside>
    </header>

    <section class="quick" aria-label="chapter map">
      <article class="card">
        <h2>Goal</h2>
        <p>{escape(section["mission"])}</p>
      </article>
      <article class="card">
        <h2>Exam posture</h2>
        <p>{escape(section["read_first"])}</p>
      </article>
      <article class="card">
        <h2>Neighbor chapters</h2>
        <p><a href="{prev_link}">{escape(prev_label)}</a> / <a href="{next_link}">{escape(next_label)}</a></p>
      </article>
    </section>

    {"".join(definitions)}
    {fold("Theorems", "theorem", section["theorems"])}
    {fold("Propositions", "proposition", section["propositions"])}
    {fold("Examples", "example", section["examples"])}
    {fold("Exercises", "exercise", section["exercises"])}
    {"".join(proofs)}

    <section class="card">
      <h2>All sections</h2>
      {section_grid(no)}
    </section>

    <footer>
      <p>This page is a study reconstruction based on the provided chapter range. The statements are paraphrased for exam preparation rather than copied from the source text.</p>
    </footer>
  </div>
</body>
</html>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for section in SECTIONS:
        (OUT / f"{section['no']}.html").write_text(page(section), encoding="utf-8")
    print(f"built {len(SECTIONS)} section pages in {OUT}")


if __name__ == "__main__":
    main()
