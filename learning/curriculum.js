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
      explanation:'Always P(A and B) = P(A) × P(B | A) when P(A)>0. Independence permits replacing P(B | A) with P(B); marginals alone do not. Drawing without replacement changes the second denominator and favorable count. If only marginals are known, max(0, P(A)+P(B)−1) ≤ P(A and B) ≤ min(P(A),P(B)). The overlap cannot exceed either event. Since the union has probability at most 1, the overlap is at least P(A)+P(B)−1 and cannot be negative. These bounds describe several possible dependencies, not one exact probability. Divide joint bounds by P(B)>0 to bound P(A | B).',
      example:'Bag: 3 red, 2 blue. Without replacement, two reds have probability (3/5)×(2/4)=3/10; with replacement and independent uniform draws, (3/5)²=9/25. With only P(A)=.6 and P(B)=.5, imagine 100 equally likely cases: 60 are in A and 50 in B. At least 10 must overlap to fit in 100, and at most all 50 B cases can overlap. Thus joint probability ranges .1 to .5: .3 is possible but is not determined.',
      commonError:'Multiplying marginals without independence, or claiming an exact probability from bounds.',
      requiredMethods:['independent','conditional','insufficient']}
  ];
  skills.push(...decisionSkills);
  const mod9=seed=>((seed%9)+9)%9;
  const fmt=n=>String(Number(n.toFixed(6)));
  const methodOptions=[
    {value:'independent',label:'Independence is explicit: multiply marginal probabilities.'},
    {value:'conditional',label:'Use the supplied or updated conditional probability for the second event.'},
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
        q.table={caption:'Service requests this week. Each request belongs to one row.',headers:['Group','Requests','Completed','Cost per request'],rows:[['North live',a,sa,4],['South live',b,sb,9],['Pilot (excluded)',pilot,pilot,2]]};
        q.prompt='For the LIVE groups only, what percentage of requests completed? Enter the percentage without %. Cost is not part of this calculation.';
        q.answer=100*(sa+sb)/(a+b);intermediate('How many live requests form the denominator?',a+b);
        q.scenario={type:'counts',a,b,sa,sb,pilot};
        q.solution=`Relevant totals: ${fmt(sa+sb)} completed / ${a+b} requests. Overall = ${fmt(q.answer)}%. Group percentages have different denominators; exclude the pilot.`;
        diagnose(a+b+pilot,`Your denominator includes the ${pilot} pilot requests. Restrict both totals to the two live rows.`);
        reason('counts','Add live completed counts and live request counts before dividing.','Average the two live percentages with equal weight.');
        q.hints=['Mark the two live rows; costs and the pilot do not answer the question.','Add completed counts and request counts separately, then divide and convert to %.'];
      } else {
        const hoursA=2+v%3,hoursB=5+v%2,rateA=12+2*v,rateB=4+v;
        q.table={caption:'Shift summary. Rates are constant within each listed interval.',headers:['Interval','Hours','Jobs per hour','Break minutes (already excluded from hours)'],rows:[['Current morning',hoursA,rateA,10],['Current afternoon',hoursB,rateB,20],['Previous day (excluded)',8,30,15]]};
        q.prompt='What was the overall throughput in jobs per hour across the two CURRENT intervals? The listed hours already exclude breaks.';
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
        const changeA=20+5*v,changeB=-(10+v*2),laterA=a+changeA,laterB=b+changeB;
        q.table={caption:'Units shipped in two consecutive months. Paid segments are disjoint.',headers:['Segment','Earlier units','Later units','Later revenue'],rows:[['Paid A',a,laterA,500],['Paid B',b,laterB,900],['Trial (excluded)',trial,trial*2,0]]};
        q.prompt='For PAID units in total, what was the percentage change from the earlier month to the later month? Enter the signed percentage without %. Use unit counts, not revenue.';
        q.answer=100*(changeA+changeB)/(a+b);intermediate('What starting unit count is the percentage base?',a+b);
        q.scenario={type:'aggregate',a,b,laterA,laterB,trial};
        q.solution=`Earlier paid base ${a+b}; later paid total ${laterA+laterB}. Change = (${laterA+laterB}−${a+b})/${a+b}×100 = ${fmt(q.answer)}%.`;
        diagnose(laterA+laterB,`Your base is the later paid total ${laterA+laterB}. Change from earlier to later uses the earlier total ${a+b}.`);
        diagnose(a+b+trial,`Your base includes ${trial} trial units. The requested population is paid units in both months.`);
        reason('base','Use earlier paid units as the base and combine paid counts first.','Divide the change by the later paid total.');
        q.hints=['Select paid rows and the unit columns for both months.','Subtract earlier from later; divide by earlier paid units, then multiply by 100.'];
      } else {
        const changeA=[20,-20,50][v%3],changeB=[-10,25,-50][v%3],laterA=a*(1+changeA/100),laterB=b*(1+changeB/100);
        q.table={caption:'Later month counts and each segment’s change from its own earlier count.',headers:['Segment','Later units','Change from earlier (%)','Later revenue'],rows:[['Paid A',laterA,changeA,600],['Paid B',laterB,changeB,800],['Trial (excluded)',trial,100,0]]};
        q.prompt='Reconstruct the TOTAL EARLIER paid unit count. Each segment percentage uses its own earlier count. Enter units, not a percentage.';
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
      q.hints=['Enumerate by first slot, removing any partial order that violates a rule. Keep adjacency rules active.','Count all feasible orders first, then statement witnesses: all means must, some but not all means could but need not, zero means impossible.'];
    } else if(id==='prob-method') {
      const type=v%3;let method;
      q.reasonOptions=methodOptions.map(o=>({...o}));
      if((!level&&type===0)||(level&&type===1)) {
        method='independent';const red=3+v,blue=2+v%3;
        if(level) {
          const p=red/(red+blue);q.prompt=`A bag has ${red} red and ${blue} blue tokens. Draw uniformly, REPLACE the token, remix, then draw uniformly again, independently of the first draw. What is P(two reds)?`;
          q.answer=p*p;intermediate('What is P(second red | first red)?',p);q.scenario={type:'replacement',red,blue};
          q.solution=`Replacement restores the ${red+blue} tokens, and independence is stated. Second-red probability ${red}/${red+blue}; joint = (${red}/${red+blue})² = ${fmt(q.answer)}.`;
          diagnose((red-1)/(red+blue-1),'Your conditional rate removes the first token. With replacement, both the red count and total return to their original values.');
        } else {
          const pA=(2+v)/10,pB=(3+v%3)/10;q.prompt=`Events A and B are explicitly independent, with P(A)=${pA} and P(B)=${pB}. What is P(A and B)?`;
          q.answer=pA*pB;intermediate('What is P(B | A)?',pB);q.scenario={type:'independent',pA,pB};
          q.solution=`Independence gives P(B | A)=P(B)=${pB}. Joint = ${pA}×${pB} = ${fmt(q.answer)}.`;
          diagnose(pA,`Your conditional intermediate equals P(A)=${pA}. Independence leaves P(B | A) equal to the stated P(B)=${pB}.`);
        }
        q.hints=['Find the explicit independence assumption; replacement alone should not be silently assumed to imply independent sampling.','Under the stated independent sampling, the second conditional rate equals its marginal rate. Multiply once.'];
      } else if((!level&&type===1)||(level&&type===0)) {
        method='conditional';
        if(!level) {
          const red=3+v,blue=2+v%3,total=red+blue;q.prompt=`A bag has ${red} red and ${blue} blue tokens. Draw two uniformly WITHOUT replacement. What is P(two reds)?`;
          q.answer=red/total*(red-1)/(total-1);intermediate('What is P(second red | first red)?',(red-1)/(total-1));q.scenario={type:'without',red,blue};
          q.solution=`First red ${red}/${total}; given that red, ${red-1} reds remain among ${total-1} tokens. Joint = ${red}/${total}×${red-1}/${total-1} = ${fmt(q.answer)}.`;
          diagnose(red/total,`Your second conditional rate is the original ${red}/${total}. After a red is removed, use ${red-1} remaining reds out of ${total-1} tokens.`);
        } else {
          const totalA=40+10*v,totalOther=60+10*v,successA=10+5*v,successOther=20+v;
          q.table={caption:'Disjoint observed groups. A is membership in Group A; B is a success.',headers:['Group','Successes','Failures'],rows:[['A',successA,totalA-successA],['Not A',successOther,totalOther-successOther]]};
          q.prompt='A record is selected uniformly from this table. What is P(A and B), meaning Group A AND success? Do not assume independence.';
          q.answer=successA/(totalA+totalOther);intermediate('What is P(B | A)?',successA/totalA);q.scenario={type:'conditional-table',totalA,totalOther,successA,successOther};
          q.solution=`P(B | A)=${successA}/${totalA}; P(A)=${totalA}/${totalA+totalOther}. Joint = ${successA}/${totalA+totalOther} = ${fmt(q.answer)}. The conditional row, not the marginal success rate, controls the second factor.`;
          diagnose((successA+successOther)/(totalA+totalOther),`Your intermediate is the whole-table success rate. Conditioning on A restricts the denominator to ${totalA} Group A records and the numerator to ${successA} successes.`);
        }
        q.hints=['Condition on the first event: what denominator and favorable outcomes remain?','Use P(A) × P(B | A). Without replacement update both counts; a table condition restricts the row.'];
      } else {
        method='insufficient';const pA=(level?6:2)+Math.floor(v/3),pB=level?7:5,pa=pA/10,pb=pB/10,low=Math.max(0,pa+pb-1),high=Math.min(pa,pb);
        q.prompt=`Only P(A)=${pa} and P(B)=${pb} are given; their dependence is unknown. Select whether the exact ${level?'conditional P(A | B)':'joint P(A and B)'} is determined, then enter its LARGEST possible value consistent with these marginals.`;
        q.answer=level?high/pb:high;intermediate(`What is the SMALLEST possible ${level?'P(A | B)':'P(A and B)'}?`,level?low/pb:low);q.scenario={type:level?'conditional-bounds':'joint-bounds',pA:pa,pB:pb};
        q.solution=`Joint bounds: max(0,${pa}+${pb}−1)=${fmt(low)} to min(${pa},${pb})=${fmt(high)}.${level?` Divide both by P(B)=${pb}: conditional bounds ${fmt(low/pb)} to ${fmt(high/pb)}.`:''} Both extremes are attainable, so the exact probability is undetermined.`;
        diagnose(level?pa:pa*pb,`Your lower-bound intermediate equals the ${level?'independent conditional rate':'product of the marginals'}. Independence is not supplied. Use the attainable overlap bounds${level?' and divide by P(B)':''}.`);
        q.hints=['Several joint distributions have these marginals. Do not invent independence.','Joint overlap is at least max(0, P(A)+P(B)−1) and at most min(P(A),P(B)). For P(A | B), divide overlap bounds by the positive P(B).'];
      }
      q.correctReason=method;q.methodTag=method;q.familyId=`${id}:${level?'transfer':'foundation'}:${method}`;
    } else throw Error('Unknown decision skill');
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
    if(decisionSkills.some(s=>s.id===id))q.semanticKey=JSON.stringify([1,q.skillId,q.familyId,q.prompt,q.table || null,q.answer,q.solution,q.construction,q.correctReason]);
    return q;
  }
  function diagnose(q,intermediate) {
    if(intermediate===null)return null;
    return q.feedbackRules?.find(rule=>Math.abs(intermediate-rule.intermediate)<=q.tolerance)?.message || null;
  }
  return {skills,get,question,diagnose};
})();
if (typeof module !== 'undefined') module.exports = QuantCurriculum;
