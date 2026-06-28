// script.js - updated with Netlify function proxy support and migration helper
(() => {
  const CONFIG = { startDate: '2026-06-28', endDate: '2026-09-10' }
  const KEY_LOGS = 'sr_logs_v3'
  const KEY_PLEDGES = 'sr_pledges_v3'
  const PLEDGE_RATE = 0.01 // fixed $0.01 per minute

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
    progressArcRead: $('#progressArcRead'),
    progressArcWrite: $('#progressArcWrite'),
    progressPercent: $('#progressPercent'),
    targetSoFar: $('#targetSoFar'),
    recentLogs: $('#recentLogs'),
    donorList: $('#donorList'),
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

  let editingPledgeId = null // when editing an existing pledge

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

  refs.btnLog.onclick = () => { editingPledgeId = null; openModal(refs.modalLog) }
  refs.btnPledge.onclick = () => { editingPledgeId = null; clearPledgeForm(); openModal(refs.modalPledge) }
  $('#logCancel').onclick = () => closeModal(refs.modalLog)
  $('#pledgeCancel').onclick = () => { editingPledgeId = null; closeModal(refs.modalPledge) }
  $('#logSave').onclick = saveLog
  $('#pledgeSave').onclick = savePledge

  $all('input[name="pledgeType"]').forEach(r => r.onchange = e => {
    if (e.target.value === 'permin') { refs.perMinRow.classList.remove('hidden'); refs.flatRow.classList.add('hidden') }
    else { refs.perMinRow.classList.add('hidden'); refs.flatRow.classList.remove('hidden') }
  })

  function clearPledgeForm(){
    // reset form fields
    refs.pledgeName.value = ''
    refs.pledgeEmail.value = ''
    refs.pledgeNameFlat.value = ''
    refs.pledgeEmailFlat.value = ''
    refs.pledgeAmount.value = 10
    document.querySelector('input[name="pledgeType"][value="permin"]').checked = true
    refs.perMinRow.classList.remove('hidden'); refs.flatRow.classList.add('hidden')
  }

  async function postPledgeToServer(p){
    try {
      const res = await fetch('/.netlify/functions/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      })
      if (!res.ok) throw new Error('server save failed')
      return await res.json()
    } catch (e) {
      console.warn('postPledgeToServer failed', e)
      return null
    }
  }

  async function postLogToServer(l){
    try {
      const res = await fetch('/.netlify/functions/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(l)
      })
      if (!res.ok) throw new Error('server save failed')
      return await res.json()
    } catch (e) {
      console.warn('postLogToServer failed', e)
      return null
    }
  }

  function saveLog(){
    try {
      const date = refs.logDate.value
      const read = Math.max(0, Number(refs.logRead.value||0))
      const write = Math.max(0, Number(refs.logWrite.value||0))
      const pages = refs.logPages.value ? Math.max(0, Number(refs.logPages.value)) : null
      const book = refs.logBook.value ? refs.logBook.value.trim() : ''
      const notes = refs.logNotes.value ? refs.logNotes.value.trim() : ''
      if (!date) return alert('Pick a date')
      let logs = load(KEY_LOGS)
      const idx = logs.findIndex(l=>l.date===date)
      const entry = { id: Date.now(), date, read, write, pages, book, notes, updatedAt: new Date().toISOString() }
      if (idx >= 0) logs[idx] = entry; else logs.push(entry)
      logs.sort((a,b)=>b.date.localeCompare(a.date))
      save(KEY_LOGS, logs)

      // attempt server save (best-effort)
      postLogToServer(entry)

      closeModal(refs.modalLog); render()
    } catch (e) {
      console.error('saveLog error', e); alert('Error saving log. Check console for details.')
    }
  }

  async function savePledge(){
    try {
      const type = document.querySelector('input[name="pledgeType"]:checked').value
      let pledges = load(KEY_PLEDGES)
      let pledge = null
      if (type === 'permin'){
        const name = refs.pledgeName.value.trim()
        const email = refs.pledgeEmail.value.trim()
        if (!name) return alert('Please enter your name (so we can contact you).')
        if (!email) return alert('Please enter your email so we can contact you at the end of the challenge.')
        pledge = { id: editingPledgeId || Date.now(), name, email, type: 'permin', rate: PLEDGE_RATE, createdAt: new Date().toISOString() }
      } else {
        const name = refs.pledgeNameFlat.value.trim()
        const email = refs.pledgeEmailFlat.value.trim()
        if (!name) return alert('Please enter your name (so we can contact you).')
        if (!email) return alert('Please enter your email so we can contact you at the end of the challenge.')
        const amount = Number(refs.pledgeAmount.value || 0)
        if (amount <= 0) return alert('Enter an amount for flat pledge')
        pledge = { id: editingPledgeId || Date.now(), name, email, type: 'flat', amount, createdAt: new Date().toISOString() }
      }

      if (editingPledgeId) {
        const idx = pledges.findIndex(p => p.id === editingPledgeId)
        if (idx >= 0) pledges[idx] = pledge
      } else {
        pledges.push(pledge)
      }
      save(KEY_PLEDGES, pledges)

      // attempt server save (best-effort)
      await postPledgeToServer(pledge)

      editingPledgeId = null
      closeModal(refs.modalPledge); render()
    } catch (e) {
      console.error('savePledge error', e); alert('Error saving pledge. Check console for details.')
    }
  }

  function compute(){
    const logs = load(KEY_LOGS)
    const inRange = logs.filter(l => l.date >= start && l.date <= end)
    const totalRead = inRange.reduce((s,l)=>s + Number(l.read||0), 0)
    const totalWrite = inRange.reduce((s,l)=>s + Number(l.write||0), 0)
    const totalMinutes = totalRead + totalWrite
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
    return { logs, pledges, totalMinutes, totalRead, totalWrite, elapsed, targetSoFar, pledgedEstimate, fullChallengePayout }
  }

  function render(){
    try {
      const { logs, pledges, totalMinutes, totalRead, totalWrite, elapsed, targetSoFar, pledgedEstimate, fullChallengePayout } = compute()
      refs.daysValue.textContent = `${elapsed} / ${totalDays}`
      refs.totalMinutes.textContent = totalMinutes
      refs.pledgedValue.textContent = formatCurrency(pledgedEstimate)
      refs.targetSoFar.textContent = `${targetSoFar} min`
      refs.estimatedPayout.textContent = formatCurrency(fullChallengePayout)

      // update donut
      if (totalMinutes <= 0){
        refs.progressArcRead.setAttribute('stroke-dasharray', `0,100`)
        refs.progressArcWrite.setAttribute('stroke-dasharray', `0,100`)
      } else {
        const readShare = Math.round((totalRead / totalMinutes) * 100)
        const writeShare = 100 - readShare
        refs.progressArcRead.setAttribute('stroke-dasharray', `${readShare},100`)
        refs.progressArcWrite.setAttribute('stroke-dasharray', `${writeShare},100`)
        refs.progressArcWrite.setAttribute('stroke-dashoffset', `${-readShare}`)
      }
      const percent = targetSoFar > 0 ? Math.round((totalMinutes / targetSoFar) * 100) : 0
      refs.progressPercent.textContent = `${Math.min(100, percent)}%`

      // render logs
      const ul = refs.recentLogs; ul.innerHTML = ''
      if (!logs || logs.length === 0){
        const li = document.createElement('li'); li.className = 'small-muted'; li.textContent = 'No logs yet — click "Log minutes" to add today\'s entry.'; ul.appendChild(li)
      } else {
        logs.slice(0,50).forEach(l => {
          const total = (Number(l.read||0) + Number(l.write||0))
          const li = document.createElement('li')

          const top = document.createElement('div'); top.style.display='flex'; top.style.justifyContent='space-between'; top.style.alignItems='center'
          const strong = document.createElement('strong'); strong.textContent = l.date
          const totalDiv = document.createElement('div'); totalDiv.style.fontWeight = '700'; totalDiv.textContent = `${total} min`
          top.appendChild(strong); top.appendChild(totalDiv)

          const meta = document.createElement('div'); meta.className='row-meta'
          meta.innerHTML = `<div>Read: ${l.read} min</div><div>Write: ${l.write} min</div><div>Pages: ${l.pages !== null && l.pages !== undefined ? l.pages : '—'}</div><div>Book: ${l.book ? escapeHtml(l.book) : '—'}</div>`

          const note = document.createElement('div'); note.className='small-muted'; note.style.marginTop='6px'; note.innerHTML = escapeHtml(l.notes || '')

          const actions = document.createElement('div'); actions.style.marginTop='6px'
          const editBtn = document.createElement('button'); editBtn.className='tiny'; editBtn.dataset.date = l.date; editBtn.textContent='Edit'
          editBtn.onclick = () => openEdit(l.date)
          const delBtn = document.createElement('button'); delBtn.className='tiny del'; delBtn.dataset.date = l.date; delBtn.textContent='Delete'
          delBtn.onclick = () => { if (!confirm('Delete this log?')) return; const date = l.date; let arr = load(KEY_LOGS).filter(x => x.date !== date); save(KEY_LOGS, arr); render() }
          actions.appendChild(editBtn); actions.appendChild(delBtn)

          li.appendChild(top); li.appendChild(meta); li.appendChild(note); li.appendChild(actions)
          ul.appendChild(li)
        })
      }

      // render donors
      const dl = refs.donorList; dl.innerHTML = ''
      if (!pledges || pledges.length === 0){
        const li = document.createElement('li'); li.className='small-muted'; li.textContent = 'No pledges yet — be the first to pledge!'; dl.appendChild(li)
      } else {
        pledges.slice().reverse().forEach(p => {
          const li = document.createElement('li')
          const top = document.createElement('div'); top.style.display='flex'; top.style.justifyContent='space-between'; top.style.alignItems='center'
          const name = document.createElement('strong'); name.textContent = escapeHtml(p.name || '')
          const right = document.createElement('div'); right.style.fontWeight='700'
          if (p.type === 'flat') right.textContent = formatCurrency(Number(p.amount||0))
          else right.textContent = `Per-minute · ${formatCurrency(Number(p.rate||0))}/min`
          top.appendChild(name); top.appendChild(right)

          const meta = document.createElement('div'); meta.className='small-muted'; meta.style.marginTop='6px'
          if (p.type === 'flat') meta.textContent = `Flat pledge · ${new Date(p.createdAt).toLocaleString()}`
          else meta.textContent = `Estimated full pledge if Elliott completes the challenge: ${formatCurrency(Number(p.rate||0) * (totalDays * 30))} · ${new Date(p.createdAt).toLocaleString()}`

          const actions = document.createElement('div'); actions.style.marginTop='8px'
          const edit = document.createElement('button'); edit.className='tiny'; edit.textContent='Edit'; edit.onclick = () => editPledge(p.id)
          const del = document.createElement('button'); del.className='tiny del'; del.textContent='Delete'; del.onclick = () => { if(!confirm('Delete this pledge?')) return; const arr = load(KEY_PLEDGES).filter(x=>x.id !== p.id); save(KEY_PLEDGES, arr); render() }
          const mail = document.createElement('button'); mail.className='tiny'; mail.textContent='Email parents'; mail.onclick = () => openMailtoForPledge(p)
          actions.appendChild(edit); actions.appendChild(del); actions.appendChild(mail)

          li.appendChild(top); li.appendChild(meta); li.appendChild(actions)
          dl.appendChild(li)
        })
      }
    } catch (e) {
      console.error('render error', e); const ul = refs.recentLogs; ul.innerHTML = '<li class="small-muted">An error occurred — check console.</li>'
    }
  }

  function editPledge(id){
    const pledges = load(KEY_PLEDGES)
    const p = pledges.find(x => x.id === id); if (!p) return alert('Pledge not found')
    editingPledgeId = id
    if (p.type === 'flat'){
      document.querySelector('input[name="pledgeType"][value="flat"]').checked = true
      refs.perMinRow.classList.add('hidden'); refs.flatRow.classList.remove('hidden')
      refs.pledgeNameFlat.value = p.name || ''
      refs.pledgeEmailFlat.value = p.email || ''
      refs.pledgeAmount.value = p.amount || 0
    } else {
      document.querySelector('input[name="pledgeType"][value="permin"]').checked = true
      refs.perMinRow.classList.remove('hidden'); refs.flatRow.classList.add('hidden')
      refs.pledgeName.value = p.name || ''
      refs.pledgeEmail.value = p.email || ''
    }
    openModal(refs.modalPledge)
  }

  function openEdit(date){
    const logs = load(KEY_LOGS)
    const entry = logs.find(l=>l.date===date); if (!entry) return
    refs.logDate.value = entry.date; refs.logRead.value = entry.read; refs.logWrite.value = entry.write; refs.logPages.value = entry.pages || ''; refs.logBook.value = entry.book || ''; refs.logNotes.value = entry.notes || ''
    openModal(refs.modalLog)
  }

  function composeDonorVoiceBody(p){
    const name = p.name || 'A supporter'
    const typeLine = p.type === 'flat' ? `Flat — ${formatCurrency(p.amount||0)}` : `Per-minute at $${(p.rate||0).toFixed(2)}/min (estimated full pledge: ${formatCurrency(Number(p.rate||0) * (totalDays * 30))})`
    return `Hi Joel & Michelle,%0D%0A%0D%0AMy name is ${encodeURIComponent(name)} and I just pledged to support Elliott's Summer Reading & Writing Marathon.%0D%0A%0D%0APledge details:%0D%0A- ${typeLine}%0D%0A- Donor email: ${encodeURIComponent(p.email || 'n/a')}%0D%0A%0D%0ABest wishes,%0D%0A${encodeURIComponent(name)}`
  }

  function openMailtoForPledge(p){
    const parents = ['michellehulan@gmail.com','joelwkodish@gmail.com'].join(',')
    const subject = encodeURIComponent(`Elliott — I just made a pledge to support your summer reading!`)
    const body = composeDonorVoiceBody(p)
    const mailto = `mailto:${parents}?subject=${subject}&body=${body}`
    window.open(mailto)
  }

  function escapeHtml(s) { return (s||'').replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])) }

  // migration helper: upload localStorage entries to server (best-effort). Run in console: window.__sr.migrateToServer()
  async function migrateToServer(){
    const pledges = load(KEY_PLEDGES)
    const logs = load(KEY_LOGS)
    console.log('Migrating', pledges.length, 'pledges and', logs.length, 'logs to server...')
    for (const p of pledges){
      try { const r = await postPledgeToServer(p); console.log('pledge', p.id, '->', r) } catch(e){ console.warn('pledge upload failed', p.id, e) }
    }
    for (const l of logs){
      try { const r = await postLogToServer(l); console.log('log', l.date, '->', r) } catch(e){ console.warn('log upload failed', l.date, e) }
    }
    alert('Migration attempted — check console for results.')
  }

  window.__sr = { compute, render, load, save, migrateToServer }
  render()
})();
