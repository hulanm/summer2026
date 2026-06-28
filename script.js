// script.js - updated: stores pages & book; removes export; modal notifications; mobile-friendly
(() => {
  const CONFIG = { startDate: '2026-06-28', endDate: '2026-09-10' }
  const KEY_LOGS = 'sr_logs_v3'
  const KEY_PLEDGES = 'sr_pledges_v3'
  const PLEDGE_RATE = 0.01 // fixed $0.01 per minute

  // Parents' emails for notification
  const PARENT_EMAILS = ['michellehulan@gmail.com','joelwkodish@gmail.com']

  const $ = s => document.querySelector(s), $all = s => [...document.querySelectorAll(s)]
  const todayISO = () => new Date().toISOString().slice(0,10)
  const formatCurrency = n => `$${Number(n||0).toFixed(2)}`
  const dateDiffDays = (a,b) => Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/(1000*60*60*24))
  const inclusiveDays = (a,b) => dateDiffDays(a,b) + 1

  const start = CONFIG.startDate, end = CONFIG.endDate
  const totalDays = inclusiveDays(start,end)
  $('#datesText').textContent = `${start} — ${end}`

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
    modalLog: $('#modalLog'),
    modalPledge: $('#modalPledge'),
    logDate: $('#logDate'),
    logRead: $('#logRead'),
    logWrite: $('#logWrite'),
    logPages: $('#logPages'),
    logBook: $('#logBook'),
    logNotes: $('#logNotes'),
    pledgeName: $('#pledgeName'),
    pledgeEmail: $('#pledgeEmail'),
    pledgeNameFlat: $('#pledgeNameFlat'),
    pledgeEmailFlat: $('#pledgeEmailFlat'),
    pledgeAmount: $('#pledgeAmount'),
    estimatedPayout: $('#estimatedPayout'),
    perMinRow: $('#perMinRow'),
    flatRow: $('#flatRow')
  }

  const load = (k) => JSON.parse(localStorage.getItem(k) || '[]')
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v))

  function openModal(m){ m.classList.remove('hidden'); m.setAttribute('aria-hidden','false') }
  function closeModal(m){ m.classList.add('hidden'); m.setAttribute('aria-hidden','true') }

  // init
  refs.logDate.value = todayISO()
  refs.logRead.value = 15
  refs.logWrite.value = 15
  refs.logPages.value = ''
  refs.logBook.value = ''
  refs.pledgeAmount.value = 10

  refs.btnLog.onclick = () => openModal(refs.modalLog)
  refs.btnPledge.onclick = () => openModal(refs.modalPledge)
  $('#logCancel').onclick = () => closeModal(refs.modalLog)
  $('#pledgeCancel').onclick = () => closeModal(refs.modalPledge)
  $('#logSave').onclick = saveLog
  $('#pledgeSave').onclick = savePledge

  $all('input[name="pledgeType"]').forEach(r => r.onchange = e => {
    if (e.target.value === 'permin') { refs.perMinRow.classList.remove('hidden'); refs.flatRow.classList.add('hidden') }
    else { refs.perMinRow.classList.add('hidden'); refs.flatRow.classList.remove('hidden') }
  })

  function saveLog(){
    const date = refs.logDate.value
    const read = Math.max(0, Number(refs.logRead.value||0))
    const write = Math.max(0, Number(refs.logWrite.value||0))
    const pages = refs.logPages.value ? Math.max(0, Number(refs.logPages.value)) : null
    const book = refs.logBook.value ? refs.logBook.value.trim() : ''
    const notes = refs.logNotes.value ? refs.logNotes.value.trim() : ''
    if (!date) return alert('Pick a date')
    let logs = load(KEY_LOGS)
    const idx = logs.findIndex(l=>l.date===date)
    const entry = { date, read, write, pages, book, notes, updatedAt: new Date().toISOString() }
    if (idx >= 0) logs[idx] = entry; else logs.push(entry)
    logs.sort((a,b)=>b.date.localeCompare(a.date))
    save(KEY_LOGS, logs)
    closeModal(refs.modalLog); render()
  }

  function savePledge(){
    const type = document.querySelector('input[name="pledgeType"]:checked').value
    const pledges = load(KEY_PLEDGES)
    let pledge = null
    if (type === 'permin'){
      const name = refs.pledgeName.value.trim() || 'Anonymous'
      const email = refs.pledgeEmail.value.trim()
      pledge = { id: Date.now(), name, email, type: 'permin', rate: PLEDGE_RATE, createdAt: new Date().toISOString() }
    } else {
      const name = refs.pledgeNameFlat.value.trim() || 'Anonymous'
      const email = refs.pledgeEmailFlat.value.trim()
      const amount = Number(refs.pledgeAmount.value || 0)
      if (amount <= 0) return alert('Enter an amount for flat pledge')
      pledge = { id: Date.now(), name, email, type: 'flat', amount, createdAt: new Date().toISOString() }
    }
    pledges.push(pledge)
    save(KEY_PLEDGES, pledges)
    try { sendNotificationEmails(pledge) } catch(e){ console.warn('Email helper failed', e) }
    closeModal(refs.modalPledge); render()
  }

  function sendNotificationEmails(pledge){
    const donorEmail = pledge.email
    const parents = PARENT_EMAILS.join(',')
    const subject = encodeURIComponent("WOW — Thanks for supporting Elliott's summer reading!")
    const bodyText = `WOW, thank you so much for supporting Elliott's reading and writing summer!\n\nWe thought this was a fun way to help keep him motivated, so he can enter middle school without any learning leaks!\n\nTo keep track of his progress, you can always come back to his page: https://hulanm.github.io/summer2026/\n\nHe'll be updating it every day.\n\nSincerely,\nJoel & Michelle\n\nPledge details:\nType: ${pledge.type === 'permin' ? '$0.01 per minute' : 'Flat'}\n${pledge.type === 'flat' ? `Amount: $${(pledge.amount||0).toFixed(2)}\n` : ''}Donor: ${pledge.name || 'Anonymous'}\nEmail: ${pledge.email || 'n/a'}`
    const body = encodeURIComponent(bodyText)
    const mailtoParents = `mailto:${parents}?subject=${subject}&body=${body}`
    window.open(mailtoParents)
    if (donorEmail){
      const mailtoDonor = `mailto:${encodeURIComponent(donorEmail)}?subject=${subject}&body=${body}`
      window.open(mailtoDonor)
    }
  }

  function compute(){
    const logs = load(KEY_LOGS)
    const inRange = logs.filter(l => l.date >= start && l.date <= end)
    const totalMinutes = inRange.reduce((s,l)=>s + Number(l.read||0) + Number(l.write||0), 0)
    const now = new Date().toISOString().slice(0,10)
    const elapsedEnd = now < start ? start : (now > end ? end : now)
    const elapsed = elapsedEnd < start ? 0 : inclusiveDays(start, elapsedEnd)
    const targetSoFar = totalDays * 30 // whole-summer goal
    const pledges = load(KEY_PLEDGES)
    const pledgedEstimate = pledges.reduce((acc,p) => {
      if (p.type === 'flat') return acc + Number(p.amount || 0)
      return acc + (Number(p.rate || 0) * totalMinutes)
    }, 0)
    const fullChallengeMinutes = totalDays * 30
    const fullChallengePayout = pledges.reduce((acc, p) => {
      if (p.type === 'flat') return acc + Number(p.amount || 0)
      return acc + (Number(p.rate || 0) * fullChallengeMinutes)
    }, 0)
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
    if (logs.length === 0){
      ul.innerHTML = '<li class="small-muted">No logs yet — click "Log minutes" to add today\'s entry.</li>'
    } else {
      logs.slice(0,50).forEach(l => {
        const total = (Number(l.read||0) + Number(l.write||0))
        const li = document.createElement('li')
        li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>${l.date}</strong><div style="font-weight:700">${total} min</div></div>
          <div class="row-meta"><div>Read: ${l.read} min</div><div>Write: ${l.write} min</div><div>Pages: ${l.pages !== null && l.pages !== undefined ? l.pages : '—'}</div><div>Book: ${l.book ? escapeHtml(l.book) : '—'}</div></div>
          <div class="small-muted" style="margin-top:6px">${escapeHtml(l.notes || '')}</div>
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
  }

  function openEdit(date){
    const logs = load(KEY_LOGS)
    const entry = logs.find(l=>l.date===date); if (!entry) return
    refs.logDate.value = entry.date; refs.logRead.value = entry.read; refs.logWrite.value = entry.write; refs.logPages.value = entry.pages || ''; refs.logBook.value = entry.book || ''; refs.logNotes.value = entry.notes || ''
    openModal(refs.modalLog)
  }

  function exportCSV(){ /* export removed per request */ }

  function escapeHtml(s) { return (s||'').replace(/[&<>"]/, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])) }

  window.__sr = { compute, render, load, save }
  render()
})();
