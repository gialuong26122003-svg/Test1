      function setStatus(msg, cls) { const el = document.getElementById('statusLine'); el.textContent = msg; el.className = 'status-line' + (cls ? ' ' + cls : ''); }
      function printReport() {
        const mainArea = document.getElementById('mainArea');
        if (!mainArea || mainArea.querySelector('.empty-state')) {
          alert('Hãy bấm "Tính toán" trước để có kết quả, sau đó mới in/xuất PDF.');
          return;
        }
        const projName = document.getElementById('projName').value || 'Dự án PV';
        const lat = document.getElementById('lat').value, lon = document.getElementById('lon').value;
        const dateStr = new Date().toLocaleDateString('vi-VN');
        const ph = document.getElementById('printHeader');
        if (ph) {
          ph.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #111; padding-bottom:10px;">
        <div>
          <div style="font-size:11px; letter-spacing:2px; color:#888; text-transform:uppercase;">PV Yield Engine — Báo cáo ước tính sản lượng</div>
          <h1 style="margin:4px 0 0; font-size:22px;">${projName}</h1>
          <div style="font-size:12px; color:#555; margin-top:2px;">Tọa độ: ${lat}, ${lon}</div>
        </div>
        <div style="text-align:right; font-size:12px; color:#555;">Ngày in: ${dateStr}</div>
      </div>`;
        }
        window.print();
      }
      function parseCsvNumbers(str) { return str.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n)); }
      function fmt(n, d = 0) { return n.toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }); }
