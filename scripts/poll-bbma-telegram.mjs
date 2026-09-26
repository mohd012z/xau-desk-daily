import process from 'node:process';
import fs from 'node:fs';
import {handleTelegramCallback} from '../macro/bbma/telegram-callback-runtime.mjs';

const token=process.env.TELEGRAM_BOT_TOKEN;
const allowedChat=String(process.env.TELEGRAM_CHAT_ID??'');
const ledgerPath=process.env.BBMA_OBSERVATION_LEDGER??'data/bbma-observations.json';
if(!token||!allowedChat){console.error('Telegram secrets are not configured');process.exit(2);}

const api=async(method,payload={})=>{
 const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.ok!==true){const e=new Error(`Telegram ${method} failed (${r.status}/${j?.error_code??'unknown'})`);e.status=r.status;e.telegramCode=j?.error_code;e.description=j?.description??'';throw e;}
 return j.result;
};

const loadLedger=()=>{
 try{const raw=JSON.parse(fs.readFileSync(ledgerPath,'utf8')); const rows=Array.isArray(raw)?raw:(raw.observations??[]); return new Map(rows.map(x=>[String(x.alert_id??x.observation_id??x.id),x]));}
 catch{return new Map();}
};
const ledger=loadLedger();
const getObservation=id=>ledger.get(String(id))??null;
const getCurrentStatus=obs=>({direction:obs?.bbma?.direction??obs?.direction??'UNAVAILABLE',readiness:obs?.bbma?.readiness??obs?.readiness??'UNAVAILABLE'});
const answerCallback=async({callbackQueryId,text})=>{
 try{return await api('answerCallbackQuery',{callback_query_id:callbackQueryId,text,show_alert:false});}
 catch(e){
   // Telegram rejects old callback_query ids after their acknowledgement window. A stale queued
   // callback must not kill the receiver or prevent a fresh button press from being processed.
   if(e.status===400){console.log('Skipped stale/invalid callback acknowledgement');return false;}
   throw e;
 }
};
const respond=({chatId,text,parse_mode})=>api('sendMessage',{chat_id:chatId,text,parse_mode});

let offset=Number(process.env.TELEGRAM_OFFSET??0);
const deadline=Date.now()+Math.min(Number(process.env.POLL_WINDOW_MS??45000),55000);
while(Date.now()<deadline){
 const updates=await api('getUpdates',{offset,timeout:10,allowed_updates:['callback_query']});
 for(const u of updates){
   offset=Math.max(offset,Number(u.update_id)+1);
   const chat=String(u.callback_query?.message?.chat?.id??'');
   if(chat!==allowedChat){
     if(u.callback_query?.id) await answerCallback({callbackQueryId:u.callback_query.id,text:'Unauthorized chat'});
     continue;
   }
   try{await handleTelegramCallback({update:u,getObservation,getCurrentStatus,answerCallback,respond});}
   catch(e){console.error(`Callback processing failed: ${e.message}`);}
 }
}
console.log(`Telegram callback polling completed; next_offset=${offset}`);
