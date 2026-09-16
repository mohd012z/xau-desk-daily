const clean=n=>Number(Number(n).toPrecision(15));
export function classicPivots({high,low,close}){
 const H=Number(high),L=Number(low),C=Number(close); if(![H,L,C].every(Number.isFinite)||H<L) return null;
 const p=(H+L+C)/3;
 return {pivot:clean(p),r1:clean(2*p-L),s1:clean(2*p-H),r2:clean(p+(H-L)),s2:clean(p-(H-L)),r3:clean(H+2*(p-L)),s3:clean(L-2*(H-p))};
}
export function findPivotConfluence({pivots,band,pressure='MIXED'}){
 if(!pivots||!Array.isArray(band)||band.length<2) return {status:'INSUFFICIENT_DATA',level:null,price:null};
 const lo=Math.min(...band.map(Number)),hi=Math.max(...band.map(Number));
 const names=pressure==='DOWN_PRESSURE'?['s1','s2','s3','pivot']:pressure==='UP_PRESSURE'?['r1','r2','r3','pivot']:['pivot','s1','r1','s2','r2','s3','r3'];
 for(const name of names){const price=Number(pivots[name]);if(Number.isFinite(price)&&price>=lo&&price<=hi)return {status:'CONFLUENCE',level:name.toUpperCase(),price};}
 return {status:'NO_PIVOT_CONFLUENCE',level:null,price:null};
}