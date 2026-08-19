const $=s=>document.querySelector(s);
const modes=[...document.querySelectorAll(".mode")], input=$("#query"), results=$("#results"), status=$("#status");
let mode="all";

const placeholders={
 all:"Введите ФИО, IP, номер или username",
 name:"Например: Иван Иванов",
 ip:"Например: 8.8.8.8",
 phone:"Например: +7 900 000-00-00",
 social:"Например: username"
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const enc=s=>encodeURIComponent(s);
const exact=s=>encodeURIComponent('"'+s.trim()+'"');

function link(name,url,desc){return `<a class="link" href="${url}" target="_blank" rel="noopener noreferrer"><strong>${name}</strong><small>${desc}</small></a>`}
function card(title,badge,body){return `<article class="panel card"><div class="card-head"><div class="card-title">${title}</div><span class="badge">${badge}</span></div>${body}</article>`}

function detect(q){
 const s=q.trim();
 if(mode!=="all") return mode;
 if(/^https?:\/\//i.test(s)) return "url";
 if(/^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)$/.test(s)) return "ip";
 if(/^\+?\d[\d\s().-]{7,}$/.test(s)) return "phone";
 if(/^[A-Za-z0-9._-]{2,40}$/.test(s)) return "social";
 return "name";
}

function render(q){
 const type=detect(q), e=esc(q), x=enc(q), ex=exact(q);
 let html=card("QUERY","INPUT",`<div class="value">${e}</div><p class="muted">Тип запроса: ${type.toUpperCase()}. Ниже сформированы переходы к открытым источникам, релевантным введённым данным.</p>`);

 if(type==="ip"){
   html+=card("IP INTELLIGENCE","PUBLIC",`<div class="links">
   ${link("Google","https://www.google.com/search?q="+x,"web search")}
   ${link("Bing","https://www.bing.com/search?q="+x,"web search")}
   ${link("Shodan","https://www.shodan.io/search?query="+x,"public infrastructure search")}
   ${link("AbuseIPDB","https://www.abuseipdb.com/check/"+x,"IP reputation")}
   ${link("ARIN WHOIS","https://search.arin.net/rdap/?query="+x,"registry / RDAP")}
   ${link("RIPEstat","https://stat.ripe.net/app/launchpad?resource="+x,"network information")}
   </div>`);
 } else if(type==="phone"){
   html+=card("PHONE / PUBLIC WEB","EXACT",`<div class="links">
   ${link("Google","https://www.google.com/search?q="+ex,"exact public-web search")}
   ${link("Bing","https://www.bing.com/search?q="+ex,"exact public-web search")}
   ${link("Yandex","https://yandex.com/search/?text="+ex,"exact public-web search")}
   ${link("Google Maps","https://www.google.com/maps/search/"+x,"public places search")}
   </div>`);
 } else if(type==="social"){
   const u=x;
   html+=card("USERNAME / SOCIAL","PUBLIC",`<div class="links">
   ${link("GitHub","https://github.com/"+u,"profile shortcut")}
   ${link("Reddit","https://www.reddit.com/user/"+u,"profile shortcut")}
   ${link("GitLab","https://gitlab.com/"+u,"profile shortcut")}
   ${link("Google","https://www.google.com/search?q="+ex,"web search")}
   ${link("Bing","https://www.bing.com/search?q="+ex,"web search")}
   ${link("Yandex","https://yandex.com/search/?text="+ex,"web search")}
   </div>`);
 } else if(type==="url"){
   html+=card("URL / DOMAIN","PUBLIC",`<div class="links">
   ${link("Google","https://www.google.com/search?q="+x,"web search")}
   ${link("VirusTotal","https://www.virustotal.com/gui/search/"+x,"public URL/domain intelligence")}
   ${link("URLScan","https://urlscan.io/search/#"+x,"public scan search")}
   ${link("SecurityTrails","https://securitytrails.com/domain/"+x,"domain information")}
   </div>`);
 } else {
   html+=card("FULL NAME / PUBLIC WEB","EXACT",`<div class="links">
   ${link("Google","https://www.google.com/search?q="+ex,"exact public-web search")}
   ${link("Bing","https://www.bing.com/search?q="+ex,"exact public-web search")}
   ${link("Yandex","https://yandex.com/search/?text="+ex,"exact public-web search")}
   ${link("Google News","https://www.google.com/search?tbm=nws&q="+ex,"news search")}
   ${link("Google Images","https://www.google.com/search?tbm=isch&q="+ex,"image search")}
   ${link("LinkedIn search","https://www.google.com/search?q="+encodeURIComponent("site:linkedin.com/in "+q),"public profile search")}
   </div>`);
 }

 html+=card("QUERY DETAILS","LIVE",`<div class="two">
 <div><div class="muted">Введено</div><div class="value">${e}</div></div>
 <div><div class="muted">Обработано</div><div class="value">${new Date().toLocaleString("ru-RU")}</div></div>
 </div>`);
 html+=card("USAGE NOTICE","OSINT",`<p class="muted">Используйте только законные открытые источники и соблюдайте правила сервисов. Этот статический сайт не получает пароли, приватные профили или закрытые базы.</p>`);
 results.innerHTML=html;
 status.classList.remove("hidden");
 status.textContent=`SEARCH COMPLETE  //  ${type.toUpperCase()}  //  ${q}`;
 results.scrollIntoView({behavior:"smooth",block:"start"});
}

modes.forEach(btn=>btn.addEventListener("click",()=>{
 modes.forEach(x=>x.classList.remove("active"));btn.classList.add("active");
 mode=btn.dataset.mode;input.placeholder=placeholders[mode];
}));
$("#searchForm").addEventListener("submit",e=>{e.preventDefault();const q=input.value.trim();if(q)render(q);});
$("#clearBtn").addEventListener("click",()=>{input.value="";results.innerHTML=`<div class="panel welcome"><div class="signal">◉</div><h2>READY FOR QUERY</h2><p>Введите данные выше. После запроса система сформирует релевантные публичные источники.</p></div>`;status.classList.add("hidden");input.focus();});
