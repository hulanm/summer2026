// script.js - minimal, fixed 1¢/min pledge, local-only
(() => {
  const CONFIG = { startDate: '2026-06-28', endDate: '2026-09-10' }
  const KEY_LOGS = 'sr_logs_v2'
  const KEY_PLEDGES = 'sr_pledges_v2'
  const PLEDGE_RATE = 0.01 // fixed $0.01 per minute

  const $ = s => document.querySelector(s), $all = s => [...document.querySelectorAll(s)]
  const todayISO = () => new Date().toISOString().slice(0,10)
  const formatCurrency = n => `$${Number(n||0).toFixed(2)}`
  const dateDiffDays = (a,b) => Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/(1000*60*60*24))
  const inclusiveDays = (a,b) => dateDiffDays(a,b) + 1

  const start = CONFIG.startDate, end = CONFIG.endDate
  const totalDays = inclusiveDays(start,end)
  $('#datesText').textContent = `${start} — ${end} (configurable)`

  const refs = {
    daysValue: $('#daysValue'),
    totalMinutes: $('#totalMinutes'),
    pledgedValue: $('#pledgedValue'),
    progressArc: $('#progressArc'),
    progressPercent: $('#progressPercent'),
    targetSoFar: $('#targetSoFar'),
    recentLogs: $('#recentLogs'),
    btnLog: $('#btnLog'),
    btnPledge: $('#btnPledge'),
    btnExport: $('#btnExport'),
    modalLog: $('#modalLog'),
    modalPledge: $('#modalPledge'),
    logDate: $('#logDate'),
    logRead: $('#logRead'),
    logWrite: $('#logWrite'),
    logNotes: $('#logNotes'),
    pledgeName: $('#pledgeName'),
    pledgeEmail: $('#pledgeEmail'),
    estimatedPayout: $('#estimatedPayout')
  }

  const load = (k) => JSON.parse(localStorage.getItem(k) || '[]')
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v))

  function openModal(m){ m.classList.remove('hidden'); m.setAttribute('aria-hidden','false') }
  function closeModal(m){ m.classList.add('hidden'); m.setAttribute('aria-hidden','true') }

  refs.logDate.value = todayISO()
  refs.logRead.value = 15
  refs.logWrite.value = 15

  refs.btnLog.onclick = () => openModal(refs.modalLog)
  refs.btnPledge.onclick = () => openModal(refs.modalPledge)
  refs.btnExport.onclick = exportCSV
  $('#logCancel').onclick = () => closeModal(refs.modalLog)
  $('#pledgeCancel').onclick = () => closeModal(refs.modalPledge)
  $('#logSave').onclick = saveLog
  $('#pledgeSave').onclick = savePledge

  function saveLog(){
    const date = refs.logDate.value
    const read = Math.max(0, Number(refs.logRead.value||0))
    const write = Math.max(0, Number(refs.logWrite.value||0))
    if (!date) return alert('Pick a date')
    let logs = load(KEY_LOGS)
    const idx = logs.findIndex(l=>l.date===date)
    const entry = { date, read, write, notes: refs.logNotes.value||'', updatedAt: new Date().toISOString() }
    if (idx >= 0) logs[idx] = entry; else logs.push(entry)
    logs.sort((a,b)=>b.date.localeCompare(a.date))
    save(KEY_LOGS, logs)
    closeModal(refs.modalLog); render()
  }

  function savePledge(){
    const name = refs.pledgeName.value.trim() || 'Anonymous'
    const email = refs.pledgeEmail.value.trim()
    const pledges = load(KEY_PLEDGES)
    // record as per-minute pledge with fixed rate
    pledges.push({ id: Date.now(), name, email, type: 'permin', rate: PLEDGE_RATE, createdAt: new Date().toISOString() })
    save(KEY_PLEDGES, pledges)
    closeModal(refs.modalPledge); render()
  }

  function compute(){
    const logs = load(KEY_LOGS)
    const inRange = logs.filter(l => l.date >= start && l.date <= end)
    const totalMinutes = inRange.reduce((s,l)=>s + Number(l.read||0) + Number(l.write||0), 0)
    const now = new Date().toISOString().slice(0,10)
    const elapsedEnd = now < start ? start : (now > end ? end : now)
    const elapsed = elapsedEnd < start ? 0 : inclusiveDays(start, elapsedEnd)
    const targetSoFar = elapsed * 30
    const pledges = load(KEY_PLEDGES)
    const pledgedEstimate = pledges.reduce((acc,p) => acc + (Number(p.rate||0) * totalMinutes), 0)
    const fullChallengeMinutes = inclusiveDays(start,end) * 30
    const fullChallengePayout = pledges.length * (PLEDGE_RATE * fullChallengeMinutes)
    return { logs, pledges, totalMinutes, elapsed, targetSoFar, pledgedEstimate, fullChallengePayout }
  }

  function render(){
    const { logs, pledges, totalMinutes, elapsed, targetSoFar, pledgedEstimate, fullChallengePayout } = compute()
    refs.daysValue.textContent = `${elapsed} / ${totalDays}`
    refs.totalMinutes.textContent = totalMinutes
    refs.pledgedValue.textContent = formatCurrency(pledgedEstimate)
    refs.targetSoFar.textContent = `${targetSoFar} min`
    refs.estimatedPayout.textContent = formatCurrency(fullChallengePayout)
    const percent = targetSoFar > 0 ? Math.round((totalMinutes / targetSoFar) * 100) : 0
    refs.progressArc.setAttribute('stroke-dasharray', `${Math.min(100, percent)},100`)
    refs.progressPercent.textContent = `${Math.min(100, percent)}%`

    const ul = refs.recentLogs; ul.innerHTML = ''
    logs.slice(0,8).forEach(l => {
      const li = document.createElement('li')
      li.innerHTML = `<strong>${l.date}</strong> — ${l.read}r · ${l.write}w <span class="small-muted"> ${l.notes||''}</span>
        <div style="margin-top:6px"><button class="tiny" data-date="${l.date}">Edit</button> <button class="tiny del" data-date="${l.date}">Delete</button></div>`
      ul.appendChild(li)
    })
    ul.querySelectorAll('button.tiny').forEach(b => b.onclick = e => openEdit(e.target.dataset.date))
    ul.querySelectorAll('button.del').forEach(b => b.onclick = e => {
      if (!confirm('Delete this log?')) return
      const date = e.target.dataset.date
      let arr = load(KEY_LOGS).filter(x => x.date !== date)
      save(KEY_LOGS, arr); render()
    })
  }

  function openEdit(date){
    const logs = load(KEY_LOGS)
    const entry = logs.find(l=>l.date===date); if (!entry) return
    refs.logDate.value = entry.date; refs.logRead.value = entry.read; refs.logWrite.value = entry.write; refs.logNotes.value = entry.notes || ''
    openModal(refs.modalLog)
  }

  function exportCSV(){
    let csv = 'type,date,read,write,notes,name,email,type,rate,createdAt\n'
    load(KEY_LOGS).forEach(l => csv += `log,${l.date},${l.read},${l.write},"${(l.notes||'').replace(/"/g,'""')}",,,,\n`)
    load(KEY_PLEDGES).forEach(p => csv += `pledge,, , , ,${(p.name||'').replace(/"/g,'""')},${(p.email||'').replace(/"/g,'""')},${p.type},${p.rate||''},${p.createdAt}\n`)
    const blob = new Blob([csv], {type:'text/csv'}), url = URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url; a.download='challenge_export.csv'; a.click(); URL.revokeObjectURL(url)
  }

  window.__sr = { compute, render, load, save }
  render()
})();
