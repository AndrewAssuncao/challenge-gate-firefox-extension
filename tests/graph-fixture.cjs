/* Synthetic evidence fixture for visual tests. Never written to browser storage. */
const E=require('../learning/engine');
const DAY=86400000, now=10*DAY;
const state=E.empty();
function assessments(skillId,{reassessed=false,retained=false,repair=false,due=false}={}) {
 for(let i=0;i<5;i++)state.events.push({kind:'attempt',id:skillId+'-'+i,skillId,contentVersion:2,correct:true,assisted:false,
  stage:retained&&i===4?'review':'check',firstTry:!reassessed,retest:reassessed,
  lessonId:skillId+'-lesson-'+i,semanticKey:skillId+'-item-'+i,familyId:'family-'+i%2,isTransfer:i===4,
  at:(retained&&i<4 || due?1:9)*DAY+i});
 if(repair)state.events.push({kind:'attempt',id:skillId+'-gap',skillId,contentVersion:2,correct:false,assisted:false,
  stage:'check',firstTry:true,retest:false,lessonId:skillId+'-gap',semanticKey:skillId+'-gap',familyId:'family-1',isTransfer:true,at:9*DAY+6});
}
assessments('arith-percent');
assessments('prob-complement',{reassessed:true});
assessments('brain-cases',{retained:true});
assessments('code-pnl',{repair:true});
assessments('arith-fraction',{due:true});
const graph=E.graph(state,now);
module.exports={state,graph,expected:{'arith-percent':'practiced','prob-complement':'practiced (reassessed)','brain-cases':'retained','code-pnl':'needs practice','brain-pigeon':'new','arith-fraction':'practiced'}};
if(require.main===module)console.log(JSON.stringify(graph));
