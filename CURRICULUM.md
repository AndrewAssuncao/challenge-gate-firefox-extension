# Quant curriculum — implemented foundation

This is a foundation curriculum, not a complete quant interview syllabus. The retained Typing and Git modes remain separate. Advanced statistics, algorithms, stochastic processes and realistic market making are future units. Options are an applied coding unit after P&L and expected value.

## Learning contract

Each skill has a diagnostic, local explanation and worked example, explicit common-error contrast, guided practice with hints, an independent check, a structurally different transfer family, repair after error, and spaced review. Numerical swaps do not count as a transfer family. Readiness is a transparent heuristic: at least five recent unassisted first-try assessments, at least four correct, across two sessions, plus valid independent evidence from both families including transfer. Transfer qualification is evaluated from durable, non-invalidated evidence rather than only the last five answers; recent accuracy remains a separate condition. Retention additionally requires successful delayed retrieval at least seven days after initial independent evidence. No mastery is inferred from exposure, hints, model claims or prerequisite relationships.

The gate is a bounded micro-lesson or retrieval check; Arcade continues saved lessons. Probability and coding are not graded by speed. Arithmetic elapsed time is recorded as fluency evidence, separately from readiness. Cross-track prerequisites trigger their own diagnostic/practice and are never auto-credited.

## arith-percent: Percentages

- Mode / track: math / arithmetic
- Prerequisites: none
- Objective: Calculate and invert a percentage of a stated base.
- Explanation: A percentage is a fraction of 100. Multiply the base by p / 100. Percentage changes depend on their starting base.
- Worked example: 10% of 80 is 8; 15% is 8 + 4 = 12.
- Common error: Using the final amount as the original percentage base.
- Foundation example: What is 20% of 80?
- Transfer example: A price rises by 20% and is now 60. What was its original price?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## arith-fraction: Fractions and ratios

- Mode / track: math / arithmetic
- Prerequisites: arith-percent
- Objective: Translate among fractions, percentages and part-to-whole ratios.
- Explanation: A fraction is division. To convert a fraction to a percentage, divide its numerator by its denominator and multiply by 100.
- Worked example: 3 / 8 = 0.375 = 37.5%.
- Common error: Confusing a part-to-part ratio with a part-to-whole fraction.
- Foundation example: Express 4 / 20 as a percentage. Enter the number without %.
- Transfer example: A fund has cash and equities in the ratio 2:3. Of a total 250, how much is cash?
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
- Objective: Use an exhaustive partition without confusing disjoint and independent events.
- Explanation: An event and its complement partition all outcomes. Their probabilities sum to 1.
- Worked example: If a failure has probability 0.2, success has probability 0.8.
- Common error: Subtracting from 100 when the answer is expressed as a probability.
- Foundation example: Failure probability is 4/20. What is success probability? Enter a decimal or fraction.
- Transfer example: Probabilities of three mutually exclusive exhaustive outcomes are 1/4, 1/2, and p. What is p?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-conditional: Conditional probability

- Mode / track: math / probability
- Prerequisites: prob-complement
- Objective: Construct the conditioned sample space and its denominator.
- Explanation: Conditioning changes the set of possible outcomes. Count favorable outcomes within the condition, then divide by the size of that condition.
- Worked example: Among 20 selected cases, 5 succeed. The conditional success probability is 5 / 20 = 0.25.
- Common error: Keeping the unconditional denominator.
- Foundation example: Of 16 days when a signal fired, 7 had a positive return. What fraction of signal days had a positive return?
- Transfer example: A fair six-sided die is rolled. Given that the result is even, what is the probability it exceeds 3?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-independent: Independent events

- Mode / track: math / probability
- Prerequisites: prob-conditional
- Objective: Multiply only under independence and use complements for repeated trials.
- Explanation: Independence means one event does not change the probability of the other. Only under that assumption may joint probability be computed by multiplying marginal probabilities.
- Worked example: Two independent successes with probabilities 0.5 and 0.2 occur together with probability 0.1.
- Common error: Multiplying dependent events without a condition.
- Foundation example: Two independent events have probabilities 1/2 and 1/4. What is the probability that both occur?
- Transfer example: An independent trial succeeds with probability 1/2. What is the probability of at least one success in 2 trials?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-bayes: Base rates and Bayes

- Mode / track: math / probability
- Prerequisites: prob-independent
- Objective: Include base rates and false positives when reversing a condition.
- Explanation: A positive signal can come from a true event or a false alarm. Use base rates to count both sources before conditioning on a positive signal.
- Worked example: Among 100 cases, 10 are true. A signal catches 8 true cases and flags 9 false cases. Given a signal, probability of truth is 8/17, not 80%.
- Common error: Ignoring false positives or base rates.
- Foundation example: 4 true events and 6 false alarms produce a signal. Given a signal, what is the probability of a true event?
- Transfer example: A condition affects 10 of 100 people. A test flags 8 of those 10 and 9 of the other 90. What is P(condition | flagged)?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-ev: Expected value

- Mode / track: math / probability
- Prerequisites: prob-conditional
- Objective: Compute expected net payoff and derive a fair entry fee.
- Explanation: Expected value is the probability-weighted average of outcomes. It describes a long-run average, not a guaranteed individual result.
- Worked example: A fair coin pays 6 on heads and -2 on tails: EV = 0.5 × 6 + 0.5 × (-2) = 2.
- Common error: Treating expected value as a guaranteed outcome or forgetting the entry cost.
- Foundation example: A fair coin game pays 12 on heads and loses 4 on tails. What is expected net payoff?
- Transfer example: A fair coin game pays 15 on heads and 5 on tails. What entry fee makes expected net profit zero?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## prob-variance: Dispersion and variance

- Mode / track: math / probability
- Prerequisites: prob-ev
- Objective: Compute dispersion and explain translation invariance.
- Explanation: Variance is expected squared deviation from the mean. It measures dispersion in squared units; it does not measure the direction of the mean.
- Worked example: An equal chance of 1 or 5 has mean 3 and variance ((1-3)^2 + (5-3)^2)/2 = 4.
- Common error: Confusing a change in mean with a change in dispersion.
- Foundation example: An equal chance of 2 or 6 has what variance?
- Transfer example: A random value has variance 5. Add 7 to every outcome. What is its new variance?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-cases: Exhaustive cases

- Mode / track: brainteasers / reasoning
- Prerequisites: none
- Objective: Count disjoint exhaustive cases without double counting.
- Explanation: Split outcomes into disjoint cases that cover every possibility. Add counts across disjoint cases; multiply within independent choices.
- Worked example: A two-digit code starts with 1 or 2. If it starts with 1 the last digit has 3 choices; if 2 it has 4. There are 3 + 4 = 7 codes.
- Common error: Counting the overlap twice.
- Foundation example: A shop offers 4 red designs and 6 blue designs, all distinct. How many ways can you choose one design?
- Transfer example: A code has two digits from 1 to 5. Repetition is allowed. How many codes have at least one digit equal to 1?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-pigeon: Worst-case guarantees

- Mode / track: brainteasers / reasoning
- Prerequisites: none
- Objective: Construct a worst case and identify the first guaranteed repetition.
- Explanation: A guarantee must hold for the least favorable arrangement. Find how long that arrangement can avoid the target, then add one.
- Worked example: With three sock colors, three draws could all differ. Four draws guarantee a matching color.
- Common error: Giving a possible result instead of a worst-case guarantee.
- Foundation example: A drawer has unlimited socks in 4 colors. Drawing without looking, how many socks guarantee two of the same color?
- Transfer example: For 5 colors, how many draws guarantee THREE socks of one color? Unlimited socks of each color are available.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-balance: Information from comparisons

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-pigeon
- Objective: Connect an information lower bound with a balanced construction.
- Explanation: A balance comparison has three outcomes: left heavy, right heavy, equal. With a known heavier odd coin, balanced groups can divide the remaining candidates into three sets.
- Worked example: Among 9 coins with one known heavier, weigh 3 against 3. Each outcome leaves 3 candidates; a second weighing identifies the coin.
- Common error: Stating a bound without an achievable comparison strategy.
- Foundation example: Among 81 identical-looking coins, exactly one is heavier. Using a balance scale, what is the minimum number of weighings needed in the worst case?
- Transfer example: A balance gives three outcomes per weighing. With 2 weighings, at most how many candidate positions can be distinguished for a coin known to be heavier?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-invariant: Parity invariants

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-balance
- Objective: Identify a preserved residue to rule out an unreachable state.
- Explanation: An invariant is a property an allowed operation cannot change. Removing two items preserves whether a count is odd or even.
- Worked example: Starting with 11 tokens and removing pairs can leave 1 token, but never 0.
- Common error: Tracking examples without identifying what the operation preserves.
- Foundation example: There are 9 tokens. You may only remove exactly two at a time. What is the smallest number of tokens that can remain?
- Transfer example: Start with 17 tokens and remove exactly 3 each time. What is the smallest possible remainder?
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-symmetry: Symmetry

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-cases
- Objective: Justify equal probabilities by a relabeling bijection.
- Explanation: If equally likely outcomes are unchanged by relabeling, symmetric events have equal probabilities. Check the sampling assumption before using symmetry.
- Worked example: In a uniformly shuffled deck of 4 distinct cards, each card is equally likely to be first, with probability 1/4.
- Common error: Assuming symmetry when sampling is not uniform.
- Foundation example: Uniformly shuffle 6 distinct cards. What is the probability that card A is first?
- Transfer example: Uniformly shuffle 7 distinct cards. What is the probability that card A appears before card B? Enter a decimal.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-bounds: Bounds and construction

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-cases
- Objective: Prove a lower bound and provide an attaining allocation.
- Explanation: First prove a lower bound, then show a construction that attains it. A lower bound alone is not a solution.
- Worked example: To seat 13 people at tables holding at most 4, at least ceil(13/4) = 4 tables are needed. Groups of 4,4,4,1 attain that bound.
- Common error: Giving a lower bound without an attaining construction.
- Foundation example: 17 people need seats at tables holding at most 4 people. What is the minimum number of tables?
- Transfer example: 21 tasks must be assigned to 5 workers. What is the smallest achievable maximum number of tasks assigned to any one worker? Tasks are indivisible.
- Repair: revisit the worked example, use a guided variation, then retry without hints.

## brain-conditioning: Condition on the first step

- Mode / track: brainteasers / reasoning
- Prerequisites: brain-cases, prob-conditional
- Objective: Combine first-step branches with their correct weights.
- Explanation: A multistep experiment becomes simpler after conditioning on the first result. Weight each branch by its probability and add.
- Worked example: Choose a fair coin: one branch pays 4, the other pays 10. Expected payoff is (4 + 10)/2 = 7.
- Common error: Averaging branches without their probabilities.
- Foundation example: Pick bag A or B with equal probability. A always pays 4; B pays 12. What is the expected payoff?
- Transfer example: Pick bag A with probability 1/4, otherwise bag B. A always pays 20; B pays 10. What is the expected payoff?
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

## Staged applied track: Trading & Options in Arcade

This is a dedicated longer-session curriculum slice, not a sixth browsing gate.
It is planned, not implemented in the current UI. Use clearly labeled simulated
quotes and option chains, with no orders, accounts, live feed or paid data.

1. **Read a quote and chain.** Prerequisites: percentages, expected value. Identify
   bid/ask, strike, expiry, call/put, premium units and contract multiplier; distinguish
   a quoted price from a guaranteed execution. Check both field reading and arithmetic.
2. **Moneyness and expiry outcomes.** Prerequisites: quote reading, P&L. Separate
   intrinsic value, payoff and net profit. Example: a call with strike 100, premium 4
   and expiry spot 107 has payoff 7 and profit 3 per underlying unit.
3. **Scenario quoting and adverse selection.** Prerequisites: conditioning, Bayes,
   expected value. Recompute value after observing an informed customer's action;
   compare spread income with conditional expected loss. Require a reasoning step.
4. **Greeks as local sensitivities.** Prerequisites: option payoff/profit and basic
   function/rate-of-change interpretation (to be taught explicitly). Compare small
   spot, time and volatility shocks under stated assumptions. Explain why delta is
   not a universal probability and why local approximations can fail.
5. **Integrated simulated session.** Read a chain, choose an explanatory scenario,
   calculate bounded outcomes, and justify a quote. Use a worked example, guided
   practice, unfamiliar transfer scenario and delayed retrieval; never award mastery
   merely for selecting a trade or reporting a profitable random outcome.

Before implementation, add checked local oracles and rubric tests for each step,
including bid/ask side, units, long/short signs, and payoff versus profit. This
slice should follow core stability and curriculum review rather than add a feed
or execution service.

### Applied acceptance scenarios supplied for the next slice

These are planned test fixtures, not live prices or implemented lessons:

- **Execution and units:** simulated call bid 4, ask 4.2, multiplier 100, buy two
  contracts and sell them at the unchanged quote, fee 0.65 per contract per side.
  Midpoint 4.1; opening outflow 841.30; closing proceeds 798.70; P&L -42.60.
  Midpoint and last are not guaranteed executable prices.
- **Moneyness versus profit:** long call strike 105, premium 2, multiplier 100,
  opening fee 1, expiry spot 108. Cost 201, payoff 300, profit 99, breakeven 107.01.
  At expiry spot 106 it is in the money but profit is -101.
- **Greek approximation:** initial value 4, delta 0.5, gamma 0.04, theta -0.03/day,
  vega 0.12 per volatility percentage point. Stock +2, volatility 20% to 23%,
  elapsed time two days. Approximate changes: 1 + 0.08 - 0.06 + 0.36 = 1.38;
  approximate new value 5.38. For two contracts with multiplier 100, value change
  is 276. This is an initial-Greek approximation, not an executable quote.

Every future item must carry its own multiplier, units, simulated-data label,
fees and assumptions. A multiplier of 100 is not universal. Reference review
should use official OIC contract/execution/Greek definitions and a checked pricing
oracle before these scenarios are turned into a release.
