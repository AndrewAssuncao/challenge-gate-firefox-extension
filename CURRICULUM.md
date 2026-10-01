# Quant curriculum — implemented foundation

This is a foundation curriculum, not a complete quant interview syllabus. The retained Typing and Git modes remain separate. Advanced statistics, algorithms, stochastic processes and realistic market making are future units. Options appear in a coding unit after P&L and expected value and in the separate simulated Trading & Options Arcade track.

## Learning contract

Each skill has a diagnostic, local explanation and worked example, explicit common-error contrast, guided practice with hints, an independent check, a structurally different transfer family, repair after error, and spaced review. Numerical swaps do not count as a transfer family. Readiness is a transparent heuristic: at least five recent unassisted assessments of distinct items (first exposure or qualifying delayed reassessment), at least four correct, across two lesson IDs, plus valid independent evidence from multiple families including transfer. New method-selection units additionally require every specified method/classification. Transfer qualification is evaluated from durable, non-invalidated evidence rather than only the last five answers; recent accuracy remains a separate condition. Retention additionally requires successful delayed retrieval at least seven days after initial independent evidence. No mastery is inferred from exposure, hints, model claims or prerequisite relationships.

If every local item has been seen, the learner can use an explicit independent reassessment at least seven days after its last attempt or exposure. A reassessment replaces the evidence for that same item; it does not create an additional distinct item or a novel pass. The same four-of-five accuracy rule across five distinct items, two lesson IDs and both families still applies. Recovery through known items is labelled **practiced (reassessed)** and may satisfy prerequisites, while novel checks and known-item reassessments are counted separately. Immediate repetitions and assisted reassessments cannot qualify. The UI gives the earliest reassessment date; further exposure restarts the interval for that item.

The gate is a bounded micro-lesson or retrieval check; Arcade continues saved lessons. Probability and coding are not graded by speed. Arithmetic elapsed time is recorded as fluency evidence, separately from readiness. Cross-track prerequisites trigger their own diagnostic/practice and are never auto-credited.

## arith-percent: Percentages

- Mode / track: math / arithmetic
- Prerequisites: none
- Objective: Calculate and invert a percentage of a stated base.
- Explanation: A percentage is a fraction of 100. Multiply the base by p / 100. Percentage changes depend on their starting base.
- Worked example: 10% of 80 is 8; 15% is 8 + 4 = 12.
- Common error: Using the final amount as the original percentage base.
- Foundation example: What is 20% of 80?
- Transfer example: A price rises by 20% and is now 48. What was its original price?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## arith-fraction: Fractions and ratios

- Mode / track: math / arithmetic
- Prerequisites: arith-percent
- Objective: Translate among fractions, percentages and part-to-whole ratios.
- Explanation: A fraction is division. To convert a fraction to a percentage, divide its numerator by its denominator and multiply by 100.
- Worked example: 3 / 8 = 0.375 = 37.5%.
- Common error: Confusing a part-to-part ratio with a part-to-whole fraction.
- Foundation example: Express 4 / 20 as a percentage. Enter the number without %.
- Transfer example: A fund has cash and equities in the ratio 2:3. Of a total 200, how much is cash?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## arith-return: Successive returns

- Mode / track: math / arithmetic
- Prerequisites: arith-fraction
- Objective: Compound growth factors and solve a recovery-return problem.
- Explanation: Returns compound by multiplying growth factors. A rise and an equal percentage fall do not cancel because the second change uses a different base.
- Worked example: 100 rising 10% becomes 110; falling 10% then leaves 99.
- Common error: Adding percentage changes that use different bases.
- Foundation example: A portfolio starts at 100, rises 4%, then falls 4%. What is its final value?
- Transfer example: After losing 20%, what percentage gain restores the original value? Enter the number without %.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-complement: Complements

- Mode / track: math / probability
- Prerequisites: none
- Objective: Use an exhaustive partition to find a missing probability.
- Explanation: An event and its complement partition all outcomes. Their probabilities sum to 1.
- Worked example: If a failure has probability 0.2, success has probability 0.8.
- Common error: Subtracting from 100 when the answer is expressed as a probability.
- Foundation example: Failure probability is 4/20. What is success probability? Enter a decimal or fraction.
- Transfer example: Probabilities of three mutually exclusive exhaustive outcomes are 4/40, 1/2, and p. What is p?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-conditional: Conditional probability

- Mode / track: math / probability
- Prerequisites: prob-complement
- Objective: Construct the conditioned sample space and its denominator.
- Explanation: Conditioning changes the set of possible outcomes. Count favorable outcomes within the condition, then divide by the size of that condition.
- Worked example: Among 20 selected cases, 5 succeed. The conditional success probability is 5 / 20 = 0.25.
- Common error: Keeping the unconditional denominator.
- Foundation example: Of 16 days when a signal fired, 7 had a positive return. What fraction of signal days had a positive return?
- Transfer example: A fair 10-sided die numbered 1 through 10 is rolled. Given that the result is even, what is the probability it exceeds 2?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-independent: Independent events

- Mode / track: math / probability
- Prerequisites: prob-conditional
- Objective: Multiply only under independence and use complements for repeated trials.
- Explanation: Independence means one event does not change the probability of the other. Only under that assumption may joint probability be computed by multiplying marginal probabilities.
- Worked example: Two independent successes with probabilities 0.5 and 0.2 occur together with probability 0.1.
- Common error: Multiplying dependent events without a condition.
- Foundation example: Two independent events have probabilities 1/2 and 4/20. What is the probability that both occur?
- Transfer example: An independent trial succeeds with probability 1/2. What is the probability of at least one success in 4 trials?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-bayes: Base rates and Bayes

- Mode / track: math / probability
- Prerequisites: prob-independent
- Objective: Include base rates and false positives when reversing a condition.
- Explanation: A positive signal can come from a true event or a false alarm. Use base rates to count both sources before conditioning on a positive signal.
- Worked example: Among 100 cases, 10 are true. A signal catches 8 true cases and flags 9 false cases. Given a signal, probability of truth is 8/17, not 80%.
- Common error: Ignoring false positives or base rates.
- Foundation example: 4 true events and 6 false alarms produce a signal. Given a signal, what is the probability of a true event?
- Transfer example: A condition has prevalence 10%. A test flags 80% of affected people and 10% of unaffected people. What is P(condition | flagged)?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-ev: Expected value

- Mode / track: math / probability
- Prerequisites: prob-conditional
- Objective: Compute expected net payoff and derive a fair entry fee.
- Explanation: Expected value is the probability-weighted average of outcomes. It describes a long-run average, not a guaranteed individual result.
- Worked example: A fair coin pays 6 on heads and -2 on tails: EV = 0.5 × 6 + 0.5 × (-2) = 2.
- Common error: Treating expected value as a guaranteed outcome or forgetting the entry cost.
- Foundation example: A fair coin game pays 12 on heads and loses 4 on tails. What is expected net payoff?
- Transfer example: A fair coin game pays 12 on heads and 4 on tails. What entry fee makes expected net profit zero?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-variance: Dispersion and variance

- Mode / track: math / probability
- Prerequisites: prob-ev
- Objective: Compute dispersion and variance under scaling and translation.
- Explanation: Variance is expected squared deviation from the mean. It measures dispersion in squared units; it does not measure the direction of the mean.
- Worked example: An equal chance of 1 or 5 has mean 3 and variance ((1-3)^2 + (5-3)^2)/2 = 4.
- Common error: Confusing a change in mean with a change in dispersion.
- Foundation example: An equal chance of 1 or 7 has what variance?
- Transfer example: X has variance 4. Define Y = 4 × X + 7. What is the variance of Y?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-cases: Exhaustive cases

- Mode / track: brainteasers / reasoning
- Prerequisites: none
- Objective: Count disjoint exhaustive cases without double counting.
- Explanation: Split outcomes into disjoint cases that cover every possibility. Add counts across disjoint cases; multiply within independent choices.
- Worked example: A two-digit code starts with 1 or 2. If it starts with 1 the last digit has 3 choices; if 2 it has 4. There are 3 + 4 = 7 codes.
- Common error: Counting the overlap twice.
- Foundation example: A shop offers 4 red designs and 6 blue designs, all distinct. How many ways can you choose one design?
- Transfer example: A code has two digits from 1 to 4. Repetition is allowed. How many codes have at least one digit equal to 1?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-pigeon: Worst-case guarantees

- Mode / track: brainteasers / reasoning
- Prerequisites: none
- Objective: Construct a worst case and identify the first guaranteed repetition.
- Explanation: A guarantee must hold for the least favorable arrangement. Find how long that arrangement can avoid the target, then add one.
- Worked example: With three sock colors, three draws could all differ. Four draws guarantee a matching color.
- Common error: Giving a possible result instead of a worst-case guarantee.
- Foundation example: A drawer has unlimited socks in 4 colors. Drawing without looking, how many socks guarantee two of the same color?
- Transfer example: For 4 colors, how many draws guarantee THREE socks of one color? Unlimited socks of each color are available.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-balance: Information from comparisons

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-pigeon
- Objective: Evaluate an information bound and the size of a balanced first split; recognize the stated strategy.
- Explanation: A balance comparison has three outcomes: left heavy, right heavy, equal. With a known heavier odd coin, balanced groups can divide the remaining candidates into three sets.
- Worked example: Among 9 coins with one known heavier, weigh 3 against 3. Each outcome leaves 3 candidates; a second weighing identifies the coin.
- Common error: Stating a bound without an achievable comparison strategy.
- Foundation example: Among 28 identical-looking coins, exactly one is heavier. Using a balance scale, what is the minimum number of weighings needed in the worst case?
- Transfer example: A balance gives three outcomes per weighing. With 4 weighings, at most how many candidate positions can be distinguished for a coin known to be heavier?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-invariant: Residue invariants

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-balance
- Objective: Identify a preserved residue to rule out an unreachable state.
- Explanation: An invariant is a property an allowed operation cannot change. Removing a fixed number k preserves the remainder modulo k; parity is the special case k = 2.
- Worked example: Starting with 11 tokens and removing pairs can leave 1 token, but never 0.
- Common error: Tracking examples without identifying what the operation preserves.
- Foundation example: Start with 8 tokens and remove exactly 2 each time. What is the smallest possible remainder?
- Transfer example: Start with 22 tokens and remove exactly 5 each time. What is the smallest possible remainder?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-symmetry: Symmetry

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-cases
- Objective: Count favorable relative orders justified by relabeling symmetry.
- Explanation: If equally likely outcomes are unchanged by relabeling, symmetric events have equal probabilities. Check the sampling assumption before using symmetry.
- Worked example: In a uniformly shuffled deck of 4 distinct cards, each card is equally likely to be first, with probability 1/4.
- Common error: Assuming symmetry when sampling is not uniform.
- Foundation example: Uniformly shuffle 6 distinct cards. What is the probability that card A is first?
- Transfer example: Uniformly shuffle 6 distinct cards including A, B and C. What is the probability that both A and B appear before C?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-bounds: Bounds and construction

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-cases
- Objective: Check a capacity lower bound and counts in a stated attaining allocation.
- Explanation: First prove a lower bound, then show a construction that attains it. A lower bound alone is not a solution.
- Worked example: To seat 13 people at tables holding at most 4, at least ceil(13/4) = 4 tables are needed. Groups of 4,4,4,1 attain that bound.
- Common error: Giving a lower bound without an attaining construction.
- Foundation example: 19 people need seats at tables holding at most 4 people. What is the minimum number of tables?
- Transfer example: 19 indivisible tasks must be assigned to 4 workers. What is the smallest achievable maximum workload?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-conditioning: Condition on the first step

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-cases, prob-conditional
- Objective: Combine first-step branches with their correct weights.
- Explanation: A multistep experiment becomes simpler after conditioning on the first result. Weight each branch by its probability and add.
- Worked example: Choose a fair coin: one branch pays 4, the other pays 10. Expected payoff is (4 + 10)/2 = 7.
- Common error: Averaging branches without their probabilities.
- Foundation example: Pick bag A or B with equal probability. A always pays 4; B pays 12. What is the expected payoff?
- Transfer example: Pick bag A with probability 1/4, otherwise bag B. A always pays 16; B pays 8. What is the expected payoff?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## code-pnl: Position P&L

- Mode / track: python / coding
- Prerequisites: none
- Objective: Implement signed P&L and rearrange it to solve for an exit price.
- Explanation: For a signed position, P&L equals quantity × (exit price - entry price). A negative quantity represents a short position.
- Worked example: A position of -3 entered at 12 and exited at 10 earns (-3) × (10 - 12) = 6. Python: return quantity * (exit_price - entry_price).
- Common error: Losing the sign of a short position.
- Foundation example: Write pnl(quantity, entry_price, exit_price). Return signed position profit. Inputs are integers.
- Transfer example: Return the exit price needed for target_pnl. Quantity is nonzero and signed. Round to 6 decimals.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## code-ev: Weighted expected value

- Mode / track: python / coding
- Prerequisites: code-pnl, prob-ev
- Objective: Aggregate weighted outcomes and subtract a fixed fee.
- Explanation: Expected value sums each outcome multiplied by its probability. Keep outcomes and probabilities paired; probabilities sum to 1.
- Worked example: For outcomes [2, 8] and probabilities [0.75, 0.25], EV = 3.5. Python pairs values with zip(outcomes, probabilities).
- Common error: Pairing weights with the wrong outcomes.
- Foundation example: Return the weighted expected value, rounded to 6 decimal places. Inputs are equal-length nonempty lists; probabilities sum to 1.
- Transfer example: Return expected net payoff after paying a fixed entry fee, rounded to 6 decimals.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## code-simulation: Simulation estimates

- Mode / track: python / coding
- Prerequisites: code-ev, prob-independent
- Objective: Estimate single and joint events from reproducible simulated draws.
- Explanation: A Monte Carlo estimate averages an indicator over simulated draws. It approximates a probability; changing the sample can change the estimate. Fixed supplied draws make tests reproducible.
- Worked example: For draws [0.1, 0.6, 0.8, 0.3], the fraction below 0.5 is 2/4 = 0.5. Python: sum(x < threshold for x in draws) / len(draws).
- Common error: Using a strict threshold as an inclusive threshold or confusing a sample estimate with an exact probability.
- Foundation example: Return the fraction of supplied simulated draws strictly below threshold. Round to 6 decimals. Draws is nonempty.
- Transfer example: Each draw is a pair of simulated values. Return the fraction where BOTH are below threshold, rounded to 6 decimals. Draws is nonempty.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## code-variance: Variance

- Mode / track: python / coding
- Prerequisites: code-ev, prob-variance
- Objective: Implement population variance and exploit shift invariance.
- Explanation: Population variance is the average squared distance from the mean. Squaring prevents positive and negative deviations from cancelling.
- Worked example: For [1, 3], the mean is 2 and variance is ((1-2)^2 + (3-2)^2)/2 = 1. Use ** 2 for a square in Python.
- Common error: Dividing by n - 1 when population variance is requested.
- Foundation example: Return the population variance of a nonempty list, rounded to 6 decimal places.
- Transfer example: Add shift to every value, then return population variance rounded to 6 decimals. Can you avoid allocating a new list?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## code-call: Option payoff and profit

- Mode / track: python / coding
- Prerequisites: code-pnl, prob-ev
- Objective: Separate expiry payoff from profit and compose a call spread.
- Explanation: At expiry a long call pays max(spot - strike, 0). Profit subtracts the premium paid. These are expiry values, not a pricing model.
- Worked example: Spot 115, strike 100, premium 6: payoff 15, profit 9. At spot 90, profit is -6.
- Common error: Confusing payoff with profit or forgetting the short leg.
- Foundation example: Return the expiry profit of one long call per unit, subtracting its premium. Inputs are integers.
- Transfer example: Return expiry profit of a long call at low_strike and a short call at high_strike, after subtracting net premium. low_strike < high_strike.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## Teaching adaptations

Amos Blomqvist’s Learn configuration informed diagnostic probing, explicit prerequisite connections, a motivated worked example, per-concept checking, and a separate “I don’t know” signal. The extension implements these as persisted steps rather than relying on a model to remember the teaching procedure. See ATTRIBUTION.md.

## Trading & Options — implemented Arcade foundation

Open Dashboard → Arcade → Trading & Options. These five units use the same saved evidence, teaching flow, prerequisite selection, and explicit known-item reassessment policy. They are an applied Quant Math track, not a sixth browsing gate. Missing arithmetic or probability prerequisites route to their own lessons without granting credit. All quotes, chains and scenarios are simulated; no account, order execution or market feed is connected.

Every item states units, its multiplier, fees and modelling assumptions. Multipliers vary across 10, 50 and 100 where applicable; the two-state dealer example explicitly uses one unit. Each check combines a final numerical answer, an intermediate calculation and a supporting reasoning choice. Transfer families reverse the transaction side, use puts rather than calls, condition on sales rather than buys, or apply negative spot/IV shocks.

## market-contracts: Read an option chain

- Prerequisites: arith-fraction
- Objective: Read the option type, strike, expiry, quote side and explicit contract multiplier.
- Explanation: A call grants a right to buy; a put grants a right to sell at its strike under the contract terms. A chain groups contracts by expiry and strike. Premium quotes are per underlying unit; multiply by the stated contract multiplier and number of contracts. A buyer crosses to the ask and a seller to the bid under our immediate-fill assumption.
- Worked example: SIMULATED: a put row shows strike 95, expiry 2030-06-21, bid 1.8 / ask 2.0, multiplier 10. Buying 3 contracts costs 2.0 × 10 × 3 = 60 before fees. The strike 95 is not the option premium.
- Common error: Confusing strike with premium, using the midpoint as a guaranteed fill, or assuming every multiplier is 100.
- Teaching/checks: diagnostic, explanation, guided practice, independent check, distinct transfer family, repair and spaced review.

## market-execution: Execution and transaction costs

- Prerequisites: market-contracts, arith-percent
- Objective: Calculate signed opening and closing cash flows with bid/ask and per-contract fees.
- Explanation: Buying costs ask × multiplier × quantity plus fees. Selling receives bid × multiplier × quantity minus fees. Round-trip profit is cash received minus cash paid, regardless of which happens first. Our simulated fills assume sufficient size and no slippage beyond the stated spread; a real quote is not a fill guarantee.
- Worked example: SIMULATED: bid 3 / ask 3.2, multiplier 10, 2 contracts, fee 0.5 per contract per side. Buy outflow = 65; unchanged-quote sale proceeds = 59; profit = -6. Midpoint 3.1 does not remove the spread.
- Common error: Using the same quote side twice, forgetting one set of fees, or multiplying per-contract fees by the underlying multiplier.
- Teaching/checks: diagnostic, explanation, guided practice, independent check, distinct transfer family, repair and spaced review.

## market-options: Expiry payoff versus profit

- Prerequisites: market-execution
- Objective: Separate moneyness, expiry payoff, net profit and fee-adjusted breakeven for long calls and puts.
- Explanation: At expiry a call pays max(spot − strike, 0) per unit; a put pays max(strike − spot, 0). Multiply payoff by the stated multiplier and quantity, then subtract opening premium and fee. In the money means positive intrinsic value, not necessarily profit. We assume cash-equivalent expiry payoff, no additional settlement fee, and no early exercise, financing or dividends.
- Worked example: SIMULATED long call: strike 50, premium 3, multiplier 10, one contract, opening fee 1. At expiry spot 52, payoff is 20 but initial cost is 31: net profit -11 despite being in the money. Breakeven is 50 + 3 + 1/10 = 53.1.
- Common error: Reporting intrinsic value as net profit or treating in-the-money as profitable.
- Teaching/checks: diagnostic, explanation, guided practice, independent check, distinct transfer family, repair and spaced review.

## market-quote: Conditional value and quoting

- Prerequisites: market-execution, prob-ev, prob-bayes
- Objective: Condition on customer action and compare conditional value with the correct side of a quote.
- Explanation: A customer action may convey information. First weight each value state by both its prior and the probability of that action, then normalize. A dealer selling receives price minus conditional value; a dealer buying receives conditional value minus price. The model is a one-unit, two-state simulation with no fees, inventory costs or other customers.
- Worked example: SIMULATED: values 60 or 40, equal priors. A customer buys with probability .75 in the high state and .25 in the low state. Given a buy, high-state probability is .75 and conditional value is 55. Selling at 53 has expected profit -2, even though 53 exceeds the unconditional mean 50.
- Common error: Using the unconditional mean after observing an informative action or reversing dealer buy/sell profit.
- Teaching/checks: diagnostic, explanation, guided practice, independent check, distinct transfer family, repair and spaced review.

## market-greeks: Greek scenario approximation

- Prerequisites: market-options, prob-ev
- Objective: Apply initial delta/gamma/theta/vega with consistent units and scale to the contract position.
- Explanation: For a small scenario, approximate per-unit change as delta × spot change + 0.5 × gamma × spot change² + theta × elapsed days + vega × IV percentage-point change. Greeks are local rates, not constants valid for all scenarios. Use the quoted units: 20% to 23% is 3 volatility points. The result is an approximation, not a tradable quote or full pricing model.
- Worked example: SIMULATED: initial value 2, delta .4, gamma .02, theta -.01/day, vega .08 per volatility point. Spot +1, IV +2 points, one day: change .4 + .01 − .01 + .16 = .56, approximate value 2.56. One contract with multiplier 10 changes by 5.6.
- Common error: Dropping the gamma half-factor, treating 3 volatility points as .03, changing the theta sign, or calling the approximation an executable price.
- Teaching/checks: diagnostic, explanation, guided practice, independent check, distinct transfer family, repair and spaced review.

### Checked scenarios and limits

The executable tests check the supplied round trip (-42.60 profit; opening outflow 841.30), long-call expiry (99 profit at 108; -101 at 106; breakeven 107.01), conditional selling (106 value, -4 profit at price 102), and initial-Greek approximation (5.38 per-unit value, 276 position change). Generated variants are checked against independent arithmetic oracles and incorrect sign, unit, fee, threshold and conditioning answers.

This is an introductory applied slice, not a trading simulator or a comprehensive options course. Early exercise, settlement mechanics, volatility surfaces, portfolio risk, live execution and realistic inventory management are outside its scope. A Greek approximation is not a guaranteed executable price.

Definitions were checked against official OIC references: [Options Basics](https://www.optionseducation.org/optionsoverview/options-basics), [Options Pricing](https://www.optionseducation.org/optionsoverview/options-pricing), [Understanding Options Greeks](https://www.optionseducation.org/advancedconcepts/understanding-options-greeks), [Gamma](https://www.optionseducation.org/advancedconcepts/gamma), and [Vega](https://www.optionseducation.org/advancedconcepts/vega). Lesson wording and scenarios are original; no OIC content is copied wholesale.

## Decision-first slice (four additional foundation units)

The implemented bank now contains **25 foundation units and 5 introductory applied units**. A practiced marker is evidence on a bounded local bank, not broad interview readiness. The probability-method and ordering units require independent evidence from every named method/classification plus structurally changed transfer; merely passing five variants of one case cannot qualify them. Existing canonical item identities and lifetime evidence remain unchanged. Optional method tags on new events implement this coverage rule without migrating saved learners.

| Unit | Explicit prerequisites | Foundation check | Independent transfer |
|---|---|---|---|
| Weighted rates from tables (`data-weighted`) | Fractions and ratios | Relevant live rows; total successes / total requests | Unequal interval durations; rate × time and overall throughput |
| Percentage bases in tables (`data-base`) | Weighted rates; successive returns | Aggregate paid unit change using earlier counts | Reconstruct each earlier segment using its own growth factor before adding |
| Constraint orders (`brain-order`) | Exhaustive cases | Feasible schedules and statement witnesses with precedence | Immediate adjacency, non-adjacency and position/exclusion constraints |
| Choose a probability method (`prob-method`) | Independent events (and its conditional prerequisites) | Explicit independence, without replacement, or marginals-only joint bounds | Conditional count table, independent replacement, or marginals-only conditional bounds |

All four use a diagnostic before teaching, a different worked example, guided hints, unassisted checks, repair after error and existing finite-bank delayed reassessment. Each has 9 foundation and 9 transfer items. Numeric swaps within a family are finite practice items, not new concepts. Tables include multiple rows, relevant units and distractor data, with native captions and row/column headers; a chart is not required to retrieve their values. Probability bounds are attainable limits, never asserted exact probabilities. Method choice is graded alongside numeric and intermediate answers.

Feedback can describe an observed intermediate response (for example, a denominator that includes the excluded pilot, or the unchanged red fraction after removal). A wrong final number alone yields the solution and repair path without an invented misconception diagnosis. The feedback wording reports what the entered number equals; it cannot establish why the learner chose it.

### Objective alignment limits

The balance unit evaluates an information bound and size of the first balanced split, and recognizes a stated strategy. It does not ask the learner to produce a complete decision tree. Bounds/allocation checks validate capacity and intermediate counts in a stated construction; they do not assess a written general proof. Worst-case repetition asks for the avoiding count and guarantee threshold. The explanation may teach the broader principle while the objective states the actual assessed work. Full proof/tree production needs a separately designed response format and rubric.

### Separate near-term sequence

[NEAR_TERM_PRACTICE.md](NEAR_TERM_PRACTICE.md) provides ten original diagnostic tasks, worked solutions and repair routing. It is separate from saved evidence and makes no claim to match the unknown IMC/SHL components.

## Staged long-term quant gaps and decisions

This slice improves model selection; it does not close the larger quant syllabus. The following stages need teaching/assessment design before implementation. They are proposals, not unlocked or implied learned units.

1. **Counting and distributions:** factorials; permutations versus combinations; with/without replacement; binomial and hypergeometric conditions; geometric support and memorylessness; discrete versus continuous distributions and CDFs. Start from exhaustive cases, conditional probability and fractions. Require mechanism selection and counterexamples, not formula recognition alone.
2. **Expectation and dependence:** linearity without an independence assumption; indicator sums; random stopping/multistep expectations using first-step recursion; variance of sums including covariance; conditional expectation and total expectation. Current two-payoff EV and scaling variance checks do not cover these. Decide how much algebra and recurrence scaffolding to require and how to assess derivations honestly.
3. **Simulation uncertainty:** distinguish one sample estimate from the underlying probability, repeated estimates, Monte Carlo standard error, interval interpretation, sampling design and convergence. Existing supplied-draw coding checks test counting indicators, not uncertainty or statistical confidence. Establish distribution/variance prerequisites before claiming calibrated error bars.
4. **Code foundations and scaffolds:** explicit loop/list/function/conditional prerequisites, partial implementations, trace/debug tasks, then independent code synthesis and testing. Current starter signatures assume basic Python. Decide whether code prerequisites belong in the shared DAG and how assistance follows scaffolds, before adding a broad coding architecture.
5. **Longer independent production:** full argument/tree construction, larger tables/charts, multi-step modeling and transfer beyond a finite authored bank. Decide rubric, accessibility, response format and what evidence can justify progression. Do not upgrade practiced labels to interview-ready or generate cosmetic seed variants to simulate unlimited novelty.

No existing prerequisite was changed. New prerequisite edges attach four bounded units to the existing graph. Optional coverage metadata is confined to those new units; larger graph/rubric architecture and broad syllabus expansion remain product decisions.
