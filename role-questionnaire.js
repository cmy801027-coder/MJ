/* Shared, ID-based role scoring and gender visibility. Legacy score arrays remain compatible. */
(function(root){
'use strict';
const groups=['male','female'];
function characters(data,route='any'){
 return groups.filter(g=>route==='any'||g===route).flatMap(g=>(data?.[g]||[]).map((c,i)=>({...c,_group:g,_sourceIndex:i,_scoreId:String(c.id||i)})));
}
function visible(item,route){return route==='any'||!item?.gender||item.gender==='any'||item.gender===route;}
function answers(question,route){return (question?.answers||[]).map((answer,index)=>({answer,index})).filter(x=>visible(x.answer,route));}
function indices(questions,route){return (questions||[]).map((q,index)=>({q,index})).filter(({q})=>visible(q,route)&&((q.type||'single')==='slider'||answers(q,route).length>=((q.type||'single')==='bestWorst'?2:1))).map(x=>x.index);}
function score(owner,key,legacy,c){const v=owner?.[key]?.[c._group]?.[c._scoreId]??(legacy==='mostScore'?owner?.roleScores?.[c._group]?.[c._scoreId]:undefined)??owner?.[legacy]?.[c._sourceIndex]??(legacy==='mostScore'?owner?.score?.[c._sourceIndex]:undefined)??0;const n=Number(v);return Number.isFinite(n)?n:0;}
function vector(data,route,owner,key,legacy){return characters(data,route).map(c=>score(owner,key,legacy,c));}
function setScore(data,owner,key,legacy,c,value){
 if(!owner[key]){owner[key]={male:{},female:{}};for(const role of characters(data))owner[key][role._group][role._scoreId]=score(owner,key,legacy,role);}
 owner[key][c._group]||={};owner[key][c._group][c._scoreId]=Number(value)||0;
}
root.RoleQuestionnaire={characters,visible,answers,indices,score,vector,setScore};
})(typeof window==='object'?window:globalThis);
