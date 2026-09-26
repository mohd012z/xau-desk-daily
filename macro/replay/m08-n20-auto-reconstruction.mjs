import { detectM08N20 } from '../temporal/m08-n20-detector.mjs';
import { buildM08Checkpoint } from '../temporal/m08-n20-checkpoints.mjs';
import { classifyM08N20Relation } from '../temporal/m08-n20-relation.mjs';
import { validateM08N20Policy } from '../temporal/m08-n20-policy.mjs';

function deepFreeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))deepFreeze(x);return Object.freeze(v)}

export function reconstructTemporalDay({mytDate,candles,policy}){
 const p=validateM08N20Policy(policy);
 const source=structuredClone(candles??[]);
 const m08=detectM08N20({setupId:'M08',mytDate,candles:source,policy:p});
 const n20=detectM08N20({setupId:'N20',mytDate,candles:source,policy:p});
 const at1130=buildM08Checkpoint({checkpoint:'11:30',m08,candles:source,policy:p});
 const at1800=buildM08Checkpoint({checkpoint:'18:00',m08,candles:source,policy:p});
 const relation=classifyM08N20Relation(m08,n20);
 return deepFreeze({schemaVersion:'m08-n20-auto-reconstruction-v1',mytDate,m08,checkpoints:{at1130,at1800},n20,relation});
}
