const $=s=>document.querySelector(s);
const state={mode:"chat", cfg:JSON.parse(localStorage.getItem("aiHubCfg")||"{}")};
const titles={chat:"ИИ-чат",image:"Генерация изображений",video:"Генерация видео",code:"ИИ-код"};

function updateUI(){
  $("#modeTitle").textContent=titles[state.mode];
  $("#modelBadge").textContent=state.cfg.model||"API не настроен";
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.mode===state.mode));
  $("#prompt").placeholder=state.mode==="image"?"Опиши изображение…":state.mode==="video"?"Опиши видео…":"Напиши любой запрос…";
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;updateUI()});
$("#settingsBtn").onclick=()=>{ $("#apiUrl").value=state.cfg.url||"";$("#apiKey").value=state.cfg.key||"";$("#model").value=state.cfg.model||"";$("#settings").showModal() };
$("#clearKey").onclick=()=>{localStorage.removeItem("aiHubCfg");state.cfg={};updateUI();$("#settings").close()};
$("#settingsForm").onsubmit=e=>{e.preventDefault();state.cfg={url:$("#apiUrl").value.trim().replace(/\/$/,""),key:$("#apiKey").value.trim(),model:$("#model").value.trim()};localStorage.setItem("aiHubCfg",JSON.stringify(state.cfg));updateUI();$("#settings").close()};

function add(text,who="ai",cls=""){const d=document.createElement("div");d.className=`msg ${who} ${cls}`;d.textContent=text;$("#messages").appendChild(d);$("#messages").scrollTop=999999;return d}
async function run(prompt){
  if(!state.cfg.url||!state.cfg.key||!state.cfg.model){add("Сначала откройте «Настройки API» и укажите совместимый AI endpoint, ключ и модель.","ai","error");return}
  const mode=state.mode;
  if(mode==="image"){add("Режим изображения выбран. Для реальной генерации нужен image endpoint вашего провайдера. Этот статический шаблон намеренно не содержит секретных ключей.","ai");return}
  if(mode==="video"){add("Режим видео выбран. GitHub Pages — это интерфейс, а генерация видео выполняется на внешнем AI-сервисе/API.","ai");return}
  const loading=add("Думаю…","ai");
  try{
    const r=await fetch(`${state.cfg.url}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${state.cfg.key}`},body:JSON.stringify({model:state.cfg.model,messages:[{role:"user",content:prompt}],temperature:.7})});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const j=await r.json();loading.textContent=j.choices?.[0]?.message?.content||"Провайдер не вернул текст.";
  }catch(e){loading.textContent="Ошибка подключения: "+e.message}
}
$("#promptForm").onsubmit=e=>{e.preventDefault();const p=$("#prompt").value.trim();if(!p)return;add(p,"user");$("#prompt").value="";run(p)};
$("#prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#promptForm").requestSubmit()}});
updateUI();
