const DAY = 86400000;
const START = Date.UTC(2026, 10, 23);
const EXAM = Date.UTC(2027, 2, 14);
const DOW = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const DOWS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const HOLIDAYS = {"2026-12-25":"Natal","2027-01-01":"Ano-Novo","2027-02-08":"Carnaval","2027-02-09":"Carnaval"};
const SUBJ = {
  pt:{name:"Português",c:"--c-pt"}, dir:{name:"Direito",c:"--c-dir"}, rl:{name:"Raciocínio Lógico",c:"--c-rl"},
  mat:{name:"Matemática",c:"--c-mat"}, at:{name:"Atualidades",c:"--c-at"}, inf:{name:"Informática",c:"--c-inf"},
  rev:{name:"Revisão",c:"--c-rev"}, sim:{name:"Simulado",c:"--c-sim"}
};
const DIR_AREAS = ["Constitucional","Administrativo","Proc. Penal","Proc. Civil","Penal","Leg. Interna","Revisão geral"];
const PHASES = {1:"Fase 1: Constitucional, Administrativo e fundamentos",2:"Fase 2: Processo Penal e Processo Civil",3:"Fase 3: Processo Civil, Penal e Legislação Interna",4:"Fase 4: simulado, revisão e redação"};

const pad = n => String(n).padStart(2,"0");
const fmt = ts => { const d = new Date(ts); return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth()+1); };
const iso = ts => new Date(ts).toISOString().slice(0,10);
const todayTs = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pctOf = (a,f) => f > 0 ? Math.round(a / f * 100) : null;
const tsFor = (w, d) => START + ((w-1)*7 + d) * DAY;

/* ---------- schedule ---------- */
function blocksFor(w, d){
  const W = WEEKS[w-1]; if(!W) return [];
  const mk = (b, subj, topic, area, extra={}) => ({id:`w${w}-d${d}-b${b}`, w, d, b, subj, topic, area, ...extra});
  const dir = i => {
    if (W.dir === "weak") return mk(0,"dir","Reforço nas matérias de Direito com menos acertos","Revisão geral",{weak:true});
    if (typeof W.dir === "string") return mk(0,"dir",W.dir,"Revisão geral");
    return mk(0,"dir",W.dir[i][1],W.dir[i][0]);
  };
  const pt = i => mk(0,"pt", Array.isArray(W.pt) ? W.pt[i] : W.pt, "Português");
  const set = (b, o) => (o.id = `w${w}-d${d}-b${b}`, o.b = b, o);
  const matSubj = W.matArea === "Atualidades" ? "at" : "mat";
  const even = w % 2 === 0;
  const revTopic = "Revisão do caderno de erros da semana" + (even ? " + 1 redação (até 33 linhas)" : "");
  switch(d){
    case 0: return [set(1,pt(0)), set(2,dir(0))];
    case 1: return [set(1,dir(1)), mk(2,"rl",W.rl,"Raciocínio Lógico")];
    case 2: return [set(1,pt(1)), set(2,dir(2))];
    case 3: return [set(1,dir(3)), mk(2,matSubj,W.mat,matSubj==="at"?"Atualidades":"Matemática")];
    case 4: return [set(1,dir(4)), set(2,pt(2))];
    case 5:
      if (W.lastSat) return [];
      return [mk(1,"inf",W.inf,"Informática"), mk(2,"rev",revTopic,"Revisão",{redacao:even})];
    case 6:
      if (W.sunday) return [mk(1,W.sunday.subj,W.sunday.topic,"Simulado")];
      return [];
  }
  return [];
}
const ALL = [];
for (let w=1; w<=16; w++) for (let d=0; d<7; d++) blocksFor(w,d).forEach(b => ALL.push(b));
const BY_ID = Object.fromEntries(ALL.map(b => [b.id,b]));

/* ---------- storage ---------- */
const KEY = "tjsp-escrevente-v1";
let storageOk = true;
let S = {done:{}, q:{}, notes:{}};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) S = Object.assign(S, JSON.parse(raw));
  localStorage.setItem(KEY + "-test", "1"); localStorage.removeItem(KEY + "-test");
} catch(e){ storageOk = false; }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ storageOk = false; renderWarn(); } }

/* ---------- ui state ---------- */
let tab = "hoje";
let viewTs = Math.min(Math.max(todayTs(), START), EXAM);
const openWeeks = new Set();
let freshStamp = null;

function weekOf(ts){ const diff = Math.floor((ts - START)/DAY); return {w: Math.floor(diff/7)+1, d: ((diff%7)+7)%7}; }
function currentWeek(){ const t = todayTs(); if (t < START) return 1; if (t >= EXAM) return 16; return weekOf(t).w; }

function stats(filter = () => true){
  let f=0,a=0;
  for (const [id,v] of Object.entries(S.q)) { const b = BY_ID[id]; if (!b || !filter(b)) continue; f += +v.f||0; a += +v.a||0; }
  return {f,a,p:pctOf(a,f)};
}

/* ---------- header ---------- */
function renderHeader(){
  const t = todayTs();
  const days = Math.round((EXAM - t)/DAY);
  const doneN = ALL.filter(b => S.done[b.id]).length;
  let wk = t < START ? "Começa em 23/11" : t > EXAM ? "Cronograma concluído" : `Semana <strong>${currentWeek()}</strong> de 16`;
  let cd = days > 1 ? `Faltam <strong>${days} dias</strong> para a prova` : days === 1 ? "A prova é <strong>amanhã</strong>" : days === 0 ? "<strong>Hoje é dia de prova</strong>" : "Prova realizada em 14/03/2027";
  document.getElementById("status").innerHTML = `<span>${wk}</span><span>${cd}</span><span><strong>${doneN}</strong> de ${ALL.length} blocos feitos</span>`;
  document.getElementById("overallBar").style.width = (doneN/ALL.length*100).toFixed(1) + "%";
}
function renderWarn(){
  document.getElementById("warn").innerHTML = storageOk ? "" :
    `<div class="warnbar">Este navegador não está guardando seu progresso. Abra o arquivo no Chrome, Edge ou Safari. Antes de fechar, use <b>Notas › Baixar backup</b> para não perder o que marcou.</div>`;
}

/* ---------- Today ---------- */
function blockCard(b){
  const s = SUBJ[b.subj]; const done = S.done[b.id]; const q = S.q[b.id] || {};
  const p = pctOf(+q.a||0, +q.f||0);
  let topic = esc(b.topic);
  if (b.weak){
    const weak = weakest(2);
    topic += weak.length ? `<br><span style="font:500 15px var(--sans);color:var(--muted)">Pelos seus registros: ${weak.map(x=>esc(x.k)).join(" e ")}</span>` : "";
  }
  const label = b.subj === "dir" && b.area !== "Revisão geral" ? `${s.name}: ${b.area}` : s.name;
  return `<article class="block ${done?"done":""}" style="--c:var(${s.c})" data-id="${b.id}">
    ${done ? `<div class="stamp ${freshStamp===b.id?"fresh":""}" aria-hidden="true">FEITO<small>${fmt(done)}</small></div>` : ""}
    <div class="meta"><span>Bloco ${b.b}</span><span class="subj">${esc(label)}</span></div>
    <h3>${topic}</h3>
    <div class="qrow">
      <label>Questões<input type="number" inputmode="numeric" min="0" data-q="f" value="${q.f??""}" aria-label="Questões feitas"></label>
      <label>Acertos<input type="number" inputmode="numeric" min="0" data-q="a" value="${q.a??""}" aria-label="Acertos"></label>
      <span class="pct ${p===null?"":p>=70?"good":p>=50?"mid":"bad"}">${p===null?"":p+"%"}</span>
      <button class="markbtn" data-act="toggle">${done?"Desmarcar":"Marcar como feito"}</button>
      <div class="err" role="status"></div>
    </div>
  </article>`;
}
function renderToday(){
  const {w,d} = weekOf(viewTs);
  const isToday = viewTs === todayTs();
  const date = fmt(viewTs);
  let html = `<div class="daynav"><div><h2>${isToday?"Hoje, ":""}${DOW[d]}, ${date}</h2><div class="sub">Semana ${w} de 16</div></div>
    <div class="navbtns"><button class="iconbtn" data-nav="-1" aria-label="Dia anterior" ${viewTs<=START?"disabled":""}>‹</button>
    <button class="iconbtn" data-nav="1" aria-label="Próximo dia" ${viewTs>=EXAM?"disabled":""}>›</button></div></div>`;
  if (!isToday) html += `<p class="note"><button class="linkbtn" data-nav="today">Voltar para hoje</button></p>`;
  const hol = HOLIDAYS[iso(viewTs)];
  if (hol) html += `<p class="note holiday">${hol}. Se folgar hoje, siga o plano no próximo dia sem tentar compensar.</p>`;
  if (viewTs === EXAM){
    html += `<div class="exam"><h3>Dia da prova</h3><p>Objetiva (70 questões) e redação, no período da tarde, com 5 horas no total. Leve documento original com foto e caneta de tinta preta. Confira o local na área do candidato da Vunesp.</p><p>Mínimos: 8 de 16 em Português, 15 de 30 em Direito e 35 acertos no total.</p></div>`;
    return html;
  }
  const blocks = blocksFor(w,d);
  if (!blocks.length){
    const lastSat = WEEKS[w-1]?.lastSat && d===5;
    html += `<div class="empty"><h3>${lastSat?"Descanso total":"Domingo é descanso"}</h3>${lastSat?"A prova é amanhã. Separe documento e caneta, durma cedo e não estude hoje.":"Nada para hoje. Se quiser, revise alguns cards do Anki."}</div>`;
    return html;
  }
  html += blocks.map(blockCard).join("");
  html += `<p class="method">Em cada bloco: 20 min de teoria, 30 min de questões da Vunesp e 10 min anotando os erros no caderno e no Anki.</p>`;
  return html;
}

/* ---------- Schedule ---------- */
function renderCrono(){
  const cw = currentWeek();
  if (!openWeeks.size) openWeeks.add(cw);
  let html = "", ph = 0;
  for (const W of WEEKS){
    if (W.ph !== ph){ ph = W.ph; html += `<h2 class="phase">${PHASES[ph]}</h2>`; }
    const wb = ALL.filter(b => b.w === W.n);
    const dn = wb.filter(b => S.done[b.id]).length;
    const s = tsFor(W.n,0), e = tsFor(W.n,5);
    html += `<details class="week ${W.n===cw?"current":""}" data-week="${W.n}" ${openWeeks.has(W.n)?"open":""}>
      <summary><span class="wk-title">Semana ${W.n}${W.n===cw?"<em>atual</em>":""}</span>
      <span class="wk-count"><b>${dn}</b> de ${wb.length}</span>
      <span class="wk-dates">${fmt(s)} a ${fmt(e)}</span>
      <span class="wk-bar"><span style="width:${(dn/wb.length*100).toFixed(0)}%"></span></span></summary><div class="wk-body">`;
    for (let d=0; d<7; d++){
      const bl = blocksFor(W.n,d); if (!bl.length) continue;
      html += `<div class="dayhead">${DOWS[d]} ${fmt(tsFor(W.n,d))}${HOLIDAYS[iso(tsFor(W.n,d))]?" (feriado)":""}</div>`;
      for (const b of bl){
        const sj = SUBJ[b.subj];
        html += `<label class="row ${S.done[b.id]?"is-done":""}" style="--c:var(${sj.c})"><input type="checkbox" data-check="${b.id}" ${S.done[b.id]?"checked":""}><span class="s">${esc(sj.name)}</span><span class="t">${esc(b.topic)}</span></label>`;
      }
    }
    html += `</div></details>`;
  }
  return html;
}

/* ---------- Performance ---------- */
function weakest(n){
  const rows = [...DIR_AREAS.filter(a=>a!=="Revisão geral"), "Português","Raciocínio Lógico","Matemática","Informática"]
    .map(k => ({k, ...stats(b => b.area === k)})).filter(r => r.f >= 10 && r.p < 70);
  return rows.sort((x,y)=>x.p-y.p).slice(0,n);
}
function minBox(label, st, minTxt){
  let cls="", msg="Registre questões para acompanhar.";
  if (st.p !== null){
    if (st.p < 50){ cls="bad"; msg="Abaixo do mínimo de 50%. Dê prioridade a esta matéria."; }
    else if (st.p < 70){ cls="mid"; msg="Acima do mínimo. Meta: 70% ou mais."; }
    else { cls="good"; msg="Na meta. Continue assim."; }
  }
  return `<div class="min"><div class="lbl">${label}</div><div class="v ${cls}">${st.p===null?"–":st.p+"%"}</div><div class="msg">${msg}</div><div class="lbl" style="margin-top:4px">${st.f?`${st.a} de ${st.f} questões. `:""}${minTxt}</div></div>`;
}
function perfRow(name, st, sub=false){
  const color = st.p===null ? "var(--line)" : st.p>=70 ? "var(--ok)" : st.p>=50 ? "var(--warn)" : "var(--stamp)";
  return `<tr class="${sub?"sub":""}"><td>${esc(name)}</td><td class="n">${st.a}/${st.f}</td><td class="n"><b>${st.p===null?"–":st.p+"%"}</b></td><td style="width:32%"><div class="bar"><span style="width:${st.p??0}%;background:${color}"></span></div></td></tr>`;
}
function renderPerf(){
  const t = todayTs();
  const due = ALL.filter(b => tsFor(b.w,b.d) < t);
  const late = due.filter(b => !S.done[b.id]);
  const doneN = ALL.filter(b => S.done[b.id]).length;
  const pt = stats(b => b.area === "Português");
  const dir = stats(b => b.subj === "dir");
  let html = `<div class="card"><h2>Blocos de estudo</h2><div class="big">${doneN} <span style="font-size:18px;color:var(--muted);font-weight:500">de ${ALL.length}</span></div>
    <p style="margin:8px 0 0">${due.length===0?"Nenhum bloco atrasado. Os blocos de hoje estão na aba Hoje.":late.length===0?`<span class="good">Você está em dia com o cronograma.</span>`:`<span class="mid">${late.length} ${late.length===1?"bloco atrasado":"blocos atrasados"}</span> até hoje. Veja no Cronograma o que ficou para trás e encaixe nos sábados.`}</p></div>`;
  html += `<div class="card"><h2>Mínimos da prova</h2><div class="mins">${minBox("Português",pt,"Mínimo: 8 de 16.")}${minBox("Direito",dir,"Mínimo: 15 de 30.")}</div></div>`;
  html += `<div class="card"><h2>Acertos por matéria</h2><div class="tablewrap"><table class="perf"><thead><tr><th>Matéria</th><th style="text-align:right">Acertos</th><th style="text-align:right">%</th><th>A linha marca 50%</th></tr></thead><tbody>`;
  html += perfRow("Português", pt);
  html += perfRow("Direito (total)", dir);
  for (const a of DIR_AREAS) html += perfRow(a, stats(b => b.subj==="dir" && b.area===a), true);
  for (const k of ["Informática","Raciocínio Lógico","Matemática","Atualidades","Simulado"]) html += perfRow(k, stats(b => b.area===k));
  html += `</tbody></table></div>`;
  const wk = weakest(2);
  html += `<p style="margin:12px 0 0;font-size:14px;color:var(--muted)">${wk.length?`Abaixo da meta de 70%: <b style="color:var(--ink)">${wk.map(x=>esc(x.k)+" ("+x.p+"%)").join(" e ")}</b>. ${wk.length>1?"Essas matérias pedem":"Essa matéria pede"} mais questões e revisão.`:"Matérias abaixo da meta de 70% aparecem aqui depois de 10 questões registradas em cada uma."}</p></div>`;
  return html;
}

/* ---------- Notes ---------- */
let notesWeek = null;
let armed = false;
function renderNotes(){
  if (notesWeek === null) notesWeek = currentWeek();
  const N = S.notes[notesWeek] || {};
  const c = N.chk || {};
  const st = stats(b => b.w === notesWeek);
  const opts = WEEKS.map(W => `<option value="${W.n}" ${W.n===notesWeek?"selected":""}>Semana ${W.n} (${fmt(tsFor(W.n,0))} a ${fmt(tsFor(W.n,5))})</option>`).join("");
  const chk = [["anki","Fiz o Anki todos os dias"],["manch","Li as manchetes do dia (Atualidades)"],["erros","Revisei o caderno de erros no sábado"],["red","Fiz a redação (semanas pares)"]];
  return `<div class="card"><h2>Anotações da semana</h2>
    <div class="field"><label for="wsel">Semana</label><select id="wsel">${opts}</select></div>
    <p style="margin:0 0 14px">Acertos registrados nesta semana: <b>${st.f?`${st.a} de ${st.f} (${st.p}%)`:"nenhuma questão ainda"}</b></p>
    <div class="checks field">${chk.map(([k,l])=>`<label><input type="checkbox" data-chk="${k}" ${c[k]?"checked":""}>${l}</label>`).join("")}</div>
    <div class="field"><label for="n-rev">O que preciso revisar</label><textarea id="n-rev" data-note="rev">${esc(N.rev)}</textarea></div>
    <div class="field"><label for="n-duv">Minhas dúvidas</label><textarea id="n-duv" data-note="duv">${esc(N.duv)}</textarea></div>
    <div class="field"><label for="n-meta">Meta da próxima semana</label><textarea id="n-meta" data-note="meta">${esc(N.meta)}</textarea></div>
    <div class="saved" id="saved" role="status"></div></div>
    <div class="card"><h2>Seus dados</h2>
    <p style="margin:0 0 12px;font-size:14px;color:var(--muted)">O progresso fica salvo só neste navegador. Baixe um backup de vez em quando, para não perder nada se limpar o navegador ou trocar de aparelho.</p>
    <div class="btnrow"><button class="btn" data-act="export">Baixar backup</button>
    <button class="btn" data-act="import">Restaurar backup</button>
    <button class="btn danger ${armed?"armed":""}" data-act="reset">${armed?"Confirmar: apagar tudo":"Apagar tudo"}</button></div>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
    <div class="saved" id="dataMsg" role="status"></div></div>`;
}

/* ---------- render & events ---------- */
function render(){
  renderHeader(); renderWarn();
  const v = document.getElementById("view");
  v.innerHTML = tab==="hoje" ? renderToday() : tab==="crono" ? renderCrono() : tab==="desemp" ? renderPerf() : renderNotes();
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab===tab ? "page" : "false"));
  freshStamp = null;
}
document.querySelector("nav.tabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-tab]"); if (!b) return;
  tab = b.dataset.tab; armed = false; render(); window.scrollTo(0,0);
});
const view = document.getElementById("view");
view.addEventListener("click", e => {
  const nav = e.target.closest("[data-nav]");
  if (nav){
    const v = nav.dataset.nav;
    viewTs = v==="today" ? Math.min(Math.max(todayTs(),START),EXAM) : Math.min(Math.max(viewTs + (+v)*DAY, START), EXAM);
    render(); return;
  }
  const act = e.target.closest("[data-act]"); if (!act) return;
  const a = act.dataset.act;
  if (a === "toggle"){
    const id = act.closest(".block").dataset.id;
    if (S.done[id]) delete S.done[id]; else { S.done[id] = todayTs(); freshStamp = id; }
    save(); render();
  } else if (a === "export"){
    const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `backup-estudos-tjsp-${iso(todayTs())}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    document.getElementById("dataMsg").textContent = "Backup baixado.";
  } else if (a === "import"){
    document.getElementById("importFile").click();
  } else if (a === "reset"){
    if (!armed){ armed = true; render(); return; }
    S = {done:{}, q:{}, notes:{}}; armed = false; save(); render();
    document.getElementById("dataMsg").textContent = "Tudo apagado.";
  }
});
view.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.q){
    const card = t.closest(".block"), id = card.dataset.id;
    const fEl = card.querySelector('[data-q="f"]'), aEl = card.querySelector('[data-q="a"]');
    const f = fEl.value === "" ? "" : Math.max(0, Math.floor(+fEl.value));
    const a = aEl.value === "" ? "" : Math.max(0, Math.floor(+aEl.value));
    const err = card.querySelector(".err");
    if (f !== "" && a !== "" && a > f){ err.textContent = "Os acertos não podem passar do total de questões."; return; }
    err.textContent = "";
    if (f === "" && a === "") delete S.q[id]; else S.q[id] = {f: f===""?0:f, a: a===""?0:a};
    save();
    const p = pctOf(+S.q[id]?.a||0, +S.q[id]?.f||0);
    const pe = card.querySelector(".pct");
    pe.textContent = p===null ? "" : p + "%";
    pe.className = "pct " + (p===null?"":p>=70?"good":p>=50?"mid":"bad");
  } else if (t.dataset.check){
    const id = t.dataset.check;
    if (t.checked) S.done[id] = todayTs(); else delete S.done[id];
    save(); render();
  } else if (t.id === "wsel"){
    notesWeek = +t.value; render();
  } else if (t.dataset.chk){
    S.notes[notesWeek] = S.notes[notesWeek] || {};
    S.notes[notesWeek].chk = S.notes[notesWeek].chk || {};
    S.notes[notesWeek].chk[t.dataset.chk] = t.checked; save();
  } else if (t.id === "importFile" && t.files[0]){
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d !== "object" || !d.done || !d.q) throw 0;
        S = {done:d.done||{}, q:d.q||{}, notes:d.notes||{}}; save(); render();
        document.getElementById("dataMsg").textContent = "Backup restaurado.";
      } catch(err){ document.getElementById("dataMsg").textContent = "Este arquivo não é um backup deste app. Escolha o arquivo .json que você baixou em “Baixar backup”."; }
    };
    r.readAsText(t.files[0]);
  }
});
view.addEventListener("input", e => {
  const t = e.target; if (!t.dataset.note) return;
  S.notes[notesWeek] = S.notes[notesWeek] || {};
  S.notes[notesWeek][t.dataset.note] = t.value; save();
  const s = document.getElementById("saved"); if (s) s.textContent = "Salvo.";
});
view.addEventListener("toggle", e => {
  const d = e.target.closest("details.week"); if (!d) return;
  const n = +d.dataset.week; if (d.open) openWeeks.add(n); else openWeeks.delete(n);
}, true);
render();
