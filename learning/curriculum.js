/* Original quant curriculum. See ATTRIBUTION.md for teaching-workflow inspiration. */
'use strict';
const QuantCurriculum = (() => {
  const skills = [
    ['arith-percent','math','arithmetic','Percentages',[], 'A percentage is a fraction of 100. Multiply the base by p / 100. Percentage changes depend on their starting base.', '10% of 80 is 8; 15% is 8 + 4 = 12.', ['Find 10% first.', 'Multiply the base by the percentage, then divide by 100.']],
    ['arith-fraction','math','arithmetic','Fractions and ratios',['arith-percent'], 'A fraction is division. To convert a fraction to a percentage, divide its numerator by its denominator and multiply by 100.', '3 / 8 = 0.375 = 37.5%.', ['Divide the numerator by the denominator.', 'Convert the decimal to a percentage by multiplying by 100.']],
    ['arith-return','math','arithmetic','Successive returns',['arith-fraction'], 'Returns compound by multiplying growth factors. A rise and an equal percentage fall do not cancel because the second change uses a different base.', '100 rising 10% becomes 110; falling 10% then leaves 99.', ['Turn each percentage into a growth factor.', 'Multiply the starting value by both factors.']],
    ['prob-complement','math','probability','Complements',[], 'An event and its complement partition all outcomes. Their probabilities sum to 1.', 'If a failure has probability 0.2, success has probability 0.8.', ['Success and failure exhaust the possibilities.', 'Subtract the given probability from 1.']],
    ['prob-conditional','math','probability','Conditional probability',['prob-complement'], 'Conditioning changes the set of possible outcomes. Count favorable outcomes within the condition, then divide by the size of that condition.', 'Among 20 selected cases, 5 succeed. The conditional success probability is 5 / 20 = 0.25.', ['Restrict the denominator to the conditioned group.', 'Divide the favorable count by that group size.']],
    ['prob-ev','math','probability','Expected value',['prob-conditional'], 'Expected value is the probability-weighted average of outcomes. It describes a long-run average, not a guaranteed individual result.', 'A fair coin pays 6 on heads and -2 on tails: EV = 0.5 × 6 + 0.5 × (-2) = 2.', ['Weight each payoff by its probability.', 'Add the weighted payoffs, including negative losses.']],
    ['brain-pigeon','brainteasers','reasoning','Worst-case guarantees',[], 'A guarantee must hold for the least favorable arrangement. Find how long that arrangement can avoid the target, then add one.', 'With three sock colors, three draws could all differ. Four draws guarantee a matching color.', ['Construct the longest sequence that avoids a match.', 'After every color has appeared once, the next draw must repeat one.']],
    ['brain-balance','brainteasers','reasoning','Information from comparisons',['brain-pigeon'], 'A balance comparison has three outcomes: left heavy, right heavy, equal. With a known heavier odd coin, balanced groups can divide the remaining candidates into three sets.', 'Among 9 coins with one known heavier, weigh 3 against 3. Each outcome leaves 3 candidates; a second weighing identifies the coin.', ['Each weighing can distinguish three outcomes.', 'Find the smallest k for which 3^k covers all candidates.']],
    ['brain-invariant','brainteasers','reasoning','Residue invariants',['brain-balance'], 'An invariant is a property an allowed operation cannot change. Removing a fixed number k preserves the remainder modulo k; parity is the special case k = 2.', 'Starting with 11 tokens and removing pairs can leave 1 token, but never 0.', ['Track parity rather than each possible sequence.', 'An odd count stays odd when you subtract an even count.']],
    ['brain-cases','brainteasers','reasoning','Exhaustive cases',[], 'Split outcomes into disjoint cases that cover every possibility. Add counts across disjoint cases; multiply within independent choices.', 'A two-digit code starts with 1 or 2. If it starts with 1 the last digit has 3 choices; if 2 it has 4. There are 3 + 4 = 7 codes.', ['List the disjoint cases.', 'Count within each case, then add; avoid double counting.']],
    ['brain-symmetry','brainteasers','reasoning','Symmetry',['brain-cases'], 'If equally likely outcomes are unchanged by relabeling, symmetric events have equal probabilities. Check the sampling assumption before using symmetry.', 'In a uniformly shuffled deck of 4 distinct cards, each card is equally likely to be first, with probability 1/4.', ['Which labels can be exchanged without changing the experiment?', 'Equal probabilities must sum to 1.']],
    ['brain-bounds','brainteasers','reasoning','Bounds and construction',['brain-cases'], 'First prove a lower bound, then show a construction that attains it. A lower bound alone is not a solution.', 'To seat 13 people at tables holding at most 4, at least ceil(13/4) = 4 tables are needed. Groups of 4,4,4,1 attain that bound.', ['Capacity gives a lower bound.', 'Round up total divided by capacity, then verify a feasible arrangement.']],
    ['brain-conditioning','brainteasers','reasoning','Condition on the first step',['brain-cases','prob-conditional'], 'A multistep experiment becomes simpler after conditioning on the first result. Weight each branch by its probability and add.', 'Choose a fair coin: one branch pays 4, the other pays 10. Expected payoff is (4 + 10)/2 = 7.', ['Draw the first-step branches.', 'Compute each branch result, weight it, then add.']],
    ['prob-independent','math','probability','Independent events',['prob-conditional'], 'Independence means one event does not change the probability of the other. Only under that assumption may joint probability be computed by multiplying marginal probabilities.', 'Two independent successes with probabilities 0.5 and 0.2 occur together with probability 0.1.', ['Check whether independence is explicitly given.', 'For independent events multiply their probabilities.']],
    ['prob-bayes','math','probability','Base rates and Bayes',['prob-independent'], 'A positive signal can come from a true event or a false alarm. Use base rates to count both sources before conditioning on a positive signal.', 'Among 100 cases, 10 are true. A signal catches 8 true cases and flags 9 false cases. Given a signal, probability of truth is 8/17, not 80%.', ['Count true-positive and false-positive cases.', 'Divide true positives by all positives.']],
    ['prob-variance','math','probability','Dispersion and variance',['prob-ev'], 'Variance is expected squared deviation from the mean. It measures dispersion in squared units; it does not measure the direction of the mean.', 'An equal chance of 1 or 5 has mean 3 and variance ((1-3)^2 + (5-3)^2)/2 = 4.', ['Find the mean first.', 'Average squared deviations, with probability weights.']],
    ['code-simulation','python','coding','Simulation estimates',['code-ev','prob-independent'], 'A Monte Carlo estimate averages an indicator over simulated draws. It approximates a probability; changing the sample can change the estimate. Fixed supplied draws make tests reproducible.', 'For draws [0.1, 0.6, 0.8, 0.3], the fraction below 0.5 is 2/4 = 0.5. Python: sum(x < threshold for x in draws) / len(draws).', ['Count draws satisfying the event.', 'Divide by the number of draws; round to 6 decimals.']],
    ['code-pnl','python','coding','Position P&L',[], 'For a signed position, P&L equals quantity × (exit price - entry price). A negative quantity represents a short position.', 'A position of -3 entered at 12 and exited at 10 earns (-3) × (10 - 12) = 6. Python: return quantity * (exit_price - entry_price).', ['Compute the price change first.', 'Multiply by the signed quantity.']],
    ['code-ev','python','coding','Weighted expected value',['code-pnl','prob-ev'], 'Expected value sums each outcome multiplied by its probability. Keep outcomes and probabilities paired; probabilities sum to 1.', 'For outcomes [2, 8] and probabilities [0.75, 0.25], EV = 3.5. Python pairs values with zip(outcomes, probabilities).', ['Use zip to pair outcomes and probabilities.', 'Sum value * probability for each pair; round to 6 decimals.']],
    ['code-variance','python','coding','Variance',['code-ev','prob-variance'], 'Population variance is the average squared distance from the mean. Squaring prevents positive and negative deviations from cancelling.', 'For [1, 3], the mean is 2 and variance is ((1-2)^2 + (3-2)^2)/2 = 1. Use ** 2 for a square in Python.', ['Compute the mean first.', 'Average squared deviations; divide by n, not n - 1.']],
    ['code-call','python','coding','Option payoff and profit',['code-pnl','prob-ev'], 'At expiry a long call pays max(spot - strike, 0). Profit subtracts the premium paid. These are expiry values, not a pricing model.', 'Spot 115, strike 100, premium 6: payoff 15, profit 9. At spot 90, profit is -6.', ['Separate payoff from profit.', 'Use max(spot - strike, 0) - premium.']]
  ].map(([id,mode,track,name,prerequisites,explanation,example,hints]) => ({id,mode,track,name,prerequisites,explanation,example,hints}));
  const Applied=typeof QuantApplied!=='undefined'?QuantApplied:require('./applied');
  skills.push(...Applied.skills);
  // Decision-first units stay within the existing number + reason + intermediate contract.
  const decisionSkills = [
    {id:'data-weighted',mode:'math',track:'arithmetic',name:'Weighted rates from tables',prerequisites:['arith-fraction'],
      objective:'Select relevant rows and combine counts or time-weighted rates with the correct denominator.',
      explanation:'Read the population, period and units before calculating. An overall success rate is total successes divided by total opportunities, not the unweighted mean of group percentages. For throughput, rate × hours gives work; divide total work by total hours. Exclude rows outside the requested population.',
      example:'Live groups: 80 successes / 100 requests and 10 / 20. Overall = 90/120 = 75%, not (80% + 50%)/2 = 65%. A pilot group outside the live population is excluded. For 2 hours at 12 jobs/hour and 4 hours at 6, throughput = (24+24)/6 = 8 jobs/hour.',
      commonError:'Averaging group rates equally despite unequal denominators, or including an excluded row.'},
    {id:'data-base',mode:'math',track:'arithmetic',name:'Percentage bases in tables',prerequisites:['data-weighted','arith-return'],
      objective:'Choose the relevant starting base for a percentage change and reconstruct earlier counts from different segment changes.',
      explanation:'Percentage change is (later − earlier) / earlier × 100. Aggregate the relevant counts before computing the aggregate change. When later counts and segment changes are supplied, divide each later count by its own growth factor before adding; different segment percentages cannot be averaged to invert the total.',
      example:'Paid segments change 100 → 120 and 200 → 180. Total change = (300−300)/300 = 0%, despite segment changes +20% and −10%. To reverse the changes: 120/1.2 + 180/.9 = 300. A trial segment and revenue column do not answer a question about paid unit counts.',
      commonError:'Using the final count as the change base, or applying one segment percentage to the combined total.'},
    {id:'brain-order',mode:'brainteasers',track:'reasoning',name:'Constraint orders: must and could',prerequisites:['brain-cases'],
      objective:'Count feasible orders and statement witnesses to distinguish must, could but need not, and impossible.',
      explanation:'Keep all rules active. A must statement holds in every feasible order; could but need not holds in at least one and fails in at least one; impossible holds in none. A witness proves possibility. To reject must, give a feasible counterexample. Enumeration must cover every order without duplicating one. An immediately-before rule also requires adjacency.',
      example:'A, B, C each appear once; A is before B. Feasible orders: ABC, ACB, CAB. A before B is must (3/3); A first is could but need not (2/3; CAB is a counterexample); B before A is impossible (0/3). This exercise checks counts and classification, not a written general proof.',
      commonError:'Treating one feasible witness as proof of must, or dropping an adjacency/exclusion rule.',
      requiredMethods:['must','could','impossible']},
    {id:'prob-method',mode:'math',track:'probability',name:'Choose a probability method',prerequisites:['prob-independent'],
      objective:'Choose independent or conditional multiplication, and identify when marginal rates leave a joint or conditional probability undetermined.',
      explanation:'Always P(A and B) = P(A) × P(B | A) when P(A)>0. Independence permits replacing P(B | A) with P(B); marginals alone do not. Drawing without replacement changes the second denominator and favorable count. If only marginals are known, max(0, P(A)+P(B)−1) ≤ P(A and B) ≤ min(P(A),P(B)). The overlap cannot exceed either event. Since the union has probability at most 1, the overlap is at least P(A)+P(B)−1 and cannot be negative. These bounds describe several possible dependencies, not one exact probability. Divide joint bounds by P(B)>0 to bound P(A | B), or by P(A)>0 to bound P(B | A).',
      example:'Bag: 3 red, 2 blue. Without replacement, two reds have probability (3/5)×(2/4)=3/10; with replacement and independent uniform draws, (3/5)²=9/25. With only P(A)=.6 and P(B)=.5, imagine 100 equally likely cases: 60 are in A and 50 in B. At least 10 must overlap to fit in 100, and at most all 50 B cases can overlap. Thus joint probability ranges .1 to .5: .3 is possible but is not determined.',
      commonError:'Multiplying marginals without independence, or claiming an exact probability from bounds.',
      requiredMethods:['independent','conditional','insufficient']}
  ];
  skills.push(...decisionSkills);
  const mod9=seed=>((seed%9)+9)%9;
  const fmt=n=>String(Number(n.toFixed(6)));
  const methodOptions=[
    {value:'independent',label:'Independence makes the second factor equal to its marginal probability.'},
    {value:'conditional',label:'The first event changes the counts or restricts the row; the conditional rate differs from its marginal.'},
    {value:'insufficient',label:'The exact probability is undetermined; only attainable bounds follow from the marginals.'}
  ];
  function orders(labels) {
    return labels.length?labels.flatMap((x,i)=>orders(labels.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];
  }
  function orderRule(order,rule) {
    const [type,a,b]=rule,ai=order.indexOf(a),bi=order.indexOf(b);
    if(type==='before')return ai<bi;
    if(type==='immediate')return ai+1===bi;
    if(type==='apart')return Math.abs(ai-bi)!==1;
    if(type==='first')return ai===0;
    if(type==='last')return ai===order.length-1;
    if(type==='notFirst')return ai!==0;
    throw Error('Unknown order rule');
  }
  function ruleText([type,a,b]) {
    return ({before:`${a} before ${b}`,immediate:`${a} immediately before ${b}`,apart:`${a} and ${b} are not adjacent`,first:`${a} first`,last:`${a} last`,notFirst:`${a} is not first`})[type];
  }
  function decisionQuestion(id,seed,level) {
    const s=get(id),v=mod9(seed),q={id:`${id}:${v}:${level?1:0}`,skillId:id,seed,kind:'number',transfer:!!level,tolerance:.00005,explanation:s.explanation,workedExample:s.example};
    const intermediate=(prompt,answer)=>q.construction={prompt,answer};
    const diagnose=(value,message)=>{if(Math.abs(value-q.construction.answer)>.00005)(q.feedbackRules ||= []).push({intermediate:value,message});};
    const reason=(correct,label,wrong)=>{q.correctReason=correct;q.reasonOptions=[{value:correct,label},{value:'unsupported',label:wrong}];};
    if(id==='data-weighted') {
      q.familyId=`${id}:${level?'time':'counts'}`;
      if(!level) {
        const a=200+100*v,b=50+10*v,sa=Math.round(a*(.7+.05*(v%3))),sb=Math.round(b*(.2+.1*(v%3))),pilot=40+10*v;
        q.table={caption:'Service requests this week. Each request belongs to one row.',headers:['Group','Status','Requests','Completed','Cost per request'],rows:[['North','Live',a,sa,4],['South','Live',b,sb,9],['West','Pilot',pilot,pilot,2]]};
        q.prompt='For the live groups only, what percentage of requests completed? Enter the percentage without %.';
        q.answer=100*(sa+sb)/(a+b);intermediate('How many live requests form the denominator?',a+b);
        q.scenario={type:'counts',a,b,sa,sb,pilot};
        q.solution=`Relevant totals: ${fmt(sa+sb)} completed / ${a+b} requests. Overall = ${fmt(q.answer)}%. Group percentages have different denominators; exclude the pilot.`;
        diagnose(a+b+pilot,`Your denominator includes the ${pilot} pilot requests. Restrict both totals to the two live rows.`);
        reason('counts','Add live completed counts and live request counts before dividing.','Average the two live percentages with equal weight.');
        q.hints=['Mark the two live rows; costs and the pilot do not answer the question.','Add completed counts and request counts separately, then divide and convert to %.'];
      } else {
        const hoursA=2+v%3,hoursB=5+v%2,rateA=12+2*v,rateB=4+v;
        q.table={caption:'Shift summary. Rates are constant within each interval; hours are worked hours.',headers:['Interval','Period','Hours worked','Jobs per hour','Break minutes'],rows:[['Morning','Current',hoursA,rateA,10],['Afternoon','Current',hoursB,rateB,20],['Morning','Previous',8,30,15]]};
        q.prompt='What was the overall throughput in jobs per hour across the current intervals?';
        const jobs=hoursA*rateA+hoursB*rateB;q.answer=jobs/(hoursA+hoursB);intermediate('How many jobs were completed across the current intervals?',jobs);
        q.scenario={type:'time',hoursA,hoursB,rateA,rateB};
        q.solution=`Jobs = ${hoursA}×${rateA} + ${hoursB}×${rateB} = ${jobs}. Hours = ${hoursA+hoursB}. Throughput = ${fmt(q.answer)} jobs/hour. Do not subtract breaks twice or average rates equally.`;
        diagnose(rateA+rateB,`Your intermediate is the sum of the two rates (${rateA}+${rateB}), in jobs/hour. Convert each rate to jobs by multiplying by its hours before adding.`);
        reason('time','Multiply each rate by its interval hours, then divide total jobs by total hours.','Treat each interval as one hour regardless of its duration.');
        q.hints=['The denominator is time, and rate × time gives jobs. Ignore the previous day.','Weight each rate by its listed hours; breaks have already been excluded.'];
      }
    } else if(id==='data-base') {
      q.familyId=`${id}:${level?'reverse-segments':'aggregate-change'}`;
      const a=100+20*v,b=80+20*v,trial=60+10*v;
      if(!level) {
        const changeA=(v%2?-1:1)*(20+5*v),changeB=(v%3===0?1:-1)*(10+v*2),laterA=a+changeA,laterB=b+changeB;
        q.table={caption:'Units shipped in two consecutive months. Paid segments are disjoint.',headers:['Segment','Type','Earlier units','Later units','Later revenue'],rows:[['A','Paid',a,laterA,500],['B','Paid',b,laterB,900],['C','Trial',trial,trial*2,0]]};
        q.prompt='For paid units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %.';
        q.answer=100*(changeA+changeB)/(a+b);intermediate('What starting unit count is the percentage base?',a+b);
        q.scenario={type:'aggregate',a,b,laterA,laterB,trial};
        q.solution=`Earlier paid base ${a+b}; later paid total ${laterA+laterB}. Change = (${laterA+laterB}−${a+b})/${a+b}×100 = ${fmt(q.answer)}%.`;
        diagnose(laterA+laterB,`Your base is the later paid total ${laterA+laterB}. Change from earlier to later uses the earlier total ${a+b}.`);
        diagnose(a+b+trial,`Your base includes ${trial} trial units. The requested population is paid units in both months.`);
        reason('base','Use earlier paid units as the base and combine paid counts first.','Divide the change by the later paid total.');
        q.hints=['Select paid rows and the unit columns for both months.','Subtract earlier from later; divide by earlier paid units, then multiply by 100.'];
      } else {
        const changeA=[20,-20,50][v%3],changeB=[-10,25,-50][v%3],laterA=a*(1+changeA/100),laterB=b*(1+changeB/100);
        q.table={caption:'Later month counts and each segment’s change from its own earlier count.',headers:['Segment','Type','Later units','Change from earlier (%)','Later revenue'],rows:[['A','Paid',laterA,changeA,600],['B','Paid',laterB,changeB,800],['C','Trial',trial,100,0]]};
        q.prompt='Reconstruct the total earlier paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.';
        q.answer=a+b;intermediate('How many earlier units were in Paid A?',a);
        q.scenario={type:'reverse',a,b,laterA,laterB,changeA,changeB};
        q.solution=`Earlier A = ${fmt(laterA)}/${fmt(1+changeA/100)} = ${a}; earlier B = ${fmt(laterB)}/${fmt(1+changeB/100)} = ${b}. Total earlier paid units = ${a+b}. Reverse each segment before adding.`;
        diagnose(laterA*(1-changeA/100),`Your intermediate equals ${fmt(laterA)} × ${fmt(1-changeA/100)}, using the later count as the percentage base. Undo the change by dividing ${fmt(laterA)} by ${fmt(1+changeA/100)}, using A’s earlier base.`);
        reason('reverse','Divide each segment’s later units by its own growth factor, then add.','Average the segment percentage changes and apply that factor to the combined later count.');
        q.hints=['Write later = earlier × (1 + change/100) for each paid segment.','Divide by each segment’s own factor. A negative change gives a factor below 1.'];
      }
    } else if(id==='brain-order') {
      const base=[
        [[['before','A','B'],['before','B','C']],['before','A','C']],
        [[['before','A','B'],['before','C','D']],['before','B','C']],
        [[['before','A','B'],['before','B','C']],['before','C','A']],
        [[['before','A','B'],['before','A','C']],['first','A']],
        [[['before','A','B'],['before','C','B']],['last','B']],
        [[['before','A','B'],['before','B','C'],['before','C','D']],['last','D']],
        [[['before','A','C'],['before','B','D']],['before','A','D']],
        [[['before','A','B'],['before','C','D']],['before','D','C']],
        [[['before','A','B'],['before','A','C'],['before','A','D']],['first','A']]
      ];
      const transfer=[
        [[['immediate','A','B'],['before','C','D']],['before','A','D']],
        [[['before','A','B'],['before','C','D'],['apart','B','C']],['before','B','C']],
        [[['immediate','A','B'],['before','C','D']],['immediate','B','A']],
        [[['before','A','B'],['first','C']],['before','C','A']],
        [[['before','A','B'],['notFirst','D']],['last','D']],
        [[['immediate','A','B'],['immediate','C','D']],['before','A','C']],
        [[['before','A','B'],['apart','C','D']],['before','C','D']],
        [[['before','A','B'],['first','D']],['before','B','D']],
        [[['immediate','A','B'],['before','C','A']],['before','C','B']]
      ];
      const [rules,claim]=(level?transfer:base)[v],valid=orders(['A','B','C','D']).filter(o=>rules.every(r=>orderRule(o,r))),witness=valid.filter(o=>orderRule(o,claim));
      const classification=!witness.length?'impossible':witness.length===valid.length?'must':'could';
      q.methodTag=classification;q.familyId=`${id}:${level?'transfer':'foundation'}:${classification}`;
      q.scenario={type:'orders',labels:['A','B','C','D'],rules,claim};
      q.prompt=`Schedule A, B, C, D once each in four slots. Rules: ${rules.map(ruleText).join('; ')}. Statement: ${ruleText(claim)}. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.`;
      q.answer=witness.length;intermediate('How many orders obey ALL the rules, before filtering by the statement?',valid.length);
      q.correctReason=classification;q.reasonOptions=[{value:'must',label:'Must: every feasible order satisfies it.'},{value:'could',label:'Could but need not: some feasible orders satisfy it and some do not.'},{value:'impossible',label:'Impossible: no feasible order satisfies it.'}];
      q.solution=`All feasible orders: ${valid.map(o=>o.join('')).join(', ')}. Statement holds in ${witness.length} of ${valid.length}: ${classification==='could'?'could but need not':classification}.${classification==='could'?` Witness ${witness[0].join('')}; counterexample ${valid.find(o=>!orderRule(o,claim)).join('')}.`:''}`;
      diagnose(24,'Your intermediate is 4! = 24 unrestricted orders. Filter by every rule before evaluating the statement.');
      const omitted=new Map();
      rules.forEach((rule,i)=>{const count=orders(['A','B','C','D']).filter(o=>rules.filter((_,j)=>j!==i).every(r=>orderRule(o,r))).length;if(count!==valid.length&&count!==24){const matches=omitted.get(count)||[];matches.push(`omitting ${ruleText(rule)}`);omitted.set(count,matches);}});
      rules.forEach((rule,i)=>{if(rule[0]==='immediate'){const relaxed=rules.map((r,j)=>j===i?['before',r[1],r[2]]:r),count=orders(['A','B','C','D']).filter(o=>relaxed.every(r=>orderRule(o,r))).length;if(count!==valid.length){const matches=omitted.get(count)||[];matches.push(`relaxing ${ruleText(rule)} to ${rule[1]} before ${rule[2]}`);omitted.set(count,matches);}}});
      for(const [count,clauses] of omitted)diagnose(count,`Your intermediate ${count} also counts orders allowed by these possible rule changes: ${clauses.join('; ')}. That number alone does not identify which rule you missed. Recheck all rules; ${valid.length} orders obey them all.`);
      q.hints=['Enumerate by first slot, removing any partial order that violates a rule. Keep adjacency rules active.','Count all feasible orders first, then statement witnesses: all means must, some but not all means could but need not, zero means impossible.'];
    } else if(id==='prob-method') {
      const type=v%3;let method;
      q.reasonOptions=methodOptions.map(o=>({...o}));
      if((!level&&type===0)||(level&&type===1)) {
        method='independent';const red=3+v,blue=[3,4,2][Math.floor(v/3)];
        if(level) {
          const p=red/(red+blue);q.prompt=`A bag has ${red} red and ${blue} blue tokens. Draw one token uniformly from the bag, replace it, and remix. On the second draw, choose uniformly from all ${red+blue} tokens in the restored bag. What is P(two reds)?`;
          q.answer=p*p;intermediate('What is P(second red | first red)?',p);q.scenario={type:'replacement',red,blue};
          q.solution=`Replacement restores the ${red+blue} tokens. The second uniform draw therefore has red probability ${red}/${red+blue} after either first color: the red events are independent. Joint = (${red}/${red+blue})² = ${fmt(q.answer)}.`;
          diagnose((red-1)/(red+blue-1),'Your conditional rate removes the first token. With replacement, both the red count and total return to their original values.');
        } else {
          const pA=(2+v)/10,pB=[.3,.5,.7][Math.floor(v/3)];q.prompt=`Events A and B are explicitly independent, with P(A)=${pA} and P(B)=${pB}. What is P(A and B)?`;
          q.answer=pA*pB;intermediate('What is P(B | A)?',pB);q.scenario={type:'independent',pA,pB};
          q.solution=`Independence gives P(B | A)=P(B)=${pB}. Joint = ${pA}×${pB} = ${fmt(q.answer)}.`;
          diagnose(pA,`Your conditional intermediate equals P(A)=${pA}. Independence leaves P(B | A) equal to the stated P(B)=${pB}.`);
        }
        q.hints=level?['After replacement and remixing, count the red and total tokens available on the second uniform draw. Does either count depend on the first color?','The second conditional rate equals the original red fraction; multiply it by the first red fraction.']:['Check the stated relationship between A and B.','Independence gives P(B | A)=P(B); use P(A) × P(B | A).'];
      } else if((!level&&type===1)||(level&&type===0)) {
        method='conditional';
        if(!level) {
          const red=3+v,blue=[3,4,2][Math.floor(v/3)],total=red+blue;q.prompt=`A bag has ${red} red and ${blue} blue tokens. Draw two uniformly without replacement. What is P(two reds)?`;
          q.answer=red/total*(red-1)/(total-1);intermediate('What is P(second red | first red)?',(red-1)/(total-1));q.scenario={type:'without',red,blue};
          q.solution=`First red ${red}/${total}; given that red, ${red-1} reds remain among ${total-1} tokens. Joint = ${red}/${total}×${red-1}/${total-1} = ${fmt(q.answer)}.`;
          diagnose(red/total,`Your second conditional rate is the original ${red}/${total}. After a red is removed, use ${red-1} remaining reds out of ${total-1} tokens.`);
        } else {
          const totalA=40+10*v,totalOther=60+10*v,successA=10+5*v,successOther=20+2*v;
          q.table={caption:'Disjoint observed groups. A is membership in Group A; B is a success.',headers:['Group','Successes','Failures'],rows:[['A',successA,totalA-successA],['Not A',successOther,totalOther-successOther]]};
          q.prompt='A record is selected uniformly from this table. What is P(A and B), meaning Group A AND success? ';
          q.answer=successA/(totalA+totalOther);intermediate('What is P(B | A)?',successA/totalA);q.scenario={type:'conditional-table',totalA,totalOther,successA,successOther};
          q.solution=`P(B | A)=${successA}/${totalA}; P(A)=${totalA}/${totalA+totalOther}. Joint = ${successA}/${totalA+totalOther} = ${fmt(q.answer)}. The conditional row, not the marginal success rate, controls the second factor.`;
          diagnose((successA+successOther)/(totalA+totalOther),`Your intermediate is the whole-table success rate. Conditioning on A restricts the denominator to ${totalA} Group A records and the numerator to ${successA} successes.`);
        }
        q.hints=['Condition on the first event: what denominator and favorable outcomes remain?','Use P(A) × P(B | A). Without replacement update both counts; a table condition restricts the row.'];
      } else {
        method='insufficient';const index=Math.floor(v/3),pa=(level?[.6,.7,.8]:[.2,.6,.8])[index],pb=(level?[.7,.5,.9]:[.5,.7,.4])[index],low=Math.max(0,pa+pb-1),high=Math.min(pa,pb);
        q.prompt=`P(A)=${pa} and P(B)=${pb} are supplied. No other relationship is specified. Find ${level?'P(A | B)':'P(A and B)'}.`;
        q.answer=level?high/pb:high;intermediate(`What is ${level?'P(A | B)':'P(B | A)'}?`,level?low/pb:low/pa);q.scenario={type:level?'conditional-bounds':'joint-bounds',pA:pa,pB:pb};
        q.solution=`Joint bounds: max(0,${pa}+${pb}−1)=${fmt(low)} to min(${pa},${pb})=${fmt(high)}.${level?` Divide both by P(B)=${pb}: conditional bounds ${fmt(low/pb)} to ${fmt(high/pb)}.`:` For the intermediate P(B | A), divide by P(A)=${pa}: smallest ${fmt(low/pa)}.`} Both extremes are attainable, so the exact probability is undetermined.`;
        diagnose(level?pa:pb,`Your lower-bound intermediate equals the independent conditional rate. Independence is not supplied. Use the attainable overlap bounds and divide by ${level?'P(B)':'P(A)'}.`);
        q.hints=['Several joint distributions have these marginals. Do not invent independence.',`Joint overlap is at least max(0, P(A)+P(B)−1) and at most min(P(A),P(B)). For the intermediate ${level?'P(A | B)':'P(B | A)'}, divide overlap bounds by the positive ${level?'P(B)':'P(A)'}.`];
      }
      q.correctReason=method;q.methodTag=method;q.familyId=`${id}:${level?'transfer':'foundation'}:${method}`;
    } else throw Error('Unknown decision skill');
    if(id==='prob-method'){q.prompt+=' If the requested probability is not uniquely determined, enter its largest possible value. Choose the justified method.';q.construction.prompt+=' If multiple values fit the stated facts, enter the smallest.';}
    if((id==='data-weighted'||id==='data-base')&&!level)q.prompt+=' Round the percentage itself (e.g. 12.345678% becomes 12.3457).';
    q.prompt+=' Enter exact fractions or numbers rounded to 4 decimal places.';
    // Rotate choices without changing the actual problem identity or answer key.
    if(v%2)q.reasonOptions.reverse();
    return q;
  }

  const get = id => skills.find(s => s.id === id);
  function buildQuestion(id, seed, harder = false, level = 0) {
    if(decisionSkills.some(s=>s.id===id))return decisionQuestion(id,seed,level);
    if(id.startsWith('market-'))return Applied.question(id,seed,harder,level);
    const s = get(id); if (!s) throw Error('Unknown skill');
    const n = (seed % 9) + 2 + (harder ? 5 : 0);
    const q = { id: `${id}:${seed % 9}:${harder ? 1 : 0}:${level}`, skillId:id, seed, transfer:level > 0, prompt:'', hints:s.hints, explanation:s.explanation, workedExample:s.example, tolerance:0.000001 };
    const numeric = (prompt,answer,solution) => Object.assign(q,{kind:'number',prompt,answer,solution});
    if(id==='brain-invariant') {
      const step=level?3+seed%3:2,residue=seed%step,start=n*step+residue;
      return numeric(`Start with ${start} tokens and remove exactly ${step} each time. What is the smallest possible remainder?`,residue,`Removal preserves the remainder modulo ${step}. ${start} = ${n} × ${step} + ${residue}; the minimum is ${residue}.`);
    }
    if(id==='brain-bounds') {
      const capacity=2+seed%4,remainder=level?1+seed%(n-1):1+seed%(capacity-1),total=n*capacity+remainder;
      return numeric(level?`${total} indivisible tasks must be assigned to ${n} workers. What is the smallest achievable maximum workload?`:`${total} people need seats at tables holding at most ${capacity} people. What is the minimum number of tables?`,level?capacity+1:n+1,level?`At most ${capacity} per worker gives insufficient total capacity ${n*capacity}. Assign ${capacity+1} to ${remainder} workers and ${capacity} to the rest.`:`${n} full tables hold ${n*capacity}; the remaining ${remainder} people need one more table. Minimum ${n+1}.`);
    }
    if(id==='brain-symmetry') {
      const task=seed%3;
      return numeric(level?`Uniformly shuffle ${n+2} distinct cards including A, B and C. What is the probability that ${['A appears before B','A appears before B, which appears before C','both A and B appear before C'][task]}?`:`Uniformly shuffle ${n+2} distinct cards. What is the probability that card A is first?`,level?[.5,1/6,1/3][task]:1/(n+2),level?['Relabeling A and B pairs the two equally likely relative orders: 1/2.','The three named cards have 6 equally likely relative orders; only ABC qualifies: 1/6.','Of 6 equally likely relative orders, ABC and BAC qualify: 2/6 = 1/3.'][task]:`All ${n+2} cards have the same chance of first: 1/${n+2}.`);
    }
    if(id==='prob-variance') {
      const distance=1+seed%3,scale=2+seed%3;
      return numeric(level?`X has variance ${n}. Define Y = ${scale} × X + 7. What is the variance of Y?`:`An equal chance of ${n-distance} or ${n+distance} has what variance?`,level?n*scale**2:distance**2,level?`Adding 7 does not change variance. Scaling by ${scale} multiplies squared deviations by ${scale**2}: ${n*scale**2}.`:`The mean is ${n}; both deviations have magnitude ${distance}. Variance = ${distance} squared = ${distance**2}.`);
    }
    if(level && !id.startsWith('code-')) {
      switch(id) {
        case 'arith-percent': return numeric(`A price rises by 20% and is now ${n*12}. What was its original price?`,n*10, `Divide the final price by 1.2: ${n*12}/1.2 = ${n*10}.`);
        case 'arith-fraction': return numeric(`A fund has cash and equities in the ratio 2:3. Of a total ${n*50}, how much is cash?`,n*20, `Cash is 2/(2+3) of the total: ${n*20}.`);
        case 'arith-return': return numeric(`After losing ${n*5}%, what percentage gain restores the original value? Enter the number without %.`,100*n*5/(100-n*5),`A value of 100 falls to ${100-n*5}. Regaining ${n*5} on that base requires ${100*n*5/(100-n*5)}%.`);
        case 'prob-complement': return numeric(`Probabilities of three mutually exclusive exhaustive outcomes are ${n}/40, 1/2, and p. What is p?`,.5-n/40,`The probabilities sum to 1: p = 1 - ${n}/40 - 1/2 = ${.5-n/40}.`);
        case 'prob-conditional': return numeric(`A fair ${2*(n+1)}-sided die numbered 1 through ${2*(n+1)} is rolled. Given that the result is even, what is the probability it exceeds 2?`,n/(n+1),`The conditioned set contains ${n+1} even values. Excluding 2 leaves ${n} favorable outcomes.`);
        case 'prob-ev': return numeric(`A fair coin game pays ${n*3} on heads and ${n} on tails. What entry fee makes expected net profit zero?`,n*2,`The fair fee is expected gross payoff: (${n*3}+${n})/2 = ${n*2}.`);
        case 'brain-pigeon': return numeric(`For ${n} colors, how many draws guarantee THREE socks of one color? Unlimited socks of each color are available.`,2*n+1,`At most two of each color avoids a triple: ${2*n} socks. One more forces a triple.`);
        case 'brain-balance': {const k=seed%3+2;return numeric(`A balance gives three outcomes per weighing. With ${k} weighings, at most how many candidate positions can be distinguished for a coin known to be heavier?`,3**k,`A decision tree has at most 3^${k} = ${3**k} leaves. Equal three-way partitions attain the bound.`);}
      }
    }
    switch(id) {
      case 'brain-cases': return numeric(level ? `A code has two digits from 1 to ${n}. Repetition is allowed. How many codes have at least one digit equal to 1?` : `A shop offers ${n} red designs and ${n+2} blue designs, all distinct. How many ways can you choose one design?`, level ? 2*n-1 : 2*n+2, level ? `First digit 1: ${n} codes. First digit not 1 but last digit 1: ${n-1}. Total ${2*n-1}.` : `The color cases are disjoint: ${n} + ${n+2} = ${2*n+2}.`);
      case 'brain-conditioning': return numeric(level ? `Pick bag A with probability 1/4, otherwise bag B. A always pays ${n*4}; B pays ${n*2}. What is the expected payoff?` : `Pick bag A or B with equal probability. A always pays ${n}; B pays ${n*3}. What is the expected payoff?`,level ? n*2.5 : n*2,level ? `0.25 × ${n*4} + 0.75 × ${n*2} = ${n*2.5}.` : `0.5 × ${n} + 0.5 × ${n*3} = ${n*2}.`);
      case 'prob-independent': return numeric(level ? `An independent trial succeeds with probability 1/2. What is the probability of at least one success in ${seed%3+2} trials?` : `Two independent events have probabilities 1/2 and ${n}/20. What is the probability that both occur?`,level ? 1-.5**(seed%3+2) : n/40,level ? `Use the complement of all failures: 1 - (1/2)^${seed%3+2}.` : `(1/2) × (${n}/20) = ${n}/40.`);
      case 'prob-bayes': return numeric(level ? `A condition has prevalence ${n+6}%. A test flags 80% of affected people and 10% of unaffected people. What is P(condition | flagged)?` : `${n} true events and ${n+2} false alarms produce a signal. Given a signal, what is the probability of a true event?`,level ? (8*(n+6))/(8*(n+6)+100-(n+6)) : n/(2*n+2),level ? `In 1000 people, ${10*(n+6)} are affected and ${1000-10*(n+6)} are unaffected. True positives = ${8*(n+6)}; false positives = ${100-(n+6)}. Conditional probability = ${8*(n+6)}/(${8*(n+6)}+${100-(n+6)}).` : `${n}/(${n}+${n+2}). Condition on all signals.`);
      case 'arith-percent': return numeric(`What is ${n * 5}% of ${40 + n * 10}?`, n*5*(40+n*10)/100, `(${n*5} / 100) × ${40+n*10} = ${n*5*(40+n*10)/100}.`);
      case 'arith-fraction': return numeric(`Express ${n} / 20 as a percentage. Enter the number without %.`, n*5, `${n} / 20 × 100 = ${n*5}%.`);
      case 'arith-return': return numeric(`A portfolio starts at 100, rises ${n}%, then falls ${n}%. What is its final value?`, (10000-n*n)/100, `100 × (1 + ${n}/100) × (1 - ${n}/100) = ${(10000-n*n)/100}.`);
      case 'prob-complement': return numeric(`Failure probability is ${n}/20. What is success probability? Enter a decimal or fraction.`, 1-n/20, `1 - ${n}/20 = ${(20-n)/20}.`);
      case 'prob-conditional': return numeric(`Of ${n*4} days when a signal fired, ${n+3} had a positive return. What fraction of signal days had a positive return?`, (n+3)/(n*4), `${n+3} / ${n*4}. The denominator includes only signal days.`);
      case 'prob-ev': return numeric(`A fair coin game pays ${n*3} on heads and loses ${n} on tails. What is expected net payoff?`,n, `0.5 × ${n*3} + 0.5 × (-${n}) = ${n}.`);
      case 'brain-pigeon': return numeric(`A drawer has unlimited socks in ${n} colors. Drawing without looking, how many socks guarantee two of the same color?`,n+1, `The first ${n} can have distinct colors. Draw ${n+1} must repeat a color.`);
      case 'brain-balance': { const k=seed%3+2, lower=3**(k-1)+1, coins=lower+Math.floor(seed/3)%3; q.id = `${id}:${coins}`; return numeric(`Among ${coins} identical-looking coins, exactly one is heavier. Using a balance scale, what is the minimum number of weighings needed in the worst case?`,k, `Each weighing has three outcomes. ${k-1} weighings distinguish at most ${3**(k-1)} candidates, fewer than ${coins}. Split into groups of ${Math.round(coins/3)}, ${Math.round(coins/3)}, and ${coins-2*Math.round(coins/3)}; each branch has at most ${3**(k-1)} candidates for the remaining ${k-1} weighings.`); }
    }
    const code = (name,args,prompt,tests,solution) => Object.assign(q,{kind:'code',functionName:name,starterCode:`def ${name}(${args}):\n    pass\n`,prompt,testCases:tests.map(([input,expected])=>({input,expected:String(expected), tolerance:0.000001})),solution,topic:id});
    if(level) {
      switch(id) {
        case 'code-pnl': return code('break_even_exit','quantity, entry_price, target_pnl','Return the exit price needed for target_pnl. Quantity is nonzero and signed. Round to 6 decimals.', [[`2, 100, ${n*2}`,100+n],['-2, 100, 10',95],['5, 20, 0',20]],'return round(entry_price + target_pnl / quantity, 6)');
        case 'code-ev': return code('net_value','outcomes, probabilities, fee','Return expected net payoff after paying a fixed entry fee, rounded to 6 decimals.',[[`[${n}, ${n+4}], [0.5, 0.5], 2`,n],['[-4, 8], [0.75, 0.25], 1',-2],['[5], [1], 5',0]],'return round(sum(x * p for x, p in zip(outcomes, probabilities)) - fee, 6)');
        case 'code-variance': return code('shifted_variance','values, shift','Add shift to every value, then return population variance rounded to 6 decimals. Can you avoid allocating a new list?',[[`[${n}, ${n+2}], 100`,1],['[5, 5, 5], -8',0],['[-2, 0, 2], 9',2.666667]],'mean = sum(values) / len(values)\nreturn round(sum((x - mean) ** 2 for x in values) / len(values), 6)');
        case 'code-call': return code('call_spread_profit','spot, low_strike, high_strike, net_premium','Return expiry profit of a long call at low_strike and a short call at high_strike, after subtracting net premium. low_strike < high_strike.',[[`${100+n}, 100, 110, 3`,Math.min(n,10)-3],['90, 100, 110, 3',-3],['105, 100, 110, 3',2],['115, 100, 110, 3',7]],'return max(spot - low_strike, 0) - max(spot - high_strike, 0) - net_premium');
        case 'code-simulation': return code('estimate_both','draws, threshold','Each draw is a pair of simulated values. Return the fraction where BOTH are below threshold, rounded to 6 decimals. Draws is nonempty.',[[`[(${n/20}, 0.2), (0.8, 0.1)], 0.5`,n<10?.5:0],['[(0.5, 0.1)], 0.5',0],['[(0.1, 0.5)], 0.5',0],['[(0.1, 0.8)], 0.5',0],['[(0.8, 0.1)], 0.5',0],['[(0.1, 0.1)], 0.5',1]],'return round(sum(a < threshold and b < threshold for a, b in draws) / len(draws), 6)');
      }
    }
    switch(id) {
      case 'code-simulation': return code('estimate_probability','draws, threshold','Return the fraction of supplied simulated draws strictly below threshold. Round to 6 decimals. Draws is nonempty.',[[`[${n/20}, 0.6, 0.8, 0.3], 0.5`,n<10?.5:.25],['[0.5], 0.5',0],['[0.1, 0.2, 0.3], 0.5',1]],'return round(sum(x < threshold for x in draws) / len(draws), 6)');
      case 'code-pnl': return code('pnl','quantity, entry_price, exit_price','Write pnl(quantity, entry_price, exit_price). Return signed position profit. Inputs are integers.', [[`${n}, 100, 103`,n*3],[`${-n}, 100, 103`,-n*3],['0, 50, 70',0],[`${n}, 103, 100`,-n*3]],'return quantity * (exit_price - entry_price)');
      case 'code-ev': return code('expected_value','outcomes, probabilities','Return the weighted expected value, rounded to 6 decimal places. Inputs are equal-length nonempty lists; probabilities sum to 1.',[[`[${n}, ${n+4}], [0.5, 0.5]`,n+2],['[-4, 8], [0.75, 0.25]',-1],['[5], [1]',5]],'return round(sum(x * p for x, p in zip(outcomes, probabilities)), 6)');
      case 'code-variance': return code('variance','values','Return the population variance of a nonempty list, rounded to 6 decimal places.',[[`[${n}, ${n+2}]`,1],['[5, 5, 5]',0],['[-2, 0, 2]',2.666667]],'mean = sum(values) / len(values)\nreturn round(sum((x - mean) ** 2 for x in values) / len(values), 6)');
      case 'code-call': return code('call_profit','spot, strike, premium','Return the expiry profit of one long call per unit, subtracting its premium. Inputs are integers.',[[`${100+n}, 100, 3`,n-3],['90, 100, 4',-4],['100, 100, 4',-4]],'return max(spot - strike, 0) - premium');
    }
  }
  const order=['arith-percent','arith-fraction','arith-return','prob-complement','prob-conditional','prob-independent','prob-bayes','prob-ev','prob-variance','brain-cases','brain-pigeon','brain-balance','brain-invariant','brain-symmetry','brain-bounds','brain-conditioning','code-pnl','code-ev','code-simulation','code-variance','code-call'];
  order.push(...decisionSkills.map(s=>s.id),...Applied.skills.map(s=>s.id));
  skills.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  const objectives={
    'arith-percent':'Calculate and invert a percentage of a stated base.', 'arith-fraction':'Translate among fractions, percentages and part-to-whole ratios.', 'arith-return':'Compound growth factors and solve a recovery-return problem.',
    'prob-complement':'Use an exhaustive partition to find a missing probability.', 'prob-conditional':'Identify the conditioned denominator and calculate the probability.', 'prob-independent':'Multiply only under independence and use complements for repeated trials.', 'prob-bayes':'Include base rates and false positives when reversing a condition.', 'prob-ev':'Compute expected net payoff and derive a fair entry fee.', 'prob-variance':'Compute dispersion and variance under scaling and translation.',
    'brain-cases':'Count disjoint exhaustive cases without double counting.', 'brain-pigeon':'Calculate a worst-case avoiding count and identify the first guaranteed repetition.', 'brain-balance':'Evaluate an information bound and the size of a balanced first split; recognize the stated strategy.', 'brain-invariant':'Identify a preserved residue to rule out an unreachable state.', 'brain-symmetry':'Count favorable relative orders justified by relabeling symmetry.', 'brain-bounds':'Check a capacity lower bound and counts in a stated attaining allocation.', 'brain-conditioning':'Combine first-step branches with their correct weights.',
    'code-pnl':'Implement signed P&L and rearrange it to solve for an exit price.', 'code-ev':'Aggregate weighted outcomes and subtract a fixed fee.', 'code-simulation':'Estimate single and joint events from reproducible simulated draws.', 'code-variance':'Implement population variance and exploit shift invariance.', 'code-call':'Separate expiry payoff from profit and compose a call spread.'
  };
  const errors={
    'arith-percent':'Using the final amount as the original percentage base.', 'arith-fraction':'Confusing a part-to-part ratio with a part-to-whole fraction.', 'arith-return':'Adding percentage changes that use different bases.',
    'prob-complement':'Subtracting from 100 when the answer is expressed as a probability.', 'prob-conditional':'Keeping the unconditional denominator.', 'prob-independent':'Multiplying dependent events without a condition.', 'prob-bayes':'Ignoring false positives or base rates.', 'prob-ev':'Treating expected value as a guaranteed outcome or forgetting the entry cost.', 'prob-variance':'Confusing a change in mean with a change in dispersion.',
    'brain-cases':'Counting the overlap twice.', 'brain-pigeon':'Giving a possible result instead of a worst-case guarantee.', 'brain-balance':'Stating a bound without an achievable comparison strategy.', 'brain-invariant':'Tracking examples without identifying what the operation preserves.', 'brain-symmetry':'Assuming symmetry when sampling is not uniform.', 'brain-bounds':'Giving a lower bound without an attaining construction.', 'brain-conditioning':'Averaging branches without their probabilities.',
    'code-pnl':'Losing the sign of a short position.', 'code-ev':'Pairing weights with the wrong outcomes.', 'code-simulation':'Using a strict threshold as an inclusive threshold or confusing a sample estimate with an exact probability.', 'code-variance':'Dividing by n - 1 when population variance is requested.', 'code-call':'Confusing payoff with profit or forgetting the short leg.'
  };
  for(const s of skills) {s.objective=objectives[s.id] || s.objective;s.commonError=errors[s.id] || s.commonError;s.contentVersion=1;s.scopeNote='Practiced means evidence on this bounded local unit. Retained means delayed retrieval; neither establishes broad interview readiness.';}
  const reasons={
    'brain-cases':['cases','Partition into disjoint cases and add their counts.','Multiply the counts of overlapping cases.'],
    'brain-pigeon':['worst','Fill every category to one below the target, then add one.','The most likely arrangement determines a guarantee.'],
    'brain-balance':['tree','Three outcomes per weighing give a bound; balanced groups attain it.','Two pans mean exactly two outcomes per weighing.'],
    'brain-invariant':['residue','Removing a fixed amount preserves the remainder modulo that amount.','Every smaller nonnegative count must eventually be reachable.'],
    'brain-symmetry':['bijection','Relabeling named cards gives equally likely relative orders; count the favorable orders.','All named events have equal probability even without a symmetry.'],
    'brain-bounds':['construct','Capacity gives a lower bound, and an explicit allocation attains it.','A lower bound alone always proves the optimum is achievable.'],
    'brain-conditioning':['branches','Weight each first-step branch by its probability, then add.','Average all branch values equally regardless of their probabilities.']
  };
  const transferHints={
    'arith-percent':['The new price is 120% of the original.', 'Divide the final price by 1.2; do not take 20% off the final price.'],
    'arith-fraction':['The ratio has five parts in total.', 'Cash is two of those five parts, not two thirds of the total.'],
    'arith-return':['Use the reduced value as the base for the recovery gain.', 'A fall from 100 to 80 needs a gain of 20/80.'],
    'prob-complement':['The stated outcomes are mutually exclusive and exhaustive.', 'Subtract both known probabilities from 1.'],
    'prob-ev':['Net value equals gross expected payoff minus the entry fee.', 'A fair fee equals the probability-weighted gross payoff.'],
    'prob-independent':['At least one success is the complement of all failures.', 'Independence lets you multiply the failure probabilities.'],
    'prob-variance':['Adding a constant shifts the mean by the same constant.', 'The deviations from the mean do not change.'],
    'brain-pigeon':['Avoid a triple by drawing two socks of every color.', 'That worst case has twice the number of colors. One more draw forces a triple.'],
    'brain-balance':['Build a decision tree with three outcomes at every level.', 'Equal three-way partitions attain 3 raised to the number of weighings.'],
    'brain-invariant':['Subtracting 3 preserves the remainder modulo 3, not parity.', 'Write the initial count as a multiple of 3 plus a remainder.'],
    'brain-cases':['Separate first digit 1 from first digit not 1.', 'In the second case, only last digit 1 qualifies. These cases do not overlap.'],
    'brain-symmetry':['Swap A and B in each ordering.', 'The swap pairs every A-before-B outcome with a B-before-A outcome.'],
    'brain-bounds':['Could all workers have at most four tasks?', 'Capacity would be one short. Assign five to one worker and four to each other worker.'],
    'brain-conditioning':['The first branch has weight 1/4; the other has weight 3/4.', 'Multiply each payoff by its own weight, then add.'],
    'code-pnl':['Rearrange target_pnl = quantity * (exit_price - entry_price).', 'Divide the target by the signed quantity and add entry_price.'],
    'code-ev':['Compute expected gross payoff first.', 'Subtract the fixed fee once, outside the weighted sum.'],
    'code-variance':['A common shift changes the mean but not deviations.', 'Compute the variance of the original values, avoiding another list.'],
    'code-call':['The short call subtracts the high-strike payoff.', 'Subtract the net premium once after combining the long and short payoffs.'],
    'code-simulation':['Both coordinates must be strictly below the threshold.', 'Use a < threshold and b < threshold; equality must fail for either coordinate.']
  };
  function question(id,seed,harder=false,level=0) {
    const q=buildQuestion(id,seed,harder,level);q.familyId ||= `${id}:${level?'transfer':'foundation'}`;
    if(level) q.hints=transferHints[id] || q.hints;
    if(reasons[id]) {const [value,good,bad]=reasons[id];q.correctReason=value;
      q.reasonOptions=[{value,label:good},{value:'unsupported',label:bad}];
      if(seed%2)q.reasonOptions.reverse();
    }
    const n=(seed%9)+2+(harder?5:0), k=seed%3+2;
    if(level && id==='prob-conditional') q.hints=[`Condition on the ${n+1} even outcomes from 2 through ${2*(n+1)}.`, `Exclude 2; ${n} of those ${n+1} outcomes exceed 2.`];
    if(level && id==='prob-bayes') q.hints=[`Use 1000 people: ${10*(n+6)} affected and ${1000-10*(n+6)} unaffected. Apply each flag rate to its own group.`, `There are ${8*(n+6)} true flags and ${100-(n+6)} false flags; divide true flags by all flags.`];
    const checks={
      'brain-pigeon':{prompt:'How many socks can the worst case contain before the guarantee is forced?',answer:level?2*n:n},
      'brain-balance':{prompt:level?'In the first weighing, how many candidate positions belong in each of the three equal branches?':'Split the candidates as evenly as possible. How many coins are in a largest group at the first split?',answer:level?3**(k-1):Math.ceil((3**(k-1)+1+Math.floor(seed/3)%3)/3)},
      'brain-invariant':{prompt:'How many allowed removals attain your proposed minimum remainder?',answer:n},
      'brain-bounds':{prompt:level?'In a most-even allocation, how many workers receive strictly more than the average workload?':`To attain the bound, how many tables are completely full (with ${1+seed%((2+seed%4)-1)} people at the last table)?`,answer:level?1+seed%(n-1):n}
    };
    if(checks[id]) q.construction=checks[id];
    if(id==='brain-invariant') {const step=level?3+seed%3:2;q.hints=[`Removing ${step} preserves the remainder modulo ${step}.`,`Divide the initial count by ${step} and keep its remainder.`];q.explanation='Removing a fixed k preserves the remainder modulo k. The invariant must match the actual operation.';q.workedExample='Starting with 14 and removing 4 at a time leaves 2: 14 = 3 × 4 + 2.';}
    if(level && id==='brain-bounds') {const capacity=2+seed%4;q.hints=[`Could every worker have at most ${capacity} tasks?`,`Start with ${capacity} tasks each and distribute the remaining tasks one per worker.`];}
    if(level && id==='brain-symmetry')q.hints=['Enumerate equally likely relative orders of only the named cards.','Count favorable relative orders and divide by all their relative orders.'];
    if(level && id==='prob-bayes') {q.explanation='Convert the prior and conditional flag rates into counts on a common population before conditioning on flags. The false-positive rate applies only to unaffected cases.';q.workedExample='In 1000 cases with 10% prevalence, 80% sensitivity and 20% false positives: 100 affected give 80 true flags; 900 unaffected give 180 false flags. Given a flag, probability = 80/(80+180) = 4/13, not 80%.';}
    if(level && id==='prob-variance') {q.explanation='Adding a constant shifts outcomes and mean equally. Multiplying outcomes by a scales deviations by a, so variance scales by a squared.';q.workedExample='If Var(X)=2, then Var(3X+5)=9 × 2 = 18.';q.hints=['Separate the scaling from the shift.','Square the scale factor and multiply the original variance; the shift contributes nothing.'];}
    if(level && id==='brain-pigeon') {q.explanation='To force t objects in one category, first count the worst arrangement with at most t - 1 in every category, then add one.';q.workedExample='With 4 colors, eight socks can have two of each. Nine guarantee three of a color.';}
    if(level && id==='arith-percent') {q.explanation='Invert percentage growth by dividing by the growth factor. Subtracting the same percentage from the final amount uses the wrong base.';q.workedExample='A 25% rise produces 150. Original value = 150 / 1.25 = 120.';}
    if(q.kind==='number')q.tolerance=0.00005;
    // Content identity is independent of generation IDs, seeds and presentation order.
    q.semanticKey=JSON.stringify([1,q.skillId,q.familyId,q.prompt,q.functionName || null,q.testCases || null,q.answer ?? null,q.solution,q.construction || null]);
    if(decisionSkills.some(s=>s.id===id))q.semanticKey=JSON.stringify(['decision:1',q.skillId,q.familyId,mod9(seed),level?1:0]);
    return q;
  }
  function diagnose(q,intermediate) {
    if(intermediate===null)return null;
    return q.feedbackRules?.find(rule=>Math.abs(intermediate-rule.intermediate)<=q.tolerance)?.message || null;
  }
  // Compatibility with local pre-release candidates 999d0b7/c57b081. Raw history is
  // retained; normalization prevents a prose/key fix from inventing new exposure.
  const legacyDecisionKeys=new Map([
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",200,140,4],[\"South live\",50,10,9],[\"Pilot (excluded)\",40,40,2]]},60,\"Relevant totals: 150 completed / 250 requests. Overall = 60%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":250},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",0,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",300,225,4],[\"South live\",60,18,9],[\"Pilot (excluded)\",50,50,2]]},67.5,\"Relevant totals: 243 completed / 360 requests. Overall = 67.5%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":360},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",1,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",400,320,4],[\"South live\",70,28,9],[\"Pilot (excluded)\",60,60,2]]},74.04255319148936,\"Relevant totals: 348 completed / 470 requests. Overall = 74.042553%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":470},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",2,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",500,350,4],[\"South live\",80,16,9],[\"Pilot (excluded)\",70,70,2]]},63.10344827586207,\"Relevant totals: 366 completed / 580 requests. Overall = 63.103448%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":580},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",3,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",600,450,4],[\"South live\",90,27,9],[\"Pilot (excluded)\",80,80,2]]},69.1304347826087,\"Relevant totals: 477 completed / 690 requests. Overall = 69.130435%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":690},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",4,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",700,560,4],[\"South live\",100,40,9],[\"Pilot (excluded)\",90,90,2]]},75,\"Relevant totals: 600 completed / 800 requests. Overall = 75%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":800},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",5,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",800,560,4],[\"South live\",110,22,9],[\"Pilot (excluded)\",100,100,2]]},63.956043956043956,\"Relevant totals: 582 completed / 910 requests. Overall = 63.956044%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":910},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",6,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",900,675,4],[\"South live\",120,36,9],[\"Pilot (excluded)\",110,110,2]]},69.70588235294117,\"Relevant totals: 711 completed / 1020 requests. Overall = 69.705882%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":1020},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",7,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:counts\",\"For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.\",{\"caption\":\"Service requests this week. Each request belongs to one row.\",\"headers\":[\"Group\",\"Requests\",\"Completed\",\"Cost per request\"],\"rows\":[[\"North live\",1000,800,4],[\"South live\",130,52,9],[\"Pilot (excluded)\",120,120,2]]},75.39823008849558,\"Relevant totals: 852 completed / 1130 requests. Overall = 75.39823%. Group percentages have different denominators; exclude the pilot.\",{\"prompt\":\"How many live requests form the denominator?\",\"answer\":1130},\"counts\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:counts\",8,0]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",2,12,10],[\"Current afternoon\",5,4,20],[\"Previous day (excluded)\",8,30,15]]},6.285714285714286,\"Jobs = 2×12 + 5×4 = 44. Hours = 7. Throughput = 6.285714 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":44},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",0,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",3,14,10],[\"Current afternoon\",6,5,20],[\"Previous day (excluded)\",8,30,15]]},8,\"Jobs = 3×14 + 6×5 = 72. Hours = 9. Throughput = 8 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":72},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",1,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",4,16,10],[\"Current afternoon\",5,6,20],[\"Previous day (excluded)\",8,30,15]]},10.444444444444445,\"Jobs = 4×16 + 5×6 = 94. Hours = 9. Throughput = 10.444444 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":94},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",2,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",2,18,10],[\"Current afternoon\",6,7,20],[\"Previous day (excluded)\",8,30,15]]},9.75,\"Jobs = 2×18 + 6×7 = 78. Hours = 8. Throughput = 9.75 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":78},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",3,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",3,20,10],[\"Current afternoon\",5,8,20],[\"Previous day (excluded)\",8,30,15]]},12.5,\"Jobs = 3×20 + 5×8 = 100. Hours = 8. Throughput = 12.5 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":100},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",4,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",4,22,10],[\"Current afternoon\",6,9,20],[\"Previous day (excluded)\",8,30,15]]},14.2,\"Jobs = 4×22 + 6×9 = 142. Hours = 10. Throughput = 14.2 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":142},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",5,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",2,24,10],[\"Current afternoon\",5,10,20],[\"Previous day (excluded)\",8,30,15]]},14,\"Jobs = 2×24 + 5×10 = 98. Hours = 7. Throughput = 14 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":98},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",6,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",3,26,10],[\"Current afternoon\",6,11,20],[\"Previous day (excluded)\",8,30,15]]},16,\"Jobs = 3×26 + 6×11 = 144. Hours = 9. Throughput = 16 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":144},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",7,1]"
 ],
 [
  "[1,\"data-weighted\",\"data-weighted:time\",\"What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.\",{\"caption\":\"Shift summary. Rates are constant within each listed interval.\",\"headers\":[\"Interval\",\"Hours\",\"Jobs per hour\",\"Break minutes (already excluded from hours)\"],\"rows\":[[\"Current morning\",4,28,10],[\"Current afternoon\",5,12,20],[\"Previous day (excluded)\",8,30,15]]},19.11111111111111,\"Jobs = 4×28 + 5×12 = 172. Hours = 9. Throughput = 19.111111 jobs/hour. Do not subtract breaks twice or average rates equally.\",{\"prompt\":\"How many jobs were completed across the current intervals?\",\"answer\":172},\"time\"]",
  "[\"decision:1\",\"data-weighted\",\"data-weighted:time\",8,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",100,120,500],[\"Paid B\",80,70,900],[\"Trial (excluded)\",60,120,0]]},5.555555555555555,\"Earlier paid base 180; later paid total 190. Change = (190−180)/180×100 = 5.555556%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":180},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",0,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",120,145,500],[\"Paid B\",100,88,900],[\"Trial (excluded)\",70,140,0]]},5.909090909090909,\"Earlier paid base 220; later paid total 233. Change = (233−220)/220×100 = 5.909091%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":220},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",1,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",140,170,500],[\"Paid B\",120,106,900],[\"Trial (excluded)\",80,160,0]]},6.153846153846154,\"Earlier paid base 260; later paid total 276. Change = (276−260)/260×100 = 6.153846%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":260},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",2,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",160,195,500],[\"Paid B\",140,124,900],[\"Trial (excluded)\",90,180,0]]},6.333333333333333,\"Earlier paid base 300; later paid total 319. Change = (319−300)/300×100 = 6.333333%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":300},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",3,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",180,220,500],[\"Paid B\",160,142,900],[\"Trial (excluded)\",100,200,0]]},6.470588235294118,\"Earlier paid base 340; later paid total 362. Change = (362−340)/340×100 = 6.470588%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":340},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",4,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",200,245,500],[\"Paid B\",180,160,900],[\"Trial (excluded)\",110,220,0]]},6.578947368421052,\"Earlier paid base 380; later paid total 405. Change = (405−380)/380×100 = 6.578947%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":380},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",5,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",220,270,500],[\"Paid B\",200,178,900],[\"Trial (excluded)\",120,240,0]]},6.666666666666667,\"Earlier paid base 420; later paid total 448. Change = (448−420)/420×100 = 6.666667%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":420},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",6,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",240,295,500],[\"Paid B\",220,196,900],[\"Trial (excluded)\",130,260,0]]},6.739130434782608,\"Earlier paid base 460; later paid total 491. Change = (491−460)/460×100 = 6.73913%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":460},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",7,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:aggregate-change\",\"For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.\",{\"caption\":\"Units shipped in two consecutive months. Paid segments are disjoint.\",\"headers\":[\"Segment\",\"Earlier units\",\"Later units\",\"Later revenue\"],\"rows\":[[\"Paid A\",260,320,500],[\"Paid B\",240,214,900],[\"Trial (excluded)\",140,280,0]]},6.8,\"Earlier paid base 500; later paid total 534. Change = (534−500)/500×100 = 6.8%.\",{\"prompt\":\"What starting unit count is the percentage base?\",\"answer\":500},\"base\"]",
  "[\"decision:1\",\"data-base\",\"data-base:aggregate-change\",8,0]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",120,20,600],[\"Paid B\",72,-10,800],[\"Trial (excluded)\",60,100,0]]},180,\"Earlier A = 120/1.2 = 100; earlier B = 72/0.9 = 80. Total earlier paid units = 180. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":100},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",0,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",96,-20,600],[\"Paid B\",125,25,800],[\"Trial (excluded)\",70,100,0]]},220,\"Earlier A = 96/0.8 = 120; earlier B = 125/1.25 = 100. Total earlier paid units = 220. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":120},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",1,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",210,50,600],[\"Paid B\",60,-50,800],[\"Trial (excluded)\",80,100,0]]},260,\"Earlier A = 210/1.5 = 140; earlier B = 60/0.5 = 120. Total earlier paid units = 260. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":140},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",2,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",192,20,600],[\"Paid B\",126,-10,800],[\"Trial (excluded)\",90,100,0]]},300,\"Earlier A = 192/1.2 = 160; earlier B = 126/0.9 = 140. Total earlier paid units = 300. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":160},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",3,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",144,-20,600],[\"Paid B\",200,25,800],[\"Trial (excluded)\",100,100,0]]},340,\"Earlier A = 144/0.8 = 180; earlier B = 200/1.25 = 160. Total earlier paid units = 340. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":180},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",4,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",300,50,600],[\"Paid B\",90,-50,800],[\"Trial (excluded)\",110,100,0]]},380,\"Earlier A = 300/1.5 = 200; earlier B = 90/0.5 = 180. Total earlier paid units = 380. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":200},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",5,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",264,20,600],[\"Paid B\",180,-10,800],[\"Trial (excluded)\",120,100,0]]},420,\"Earlier A = 264/1.2 = 220; earlier B = 180/0.9 = 200. Total earlier paid units = 420. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":220},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",6,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",192,-20,600],[\"Paid B\",275,25,800],[\"Trial (excluded)\",130,100,0]]},460,\"Earlier A = 192/0.8 = 240; earlier B = 275/1.25 = 220. Total earlier paid units = 460. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":240},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",7,1]"
 ],
 [
  "[1,\"data-base\",\"data-base:reverse-segments\",\"Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.\",{\"caption\":\"Later month counts and each segment’s change from its own earlier count.\",\"headers\":[\"Segment\",\"Later units\",\"Change from earlier (%)\",\"Later revenue\"],\"rows\":[[\"Paid A\",390,50,600],[\"Paid B\",120,-50,800],[\"Trial (excluded)\",140,100,0]]},500,\"Earlier A = 390/1.5 = 260; earlier B = 120/0.5 = 240. Total earlier paid units = 500. Reverse each segment before adding.\",{\"prompt\":\"How many earlier units were in Paid A?\",\"answer\":260},\"reverse\"]",
  "[\"decision:1\",\"data-base\",\"data-base:reverse-segments\",8,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:must\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; B before C. Statement: A before C. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,4,\"All feasible orders: ABCD, ABDC, ADBC, DABC. Statement holds in 4 of 4: must.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":4},\"must\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:must\",0,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:could\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; C before D. Statement: B before C. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,1,\"All feasible orders: ABCD, ACBD, ACDB, CABD, CADB, CDAB. Statement holds in 1 of 6: could but need not. Witness ABCD; counterexample ACBD.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":6},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:could\",1,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:impossible\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; B before C. Statement: C before A. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,0,\"All feasible orders: ABCD, ABDC, ADBC, DABC. Statement holds in 0 of 4: impossible.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":4},\"impossible\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:impossible\",2,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:could\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; A before C. Statement: A first. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,6,\"All feasible orders: ABCD, ABDC, ACBD, ACDB, ADBC, ADCB, DABC, DACB. Statement holds in 6 of 8: could but need not. Witness ABCD; counterexample DABC.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":8},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:could\",3,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:could\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; C before B. Statement: B last. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,6,\"All feasible orders: ACBD, ACDB, ADCB, CABD, CADB, CDAB, DACB, DCAB. Statement holds in 6 of 8: could but need not. Witness ACDB; counterexample ACBD.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":8},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:could\",4,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:must\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; B before C; C before D. Statement: D last. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,1,\"All feasible orders: ABCD. Statement holds in 1 of 1: must.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":1},\"must\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:must\",5,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:could\",\"Schedule A, B, C, D once each in four slots. Rules: A before C; B before D. Statement: A before D. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,5,\"All feasible orders: ABCD, ABDC, ACBD, BACD, BADC, BDAC. Statement holds in 5 of 6: could but need not. Witness ABCD; counterexample BDAC.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":6},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:could\",6,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:impossible\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; C before D. Statement: D before C. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,0,\"All feasible orders: ABCD, ACBD, ACDB, CABD, CADB, CDAB. Statement holds in 0 of 6: impossible.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":6},\"impossible\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:impossible\",7,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:foundation:must\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; A before C; A before D. Statement: A first. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,6,\"All feasible orders: ABCD, ABDC, ACBD, ACDB, ADBC, ADCB. Statement holds in 6 of 6: must.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":6},\"must\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:foundation:must\",8,0]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:could\",\"Schedule A, B, C, D once each in four slots. Rules: A immediately before B; C before D. Statement: A before D. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,2,\"All feasible orders: ABCD, CABD, CDAB. Statement holds in 2 of 3: could but need not. Witness ABCD; counterexample CDAB.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":3},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:could\",0,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:impossible\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; C before D; B and C are not adjacent. Statement: B before C. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,0,\"All feasible orders: ACDB, CABD, CADB, CDAB. Statement holds in 0 of 4: impossible.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":4},\"impossible\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:impossible\",1,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:impossible\",\"Schedule A, B, C, D once each in four slots. Rules: A immediately before B; C before D. Statement: B immediately before A. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,0,\"All feasible orders: ABCD, CABD, CDAB. Statement holds in 0 of 3: impossible.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":3},\"impossible\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:impossible\",2,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:must\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; C first. Statement: C before A. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,3,\"All feasible orders: CABD, CADB, CDAB. Statement holds in 3 of 3: must.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":3},\"must\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:must\",3,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:could\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; D is not first. Statement: D last. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,3,\"All feasible orders: ABCD, ABDC, ACBD, ACDB, ADBC, ADCB, CABD, CADB, CDAB. Statement holds in 3 of 9: could but need not. Witness ABCD; counterexample ABDC.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":9},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:could\",4,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:could\",\"Schedule A, B, C, D once each in four slots. Rules: A immediately before B; C immediately before D. Statement: A before C. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,1,\"All feasible orders: ABCD, CDAB. Statement holds in 1 of 2: could but need not. Witness ABCD; counterexample CDAB.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":2},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:could\",5,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:could\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; C and D are not adjacent. Statement: C before D. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,3,\"All feasible orders: ACBD, ADBC, CABD, CADB, DABC, DACB. Statement holds in 3 of 6: could but need not. Witness ACBD; counterexample ADBC.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":6},\"could\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:could\",6,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:impossible\",\"Schedule A, B, C, D once each in four slots. Rules: A before B; D first. Statement: B before D. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,0,\"All feasible orders: DABC, DACB, DCAB. Statement holds in 0 of 3: impossible.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":3},\"impossible\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:impossible\",7,1]"
 ],
 [
  "[1,\"brain-order\",\"brain-order:transfer:must\",\"Schedule A, B, C, D once each in four slots. Rules: A immediately before B; C before A. Statement: C before B. How many feasible orders satisfy the statement? Also classify it as must, could but need not, or impossible.\",null,3,\"All feasible orders: CABD, CDAB, DCAB. Statement holds in 3 of 3: must.\",{\"prompt\":\"How many orders obey ALL the rules, before filtering by the statement?\",\"answer\":3},\"must\"]",
  "[\"decision:1\",\"brain-order\",\"brain-order:transfer:must\",8,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:independent\",\"Events A and B are explicitly independent, with P(A)=0.2 and P(B)=0.3. What is P(A and B)?\",null,0.06,\"Independence gives P(B | A)=P(B)=0.3. Joint = 0.2×0.3 = 0.06.\",{\"prompt\":\"What is P(B | A)?\",\"answer\":0.3},\"independent\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:independent\",0,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:conditional\",\"A bag has 4 red and 3 blue tokens. Draw two uniformly WITHOUT replacement. What is P(two reds)?\",null,0.2857142857142857,\"First red 4/7; given that red, 3 reds remain among 6 tokens. Joint = 4/7×3/6 = 0.285714.\",{\"prompt\":\"What is P(second red | first red)?\",\"answer\":0.5},\"conditional\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:conditional\",1,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:insufficient\",\"Only P(A)=0.2 and P(B)=0.5 are given; their dependence is unknown. Select whether the exact joint P(A and B) is determined, then enter its LARGEST possible value consistent with these marginals.\",null,0.2,\"Joint bounds: max(0,0.2+0.5−1)=0 to min(0.2,0.5)=0.2. Both extremes are attainable, so the exact probability is undetermined.\",{\"prompt\":\"What is the SMALLEST possible P(A and B)?\",\"answer\":0},\"insufficient\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:insufficient\",2,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:independent\",\"Events A and B are explicitly independent, with P(A)=0.5 and P(B)=0.3. What is P(A and B)?\",null,0.15,\"Independence gives P(B | A)=P(B)=0.3. Joint = 0.5×0.3 = 0.15.\",{\"prompt\":\"What is P(B | A)?\",\"answer\":0.3},\"independent\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:independent\",3,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:conditional\",\"A bag has 7 red and 3 blue tokens. Draw two uniformly WITHOUT replacement. What is P(two reds)?\",null,0.46666666666666656,\"First red 7/10; given that red, 6 reds remain among 9 tokens. Joint = 7/10×6/9 = 0.466667.\",{\"prompt\":\"What is P(second red | first red)?\",\"answer\":0.6666666666666666},\"conditional\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:conditional\",4,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:insufficient\",\"Only P(A)=0.3 and P(B)=0.5 are given; their dependence is unknown. Select whether the exact joint P(A and B) is determined, then enter its LARGEST possible value consistent with these marginals.\",null,0.3,\"Joint bounds: max(0,0.3+0.5−1)=0 to min(0.3,0.5)=0.3. Both extremes are attainable, so the exact probability is undetermined.\",{\"prompt\":\"What is the SMALLEST possible P(A and B)?\",\"answer\":0},\"insufficient\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:insufficient\",5,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:independent\",\"Events A and B are explicitly independent, with P(A)=0.8 and P(B)=0.3. What is P(A and B)?\",null,0.24,\"Independence gives P(B | A)=P(B)=0.3. Joint = 0.8×0.3 = 0.24.\",{\"prompt\":\"What is P(B | A)?\",\"answer\":0.3},\"independent\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:independent\",6,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:conditional\",\"A bag has 10 red and 3 blue tokens. Draw two uniformly WITHOUT replacement. What is P(two reds)?\",null,0.576923076923077,\"First red 10/13; given that red, 9 reds remain among 12 tokens. Joint = 10/13×9/12 = 0.576923.\",{\"prompt\":\"What is P(second red | first red)?\",\"answer\":0.75},\"conditional\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:conditional\",7,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:foundation:insufficient\",\"Only P(A)=0.4 and P(B)=0.5 are given; their dependence is unknown. Select whether the exact joint P(A and B) is determined, then enter its LARGEST possible value consistent with these marginals.\",null,0.4,\"Joint bounds: max(0,0.4+0.5−1)=0 to min(0.4,0.5)=0.4. Both extremes are attainable, so the exact probability is undetermined.\",{\"prompt\":\"What is the SMALLEST possible P(A and B)?\",\"answer\":0},\"insufficient\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:foundation:insufficient\",8,0]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:conditional\",\"A record is selected uniformly from this table. What is P(A and B), meaning Group A AND success? Do not assume independence.\",{\"caption\":\"Disjoint observed groups. A is membership in Group A; B is a success.\",\"headers\":[\"Group\",\"Successes\",\"Failures\"],\"rows\":[[\"A\",10,30],[\"Not A\",20,40]]},0.1,\"P(B | A)=10/40; P(A)=40/100. Joint = 10/100 = 0.1. The conditional row, not the marginal success rate, controls the second factor.\",{\"prompt\":\"What is P(B | A)?\",\"answer\":0.25},\"conditional\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:conditional\",0,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:independent\",\"A bag has 4 red and 3 blue tokens. Draw uniformly, REPLACE the token, remix, then draw uniformly again, independently of the first draw. What is P(two reds)?\",null,0.32653061224489793,\"Replacement restores the 7 tokens, and independence is stated. Second-red probability 4/7; joint = (4/7)² = 0.326531.\",{\"prompt\":\"What is P(second red | first red)?\",\"answer\":0.5714285714285714},\"independent\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:independent\",1,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:insufficient\",\"Only P(A)=0.6 and P(B)=0.7 are given; their dependence is unknown. Select whether the exact conditional P(A | B) is determined, then enter its LARGEST possible value consistent with these marginals.\",null,0.8571428571428572,\"Joint bounds: max(0,0.6+0.7−1)=0.3 to min(0.6,0.7)=0.6. Divide both by P(B)=0.7: conditional bounds 0.428571 to 0.857143. Both extremes are attainable, so the exact probability is undetermined.\",{\"prompt\":\"What is the SMALLEST possible P(A | B)?\",\"answer\":0.4285714285714283},\"insufficient\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:insufficient\",2,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:conditional\",\"A record is selected uniformly from this table. What is P(A and B), meaning Group A AND success? Do not assume independence.\",{\"caption\":\"Disjoint observed groups. A is membership in Group A; B is a success.\",\"headers\":[\"Group\",\"Successes\",\"Failures\"],\"rows\":[[\"A\",25,45],[\"Not A\",23,67]]},0.15625,\"P(B | A)=25/70; P(A)=70/160. Joint = 25/160 = 0.15625. The conditional row, not the marginal success rate, controls the second factor.\",{\"prompt\":\"What is P(B | A)?\",\"answer\":0.35714285714285715},\"conditional\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:conditional\",3,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:independent\",\"A bag has 7 red and 3 blue tokens. Draw uniformly, REPLACE the token, remix, then draw uniformly again, independently of the first draw. What is P(two reds)?\",null,0.48999999999999994,\"Replacement restores the 10 tokens, and independence is stated. Second-red probability 7/10; joint = (7/10)² = 0.49.\",{\"prompt\":\"What is P(second red | first red)?\",\"answer\":0.7},\"independent\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:independent\",4,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:insufficient\",\"Only P(A)=0.7 and P(B)=0.7 are given; their dependence is unknown. Select whether the exact conditional P(A | B) is determined, then enter its LARGEST possible value consistent with these marginals.\",null,1,\"Joint bounds: max(0,0.7+0.7−1)=0.4 to min(0.7,0.7)=0.7. Divide both by P(B)=0.7: conditional bounds 0.571429 to 1. Both extremes are attainable, so the exact probability is undetermined.\",{\"prompt\":\"What is the SMALLEST possible P(A | B)?\",\"answer\":0.5714285714285713},\"insufficient\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:insufficient\",5,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:conditional\",\"A record is selected uniformly from this table. What is P(A and B), meaning Group A AND success? Do not assume independence.\",{\"caption\":\"Disjoint observed groups. A is membership in Group A; B is a success.\",\"headers\":[\"Group\",\"Successes\",\"Failures\"],\"rows\":[[\"A\",40,60],[\"Not A\",26,94]]},0.18181818181818182,\"P(B | A)=40/100; P(A)=100/220. Joint = 40/220 = 0.181818. The conditional row, not the marginal success rate, controls the second factor.\",{\"prompt\":\"What is P(B | A)?\",\"answer\":0.4},\"conditional\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:conditional\",6,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:independent\",\"A bag has 10 red and 3 blue tokens. Draw uniformly, REPLACE the token, remix, then draw uniformly again, independently of the first draw. What is P(two reds)?\",null,0.591715976331361,\"Replacement restores the 13 tokens, and independence is stated. Second-red probability 10/13; joint = (10/13)² = 0.591716.\",{\"prompt\":\"What is P(second red | first red)?\",\"answer\":0.7692307692307693},\"independent\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:independent\",7,1]"
 ],
 [
  "[1,\"prob-method\",\"prob-method:transfer:insufficient\",\"Only P(A)=0.8 and P(B)=0.7 are given; their dependence is unknown. Select whether the exact conditional P(A | B) is determined, then enter its LARGEST possible value consistent with these marginals.\",null,1,\"Joint bounds: max(0,0.8+0.7−1)=0.5 to min(0.8,0.7)=0.7. Divide both by P(B)=0.7: conditional bounds 0.714286 to 1. Both extremes are attainable, so the exact probability is undetermined.\",{\"prompt\":\"What is the SMALLEST possible P(A | B)?\",\"answer\":0.7142857142857143},\"insufficient\"]",
  "[\"decision:1\",\"prob-method\",\"prob-method:transfer:insufficient\",8,1]"
 ]
]);
  const canonicalKey=key=>legacyDecisionKeys.get(key) || key;
  function validateItemIdentity(event) {
    const skill=get(event?.skillId);if(!skill || event.kind!=='attempt')return false;
    if(!decisionSkills.some(s=>s.id===skill.id))return event.methodTag==null;
    const parts=String(event.variant).split(':');
    if(parts.length!==3 || parts[0]!==skill.id || !/^[0-8]$/.test(parts[1]) || !/^[01]$/.test(parts[2]))return false;
    const q=question(skill.id,Number(parts[1]),false,Number(parts[2]));
    return canonicalKey(event.semanticKey)===q.semanticKey && event.familyId===q.familyId && (event.methodTag ?? null)===(q.methodTag ?? null) && event.isTransfer===q.transfer;
  }
  return {skills,get,question,diagnose,canonicalKey,validateItemIdentity};
})();
if (typeof module !== 'undefined') module.exports = QuantCurriculum;
