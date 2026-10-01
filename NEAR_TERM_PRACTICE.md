# Original diagnostic-first practice for Oct 3

This is original practice for choosing a model before calculating. It is not an IMC or SHL replica, prediction, readiness certificate, or live assessment. The supplied invitation describes two parts in about 35 minutes; their exact components remain unknown. Use official invitation instructions for the actual assessment.

## First pass: diagnose (about 20 minutes, optional)

Try the ten tasks without notes. Write the base/denominator or feasible set before the answer. Mark **unsure** rather than invent an assumption. Record confidence and elapsed time; accuracy and valid reasoning come before speed. Keep answers hidden until the first pass is complete. These tasks use cases and parameters separate from the extension bank. If you have already seen a bank item elsewhere, treat it as exposed even if the app cannot observe that exposure.

1. This week’s service data:

   | Group | Requests | Completed | Cost/request |
   |---|---:|---:|---:|
   | North live | 240 | 180 | 4 |
   | South live | 60 | 24 | 9 |
   | Pilot (excluded) | 100 | 90 | 2 |

   What percentage of **live** requests completed? State the denominator and why an equal mean of group rates is inappropriate.
2. Two paid segments have later counts 132 and 168. Their changes from their own earlier counts are +10% and −20%, respectively. A trial segment has 50 later units. Reconstruct the total **earlier paid** count.
3. A price rises 25% and becomes 200. It then falls 20%. Find the original and final prices. Explain why the two percentage bases differ.
4. Schedule A, B, C, D, E once each, with A before B before C, and D before E. Count all feasible orders and those with B before D. Is B before D must, could but need not, or impossible? Provide a witness and, if relevant, a counterexample.
5. Now schedule A, B, C, D, E once each, requiring A **immediately** before B, C before D, and E before A. Classify A before D. Do not keep an order that violates adjacency.
6. A bag contains six red and four blue tokens. Draw two uniformly without replacement. Find P(two reds) and P(second red | first red). Then compare the joint probability for independent uniform draws **with** replacement.
7. Only P(A)=.55 and P(B)=.65 are known. Is exact P(A and B) determined? Find its smallest and largest possible values. Then bound P(A | B).
8. A table contains 12 successes and 18 failures in Group A; 18 successes and 52 failures outside A. Choose one record uniformly. Find P(success | A) and P(A and success). Explain why the whole-table success rate cannot replace the conditional rate.
9. A fair coin game pays 8 on heads and −2 on tails, before an entry fee of 3. What is expected **net** payoff? Can the net payoff of one play equal its expectation?
10. X is equally likely to be 0 or 4. Find its mean and population variance, then Var(3X+7). State the units and the role of the shift.

## Repair the observed gap (about 15–25 minutes)

Check the solutions below. Route by the work you actually wrote:

- Wrong relevant rows/denominator: work through **Weighted rates from tables**. Rebuild numerator and denominator from counts; transfer to unequal-length throughput intervals.
- Wrong percentage base/reversal: **Percentage bases in tables** after successive returns. Write later = earlier × factor separately for each segment.
- One witness mistaken for must, or dropped rule: **Constraint orders: must and could** after exhaustive cases. List feasible orders first and then statement witnesses.
- Unjustified independence/wrong second draw: **Choose a probability method** after conditional and independent events. Contrast the two sampling mechanisms and the marginals-only case.
- EV or variance gap: use their existing foundation units; the new decision units do not teach full distributions, covariance or multistep expectation.

A hint, revealed solution or guided answer is assisted practice. After repair, use a structurally different question in the extension without hints and explain the model in your own words. Do not count a remembered answer as novel evidence. If the finite bank has been exposed, use retrieval practice and the labelled delayed reassessment path; do not manufacture a new score. Stop when tired rather than convert uncertainty into rushed guesses.

## Solutions (open after diagnosis)

1. Live denominator 300; completed 204; 68%. North and South have different request counts, so their 75% and 40% rates cannot receive equal weights. Cost and pilot are irrelevant.
2. 132/1.1 = 120 and 168/.8 = 210; earlier paid total 330. Exclude trial. Dividing the later aggregate by an average percentage change uses the wrong model.
3. Original 200/1.25 = 160; final 200×.8 = 160. The rise used 160 as its base; the fall used 200.
4. Feasible: ABCDE, ABDCE, ABDEC, ADBCE, ADBEC, ADEBC, DABCE, DABEC, DAEBC, DEABC (10). B before D holds in ABCDE, ABDCE, ABDEC (3): could but need not. ABCDE is a witness; DEABC is a counterexample.
5. Feasible: CDEAB, CEABD, CEDAB, EABCD, ECABD, ECDAB (6). A before D holds in CEABD, EABCD, ECABD (3): could but need not. CEABD is a witness; CDEAB is a counterexample. EACBD violates the immediate rule.
6. Second red given first = 5/9; joint without replacement = (6/10)(5/9) = 1/3. Independent replacement joint = (6/10)² = 9/25.
7. Exact joint is undetermined. Joint bounds .2 to .55; conditional bounds .2/.65 = 4/13 to .55/.65 = 11/13. Independence would give .3575, one possible joint value; it is not supplied.
8. Conditional success = 12/30 = .4; joint = 12/100 = .12. P(A)=.3, so .3×.4=.12. Whole-table success .3 differs from the conditional .4.
9. Expected gross payoff (8−2)/2=3; expected net = 0. Actual net is 5 or −5, never 0 in one play. Expectation is a weighted mean, not a guaranteed result.
10. Mean 2; variance ((0−2)²+(4−2)²)/2=4 squared units. Var(3X+7)=9×4=36 squared units; adding 7 does not change dispersion.
