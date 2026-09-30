const {test}=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const C=require('../learning/curriculum');
test('all Quant Coding reference solutions satisfy executable test cases in both families',()=>{
 const questions=[];
 for(const skill of C.skills.filter(s=>s.mode==='python'))for(const level of [0,1])for(const seed of [1,5,9])questions.push(C.question(skill.id,seed,false,level));
 const script=`import json,sys,math\nquestions=json.load(sys.stdin)\nn=0\nfor q in questions:\n ns={}\n code=q['starterCode'].split('\\n')[0]+'\\n'+'\\n'.join('    '+line for line in q['solution'].split('\\n'))\n exec(code,ns)\n for t in q['testCases']:\n  value=eval(q['functionName']+'('+t['input']+')',ns)\n  expected=eval(t['expected'])\n  assert math.isclose(value,expected,rel_tol=0,abs_tol=t.get('tolerance',0)),(q['id'],t,value)\n  n+=1\nprint(n)`;
 const n=Number(execFileSync('python3',['-c',script],{input:JSON.stringify(questions),encoding:'utf8',timeout:10000}));
 assert.ok(n>=90);console.log(`${n} executable Python oracle checks passed`);
});
test('simulation tests reject inclusive thresholds and ignored coordinates in every variant',()=>{
 const questions=[];for(const level of [0,1])for(let seed=1;seed<=9;seed++)questions.push(C.question('code-simulation',seed,false,level));
 const script=`import json,sys,math\nfor q in json.load(sys.stdin):\n bodies=(["return sum(x <= threshold for x in draws) / len(draws)"] if not q['transfer'] else ["return sum(a <= threshold and b <= threshold for a,b in draws) / len(draws)","return sum(a < threshold for a,b in draws) / len(draws)","return sum(b < threshold for a,b in draws) / len(draws)","return sum(a < threshold or b < threshold for a,b in draws) / len(draws)"])\n for body in bodies:\n  ns={}\n  exec(q['starterCode'].split('\\n')[0]+'\\n    '+body,ns)\n  rejected=False\n  for t in q['testCases']:\n   try: value=eval(q['functionName']+'('+t['input']+')',ns); rejected |= not math.isclose(value,eval(t['expected']),abs_tol=t.get('tolerance',0),rel_tol=0)\n   except Exception as error: raise AssertionError((q['id'],body,error))\n  assert rejected,(q['id'],body)\n`;
 execFileSync('python3',['-c',script],{input:JSON.stringify(questions),encoding:'utf8',timeout:10000});
});
test('every coding template rejects representative conceptual mutations across normal and harder variants',()=>{
 const mutants={
  pnl:['return abs(quantity) * (exit_price-entry_price)','return quantity * (entry_price-exit_price)'],
  break_even_exit:['return entry_price + target_pnl','return entry_price - target_pnl / quantity'],
  expected_value:['return sum(outcomes) / len(outcomes)','return sum(x*p for x,p in zip(outcomes,reversed(probabilities)))'],
  net_value:['return sum(x*p for x,p in zip(outcomes,probabilities))','return sum(x*p for x,p in zip(outcomes,probabilities)) + fee'],
  estimate_probability:['return sum(x <= threshold for x in draws)/len(draws)','return sum(x < threshold for x in draws)'],
  estimate_both:['return sum(a < threshold for a,b in draws)/len(draws)','return sum(a <= threshold and b <= threshold for a,b in draws)/len(draws)'],
  variance:['return sum((x-sum(values)/len(values))**2 for x in values)/(len(values)-1)','return sum(x-sum(values)/len(values) for x in values)/len(values)'],
  shifted_variance:['return sum((x-sum(values)/len(values))**2 for x in values)/len(values)+shift','return sum((x-sum(values)/len(values))**2 for x in values)/(len(values)-1)'],
  call_profit:['return max(spot-strike,0)','return spot-strike-premium'],
  call_spread_profit:['return max(spot-low_strike,0)-net_premium','return max(spot-low_strike,0)+max(spot-high_strike,0)-net_premium']
 };
 const questions=[];for(const s of C.skills.filter(s=>s.mode==='python'))for(const level of [0,1])for(const harder of [false,true])for(let seed=1;seed<=9;seed++)questions.push(C.question(s.id,seed,harder,level));
 const script=`import json,sys,math\ndata=json.load(sys.stdin)\nfor q in data['questions']:\n for body in data['mutants'][q['functionName']]:\n  ns={}\n  exec(q['starterCode'].split('\\n')[0]+'\\n    '+body,ns)\n  rejected=False\n  for t in q['testCases']:\n   value=eval(q['functionName']+'('+t['input']+')',ns)\n   rejected |= not math.isclose(value,eval(t['expected']),abs_tol=t.get('tolerance',0),rel_tol=0)\n  assert rejected,(q['id'],body)\n`;
 execFileSync('python3',['-c',script],{input:JSON.stringify({questions,mutants}),encoding:'utf8',timeout:10000});
});
