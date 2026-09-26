import process from 'node:process';

const token=process.env.TELEGRAM_BOT_TOKEN;
const chatId=process.env.TELEGRAM_CHAT_ID;
if(!token||!chatId){
  console.error('Telegram secrets are not configured');
  process.exit(2);
}

const payload={
  chat_id:chatId,
  parse_mode:'HTML',
  text:[
    '🧪 <b>XAUUSD — BBMA TELEGRAM TEST</b>',
    '',
    'Mode: SHADOW / EVIDENCE ONLY',
    'Status: Telegram transport connected',
    'News: context/gate only',
    '',
    'No broker execution.'
  ].join('\n'),
  reply_markup:{inline_keyboard:[
    [{text:'📊 MTF Detail',callback_data:'bbma:mtf:transport-test'},{text:'📰 News',callback_data:'bbma:news:transport-test'}],
    [{text:'🔬 Evidence',callback_data:'bbma:evidence:transport-test'},{text:'🔄 Current Status',callback_data:'bbma:status:transport-test'}]
  ]}
};

const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
});
const result=await response.json().catch(()=>null);
if(!response.ok||result?.ok!==true){
  console.error(`Telegram delivery failed (HTTP ${response.status}, code ${result?.error_code??'unknown'})`);
  process.exit(1);
}
console.log(`Telegram delivery succeeded; message_id=${result.result?.message_id??'unknown'}`);
