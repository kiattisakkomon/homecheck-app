let db = {
  items: [],
  load: async () => {
    const cached = localStorage.getItem('home_items_v1');
    if (cached){ db.items = JSON.parse(cached); return; }
    const res = await fetch('data/items.json'); db.items = await res.json();
    localStorage.setItem('home_items_v1', JSON.stringify(db.items));
  },
  save: () => localStorage.setItem('home_items_v1', JSON.stringify(db.items))
};

const els = {
  list: document.getElementById('list'),
  rowTpl: document.getElementById('rowTpl'),
  itemTpl: document.getElementById('itemTpl'),
  search: document.getElementById('search'),
  fStatus: document.getElementById('filterStatus'),
  fCat: document.getElementById('filterCat'),
  totalsAll: document.getElementById('sumAll'),
  totalsPending: document.getElementById('sumPending'),
  dlg: document.getElementById('dlg'),
  fCategory: document.getElementById('fCategory'),
  fName: document.getElementById('fName'),
  fQty: document.getElementById('fQty'),
  fPrice: document.getElementById('fPrice'),
  fStatus2: document.getElementById('fStatus'),
  fNote: document.getElementById('fNote'),
  addBtn: document.getElementById('addBtn'),
  exportBtn: document.getElementById('exportBtn'),
  resetBtn: document.getElementById('resetBtn'),
  installBtn: document.getElementById('installBtn'),
};
let editingId = null;
function baht(n){ return (n||0).toLocaleString('th-TH',{maximumFractionDigits:0}); }

function recalc(){
  const sumAll = db.items.reduce((a,x)=>a + x.qty*x.price,0);
  const sumPending = db.items.filter(x=>x.status==='ยังไม่ซื้อ')
                              .reduce((a,x)=>a + x.qty*x.price,0);
  els.totalsAll.textContent = baht(sumAll);
  els.totalsPending.textContent = baht(sumPending);
}

function render(){
  const q = els.search.value.trim().toLowerCase();
  const st = els.fStatus.value;
  const fc = els.fCat.value;
  const groups = {};
  for(const it of db.items){
    if(q && !(it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q))) continue;
    if(st && it.status!==st) continue;
    if(fc && it.category!==fc) continue;
    (groups[it.category] ||= []).push(it);
  }
  els.list.innerHTML = '';
  Object.keys(groups).sort().forEach(cat=>{
    const d = els.rowTpl.content.firstElementChild.cloneNode(true);
    d.querySelector('.groupTitle').textContent = cat;
    const rows = d.querySelector('.rows');
    groups[cat].forEach(it=> rows.appendChild(renderItem(it)) );
    els.list.appendChild(d);
  });
  // fill cat filter
  const cats = [...new Set(db.items.map(x=>x.category))];
  els.fCat.innerHTML = '<option value="">ทุกหมวด</option>' + cats.map(c=>`<option>${c}</option>`).join('');
  recalc();
}

function renderItem(it){
  const n = els.itemTpl.content.firstElementChild.cloneNode(true);
  n.dataset.id = it.id;
  n.querySelector('.chk').checked = it.status === 'ซื้อแล้ว';
  n.querySelector('.name').textContent = it.name;
  n.querySelector('.qty').textContent = 'จำนวน: ' + it.qty;
  n.querySelector('.price').textContent = 'ราคา: ' + baht(it.price) + ' บาท';
  n.querySelector('.status').value = it.status;
  const note = n.querySelector('.note'); note.value = it.note || '';
  note.addEventListener('change', ()=>{ it.note = note.value; db.save(); });
  n.querySelector('.chk').addEventListener('change', e=>{
    it.status = e.target.checked ? 'ซื้อแล้ว' : 'ยังไม่ซื้อ'; db.save(); recalc();
  });
  n.querySelector('.status').addEventListener('change', e=>{
    it.status = e.target.value; db.save(); render();
  });
  n.querySelector('.del').addEventListener('click', ()=>{
    if(confirm('ลบรายการนี้?')){ db.items = db.items.filter(x=>x.id!==it.id); db.save(); render(); }
  });
  n.querySelector('.edit').addEventListener('click', ()=> openEdit(it) );
  return n;
}

function openAdd(){
  editingId = null;
  els.fCategory.value=''; els.fName.value=''; els.fQty.value=1; els.fPrice.value=0;
  els.fStatus2.value='ยังไม่ซื้อ'; els.fNote.value='';
  els.dlg.querySelector('#dlgTitle').textContent='เพิ่มรายการ';
  els.dlg.showModal();
}
function openEdit(it){
  editingId = it.id;
  els.fCategory.value=it.category; els.fName.value=it.name; els.fQty.value=it.qty; els.fPrice.value=it.price;
  els.fStatus2.value=it.status; els.fNote.value=it.note||'';
  els.dlg.querySelector('#dlgTitle').textContent='แก้ไขรายการ';
  els.dlg.showModal();
}
document.getElementById('saveBtn').addEventListener('click', ()=>{
  const row = {
    id: editingId || (Math.max(0,...db.items.map(x=>x.id))+1),
    category: els.fCategory.value.trim(),
    name: els.fName.value.trim(),
    qty: parseInt(els.fQty.value||1),
    price: parseFloat(els.fPrice.value||0),
    status: els.fStatus2.value,
    note: els.fNote.value.trim()
  };
  if(!row.category||!row.name){ alert('กรอกหมวดและรายการก่อน'); return; }
  if(editingId){
    const i = db.items.findIndex(x=>x.id===editingId);
    db.items[i] = row;
  }else{
    db.items.push(row);
  }
  db.save(); render();
});

els.addBtn.addEventListener('click', openAdd);
els.search.addEventListener('input', render);
els.fStatus.addEventListener('change', render);
els.fCat.addEventListener('change', render);
els.exportBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(db.items,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='items_export.json'; a.click();
});
els.resetBtn.addEventListener('click', ()=>{
  if(confirm('คืนค่าเริ่มต้นทั้งหมด?')){ localStorage.removeItem('home_items_v1'); location.reload(); }
});

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; els.installBtn.style.display='inline-block'; });
document.getElementById('installBtn').addEventListener('click', async ()=>{
  if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; els.installBtn.style.display='none';
});

// Service worker
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }

(async ()=>{ await db.load(); render(); })();
