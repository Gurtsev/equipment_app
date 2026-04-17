var API_URL = 'http://localhost:3000/api/assets';
var allAssets = []; 
var qrCache = {}; 

async function loadAssets() {
    const response = await fetch(API_URL);
    allAssets = await response.json();
    renderTable(allAssets);
}

function renderTable(data) {
    const tableBody = document.getElementById('assetsTable');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const statusClass = item.status === 'У сотрудника' ? 'status-сотрудник' : 
                          item.status === 'В ремонте' ? 'status-ремонт' : 'status-склад';
        tableBody.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${item.title}</td>
                <td>${item.serial_number}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>
                    <button class="btn-qr" data-serial="${item.serial_number}" data-title="${item.title}">QR</button>
                    <button class="btn-delete" onclick="deleteAsset(${item.id})">Удалить</button>
                </td>
            </tr>`;
    });
}

async function addAsset() {
    const title = document.getElementById('title').value;
    const serial = document.getElementById('serial').value;
    const status = document.getElementById('status').value;
    if(!title || !serial) return alert("Заполните поля");

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, serial_number: serial, status })
    });
    document.getElementById('title').value = '';
    document.getElementById('serial').value = '';
    loadAssets();
}

async function deleteAsset(id) {
    if (confirm('Удалить?')) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        loadAssets();
    }
}

async function showQR(serial, title, event) {
    if (qrCache[serial]) return displayQR(qrCache[serial], title, serial);

    const btn = event.target;
    btn.disabled = true;
    try {
        const res = await fetch(`http://localhost:3000/api/qrcode?text=${encodeURIComponent(serial)}`);
        const data = await res.json();
        qrCache[serial] = data.image;
        displayQR(data.image, title, serial);
    } finally { btn.disabled = false; }
}

function displayQR(img, title, serial) {
    document.getElementById("qrcode").innerHTML = `<img src="${img}" style="width:150px;">`;
    document.getElementById("qrText").innerText = `${title} (${serial})`;
    document.getElementById("qrModal").style.display = "flex";
}

function closeModal() { document.getElementById("qrModal").style.display = "none"; }

function printQR() {
    const win = window.open('', '', 'height=400,width=400');
    win.document.write(`<html><head><style>body{text-align:center;font-family:sans-serif;}</style></head><body>
        ${document.getElementById('qrcode').innerHTML}
        <p>${document.getElementById('qrText').innerText}</p>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadAssets();
    document.addEventListener('click', e => {
        if (e.target.classList.contains('btn-qr')) {
            showQR(e.target.dataset.serial, e.target.dataset.title, e);
        }
    });
    document.getElementById('searchInput').addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        renderTable(allAssets.filter(i => i.title.toLowerCase().includes(term) || i.serial_number.toLowerCase().includes(term)));
    });
});
