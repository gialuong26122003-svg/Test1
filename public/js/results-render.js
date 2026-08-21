      let charts = {};
      function renderResults(r) {
        const main = document.getElementById('mainArea');
        main.innerHTML = `
    ${!r.sd.ok ? `<div class="warn-box">⚠ <b>Cấu hình chuỗi KHÔNG hợp lệ:</b><ul style="margin:6px 0 0 18px; padding:0;">${r.sd.issues.map(i => `<li>${i}</li>`).join('')}</ul></div>` : `<div class="ok-box">✓ Cấu hình chuỗi hợp lệ — ${r.sd.numGroups > 1 ? r.sd.numGroups + ' nhóm chuỗi (tổng ' + r.sd.totalStrings + ' chuỗi, ' + r.sd.actualModuleCount + ' tấm)' : r.sd.groups[0].modulesPerString + ' tấm/chuỗi × ' + r.sd.totalStrings + ' chuỗi'} nằm trong giới hạn điện áp và dòng của inverter.</div>`}

    <div class="cards">
      <div class="card"><div class="label">Công suất DC (theo cấu hình đã nhập)</div><div class="value">${fmt(r.dcKwp, 1)}<span>kWp</span></div><div class="sub">${r.sd.actualModuleCount} tấm</div></div>
      <div class="card cyan"><div class="label">Công suất AC</div><div class="value">${fmt(r.acKw, 0)}<span>kW</span></div><div class="sub">DC/AC ${fmt(r.dcAcRatio, 2)}${r.clippingLossPct > 0.01 ? ' · Clipping ' + fmt(r.clippingLossPct, 2) + '%' : ''}</div></div>
      <div class="card"><div class="label">Sản lượng riêng</div><div class="value">${fmt(r.specificYield, 0)}<span>kWh/kWp/năm</span></div></div>
      <div class="card cyan"><div class="label">Performance Ratio</div><div class="value">${fmt(r.PR, 2)}<span>%</span></div></div>
      <div class="card"><div class="label">Sản lượng <span class="p-tag p50">P50</span></div><div class="value">${fmt(r.E_y, 0)}<span>kWh</span></div></div>
      <div class="card cyan"><div class="label">Sản lượng <span class="p-tag p90">P90</span></div><div class="value">${fmt(r.P90, 0)}<span>kWh</span></div><div class="sub">σ tổng hợp ${fmt(r.sigma, 1)}%</div></div>
      ${r.isFarm ? `<div class="card"><div class="label">GCR giàn (Lc/pitch)</div><div class="value">${r.rowShade ? fmt(r.rowShade.Lc / r.rowShade.D * 100, 1) : '—'}<span>%</span></div><div class="sub">Lc ${r.rowShade ? fmt(r.rowShade.Lc, 2) : '—'}m · pitch ${r.rowShade ? fmt(r.rowShade.D, 2) : '—'}m · Uc ${fmt(r.Uc, 0)} W/m²K</div></div>` : ''}
      ${r.isFarm ? `<div class="card cyan"><div class="label">Tổn hao tự bóng hàng-hàng</div><div class="value">${fmt(r.selfShadingLossPct, 2)}<span>%</span></div><div class="sub">theo GlobInc năm, đã tính trong sản lượng</div></div>` : ''}
    </div>

    <div class="panel-block">
      <h3>Kiểm tra thiết kế chuỗi</h3>
      <div class="desc">${r.sd.numGroups > 1 ? r.sd.numGroups + ' nhóm chuỗi không đồng đều — tổng ' + r.sd.totalStrings + ' chuỗi / ' + r.sd.actualModuleCount + ' tấm' : r.sd.groups[0].modulesPerString + ' tấm/chuỗi × ' + r.sd.totalStrings + ' chuỗi (nhập tay)'} — so với giới hạn điện áp/dòng của inverter.</div>
      <table>
        <tbody>
          ${r.sd.groups.map((g) => `
          ${r.sd.numGroups > 1 ? `<tr><td colspan="2" style="background:var(--panel-2); color:var(--amber);"><b>Nhóm ${g.index}: ${g.modulesPerString} tấm/chuỗi × ${g.numStrings} chuỗi = ${fmt(g.dcKwp, 1)} kWp</b></td></tr>` : ''}
          <tr><td>Voc chuỗi ở nhiệt độ thấp nhất (${r.domValues.tMinDesign}°C)</td><td>${fmt(g.VocCold, 0)} V${g.VocCold > r.domValues.inverterVmaxDC ? ' ⚠' : ' ✓'} (giới hạn ${r.domValues.inverterVmaxDC} V)</td></tr>
          <tr><td>Vmp chuỗi ở nhiệt độ thấp nhất (Vmp lạnh nhất)</td><td>${fmt(g.VmpCold, 0)} V${g.VmpCold > r.domValues.inverterMpptVmax ? ' ⚠' : ' ✓'} (giới hạn MPPT max ${r.domValues.inverterMpptVmax} V)</td></tr>
          <tr><td>Vmp chuỗi ở nhiệt độ tấm nóng nhất (${r.domValues.tMaxCellDesign}°C)</td><td>${fmt(g.VmpHot, 0)} V${g.VmpHot < r.domValues.inverterMpptVmin ? ' ⚠' : ' ✓'} (giới hạn MPPT min ${r.domValues.inverterMpptVmin} V)</td></tr>
          `).join('')}
          <tr><td>Isc module so với dòng tối đa/1 đầu vào</td><td>${isNaN(r.sd.maxCurrentPerInput) ? fmt(r.sd.Isc, 1) + ' A (chưa có dữ liệu dòng tối đa/1 đầu vào — bỏ qua kiểm tra này)' : fmt(r.sd.Isc, 1) + ' A' + (r.sd.Isc > r.sd.maxCurrentPerInput ? ' ⚠' : ' ✓') + ' (giới hạn ' + r.sd.maxCurrentPerInput + ' A)'}</td></tr>
          <tr><td style="padding-left:16px; color:#5c6f82;">↳ theo dòng vận hành/MPPT (Imp×n ≤ ${r.sd.maxCurrentPerMppt}A)</td><td style="color:#5c6f82;">floor(${r.sd.maxCurrentPerMppt}÷${fmt(r.sd.Imp, 2)}) = ${r.sd.maxStringsPerTrackerByOperating}</td></tr>
          <tr><td style="padding-left:16px; color:#5c6f82;">↳ theo dòng ngắn mạch/MPPT (Isc×n ≤ ${r.sd.maxIscPerMppt}A)</td><td style="color:#5c6f82;">floor(${r.sd.maxIscPerMppt}÷${fmt(r.sd.Isc, 2)}) = ${r.sd.maxStringsPerTrackerByIsc}</td></tr>
          <tr><td style="padding-left:16px; color:#5c6f82;">↳ theo số đầu vào vật lý/tracker (datasheet)</td><td style="color:#5c6f82;">${r.sd.maxStringsPerTrackerPhysical}</td></tr>
          <tr><td>Số chuỗi tối đa/tracker (nhỏ nhất trong 3 ở trên)</td><td>${r.sd.maxStringsPerTrackerEffective}</td></tr>
          <tr><td>Số chuỗi tối đa/bộ inverter</td><td>${r.sd.maxStringsPerInverter}</td></tr>
          <tr class="year1"><td><b>Số chuỗi tối đa toàn hệ thống</b></td><td><b>${r.sd.maxStringsSystemTotal}</b></td>${r.sd.totalStrings > r.sd.maxStringsSystemTotal ? ' ⚠' : ' ✓'}</tr>
          <tr class="year1"><td><b>Công suất DC thực tế</b></td><td><b>${fmt(r.sd.actualDcKwp, 1)} kWp</b></td></tr>
        </tbody>
      </table>
    </div>

    <div class="two-col">
      <div class="panel-block">
        <h3>Bức xạ &amp; sản lượng theo tháng</h3>
        <canvas id="chartMonthly" height="230"></canvas>
      </div>
      <div class="panel-block">
        <h3>Loss diagram</h3>
        <div class="desc">Theo đúng cấu trúc waterfall PVsyst</div>
        <div id="lossDiagramWrap"></div>
      </div>
    </div>

    ${r.monthlyBalances ? `
    <div class="panel-block">
      <h3>Balances and main results</h3>
      <div class="desc">Chi tiết theo tháng — giống bảng "Balances and main results" trong báo cáo PVsyst.</div>
      <div style="overflow-x:auto;">
      <table>
        <thead><tr><th>Tháng</th><th>GlobHor<br>kWh/m²</th><th>DiffHor<br>kWh/m²</th><th>T_Amb<br>°C</th><th>GlobInc<br>kWh/m²</th><th>GlobEff<br>kWh/m²</th><th>EArray<br>kWh</th><th>E_Grid<br>kWh</th><th>PR<br>ratio</th></tr></thead>
        <tbody>
          ${r.monthlyBalances.map(m => `<tr><td>${m.month}</td><td>${fmt(m.GlobHor, 1)}</td><td>${fmt(m.DiffHor, 1)}</td><td>${fmt(m.T_Amb, 2)}</td><td>${fmt(m.GlobInc, 1)}</td><td>${fmt(m.GlobEff, 1)}</td><td>${fmt(m.EArray, 0)}</td><td>${fmt(m.E_Grid, 0)}</td><td>${(m.PR / 100).toFixed(3)}</td></tr>`).join('')}
          <tr class="year1"><td><b>Year</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.GlobHor, 0), 1)}</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.DiffHor, 0), 1)}</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.T_Amb, 0) / 12, 2)}</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.GlobInc, 0), 1)}</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.GlobEff, 0), 1)}</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.EArray, 0), 0)}</b></td><td><b>${fmt(r.monthlyBalances.reduce((s, m) => s + m.E_Grid, 0), 0)}</b></td><td><b>${(r.E_y / (r.dcKwp * r.POA_y)).toFixed(3)}</b></td></tr>
        </tbody>
      </table>
      </div>
      <div class="footnote" style="margin-top:10px;">
        <b>GlobHor</b> Global horizontal irradiation &nbsp;·&nbsp; <b>DiffHor</b> Horizontal diffuse irradiation &nbsp;·&nbsp; <b>T_Amb</b> Ambient Temperature &nbsp;·&nbsp; <b>GlobInc</b> Global incident in coll. plane &nbsp;·&nbsp; <b>GlobEff</b> Effective Global, corr. for IAM<br>
        <b>EArray</b> Effective energy at the output of the array &nbsp;·&nbsp; <b>E_Grid</b> Energy injected into grid &nbsp;·&nbsp; <b>PR</b> Performance Ratio
      </div>
    </div>` : ''}

    <div class="panel-block">
      <h3>Ageing Tool — sản lượng ${r.lifetime} năm vận hành (P50)</h3>
      <div class="desc">Suy giảm bình quân + tổn hao mismatch tăng dần theo phân tán Imp/Vmp — xem ghi chú giới hạn bên dưới.</div>
      <canvas id="chartYears" height="90"></canvas>
      <div class="scroll-table-wrap" style="max-height:280px; overflow-y:auto; margin-top:12px;">
      <table>
        <thead><tr><th>Năm</th><th>EUseful P50 (kWh)</th><th>PR (%)</th><th>PR loss (%)</th></tr></thead>
        <tbody>${r.yearsTable.map(y => `<tr><td>${y.year}</td><td>${fmt(y.EUseful, 0)}</td><td>${fmt(y.PR, 2)}</td><td>-${fmt(y.lossPct, 2)}</td></tr>`).join('')}</tbody>
      </table>
      </div>
    </div>

    <div class="panel-block">
      <h3>P50 - P90 evaluation</h3>
      <div class="two-col">
        <table>
          <tbody>
            <tr><td>Biến động bức xạ liên năm</td><td>${r.domValues.weatherVariability}%</td></tr>
            <tr><td>Bất định mô hình module</td><td>${r.domValues.uncModule}%</td></tr>
            <tr><td>Bất định hiệu suất inverter</td><td>${r.domValues.uncInverter}%</td></tr>
            <tr><td>Bất định bụi/mismatch</td><td>${r.domValues.uncSoilingMismatch}%</td></tr>
            <tr><td>Bất định suy giảm</td><td>${r.domValues.uncDegradation}%</td></tr>
            <tr class="year1"><td><b>Biến động tổng hợp (căn quân phương)</b></td><td><b>${fmt(r.sigma, 2)}%</b></td></tr>
          </tbody>
        </table>
        <table>
          <tbody>
            <tr><td>Variability</td><td>${fmt(r.variabilityMWh, 1)} MWh</td></tr>
            <tr class="year1"><td><b>P50</b></td><td><b>${fmt(r.P50 / 1000, 1)} MWh</b></td></tr>
            <tr><td>P90</td><td>${fmt(r.P90 / 1000, 1)} MWh</td></tr>
            <tr><td>P95</td><td>${fmt(r.P95 / 1000, 1)} MWh</td></tr>
          </tbody>
        </table>
      </div>
      <canvas id="chartBell" height="140" style="margin-top:14px;"></canvas>
    </div>

    <div class="panel-block">
      <h3>Ghi chú phương pháp &amp; giới hạn</h3>
      <div class="footnote">
        <b>Nguồn dữ liệu:</b> ${r.engine}${r.isTwoRoof ? ' (tính riêng từng mái, cộng sản lượng)' : ''}.<br>
        <b>Phương thức lắp đặt:</b> ${r.isFarm ? `Mặt đất — hệ farm (khung giàn cố định). Tự bóng hàng-hàng tính đầy đủ theo giờ/tháng bằng công thức góc giới hạn che bóng (Duffie &amp; Beckman) dựa trên GCR thực (Lc/pitch = ${r.rowShade ? fmt(r.rowShade.Lc / r.rowShade.D * 100, 1) : '—'}%); chỉ áp dụng cho phần trực xạ (beam), khuếch tán/phản xạ mặt đất không bị trừ thêm. Mô hình giả định các hàng chạy dài, vuông góc với mặt phẳng nghiêng-hướng của giàn (bố trí giàn tiêu chuẩn) — không mô phỏng 3D che khuất ở hai đầu hàng hoặc vật cản riêng lẻ (cây, cột, trạm biến áp...).` : 'Mái tôn (rooftop) — không mô hình tự bóng hàng-hàng.'}<br>
        <b>Bức xạ nghiêng &amp; IAM:</b> mô phỏng giờ-theo-giờ (24h × 12 tháng) — góc tới thực tế (AOI), hệ số khuếch tán Erbs, mô hình Liu-Jordan, và IAM tra theo đúng bảng Fresnel+AR (n=1.526/1.290) mà PVsyst in trong báo cáo. Đã đối chiếu với 3 báo cáo PVsyst thực tế của bạn: GlobInc/GlobEff sai lệch 0,1–0,3%, sản lượng cuối sai lệch &lt;1%.<br>
        <b>Cột DiffHor (bảng Balances):</b> hệ số khuếch tán Erbs đôi khi ước tính cao hơn số liệu Meteonorm thực tế vào các tháng nhiều mây/độ trong khí quyển thấp (đã đối chiếu: có tháng lệch tới ~20 điểm % so với DiffHor thật của PVsyst) — do đây là tương quan thống kê chung, không phải đo đạc trực tiếp. GlobInc/GlobEff/PR/E_Grid không bị ảnh hưởng đáng kể (vẫn trong sai số &lt;1% đã kiểm chứng), chỉ riêng việc TÁCH beam/diffuse là kém chính xác hơn.<br>
        <b>Tổn hao nhiệt độ:</b> tính từ nhiệt độ tế bào theo giờ (Tcell=Tamb+G<sub>poa</sub>/Uc, Uc=${fmt(r.Uc, 0)} W/m²K — ${r.isFarm ? 'preset "Free-standing" PVsyst cho giàn mặt đất thoáng khí' : 'preset "Semi-integrated" PVsyst cho mái tôn, mặc định'}), lấy trung bình có trọng số theo năng lượng.<br>
        <b>Clipping (cắt ngọn DC/AC):</b> dùng lại đúng hồ sơ công suất theo giờ đã mô phỏng (không phải ước lượng thống kê) — mỗi giờ trong năm, công suất DC sau tổn hao được so với công suất AC tối đa của inverter; phần vượt bị cắt bỏ. Ở chế độ nhập POA (không có hình dạng giờ thật), công cụ dựng hình dạng giờ mô phỏng theo vị trí mặt trời để ước tính gần đúng.<br>
        <b>Ageing 25 năm:</b> mô hình suy giảm tuyến tính bình quân năm (quy ước giữa-năm) + tổn hao mismatch tăng theo bình phương độ phân tán Imp/Vmp. Số liệu Ageing Tool thực tế của PVsyst còn lồng thêm biến động thời tiết theo từng năm cụ thể trong bộ dữ liệu nhiều năm của họ (ghi chú "interpolated data" trong báo cáo) — điều này tạo ra đường cong gợn sóng mà mô hình khí hậu trung bình tháng ở đây không tái tạo được chính xác từng năm, dù tổng xu hướng 25 năm là tương đồng.<br>
        <b>P50/P90:</b> tổng hợp căn quân phương giữa biến động bức xạ liên năm và các bất định mô hình/thiết bị — đúng phương pháp PVsyst dùng.<br>
        <b>Thiết kế chuỗi:</b> tính từ Voc/Vmp module, hệ số nhiệt, và giới hạn điện áp/dòng inverter bạn nhập — không phải suy giảm/degradation mà là bài toán điện áp-nhiệt độ tại thời điểm lắp đặt.
      </div>
    </div>
  `;

        const months = r.monthly.map(m => m.month);
        if (charts.monthly) charts.monthly.destroy();
        charts.monthly = new Chart(document.getElementById('chartMonthly'), {
          type: 'bar',
          data: {
            labels: months, datasets: [
              { label: 'H(i) POA — kWh/m²', data: r.monthly.map(m => m.H_m), backgroundColor: '#7a5a2455', borderColor: '#f2a93b', borderWidth: 1, yAxisID: 'y1' },
              { label: 'E — kWh AC', data: r.monthly.map(m => m.E_m), backgroundColor: '#35c2c1aa', yAxisID: 'y2' }
            ]
          },
          options: {
            responsive: true, plugins: { legend: { labels: { color: '#8fa1b3', font: { size: 11 } } } },
            scales: { x: { ticks: { color: '#8fa1b3' }, grid: { color: '#1e2b3d' } }, y1: { position: 'left', ticks: { color: '#8fa1b3' }, grid: { display: false } }, y2: { position: 'right', ticks: { color: '#8fa1b3' }, grid: { display: false } } }
          }
        });

        if (charts.years) charts.years.destroy();
        charts.years = new Chart(document.getElementById('chartYears'), {
          type: 'bar',
          data: { labels: r.yearsTable.map(y => 'N' + y.year), datasets: [{ label: 'EUseful P50 (kWh)', data: r.yearsTable.map(y => y.EUseful), backgroundColor: '#8b1a1aee' }] },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8fa1b3', maxRotation: 0 }, grid: { display: false } }, y: { ticks: { color: '#8fa1b3' }, grid: { color: '#1e2b3d' }, beginAtZero: false } } }
        });

        // Bell curve for P50/P90/P95 — linear numeric x-axis so markers land exactly on the curve,
        // with dots + inline text labels drawn directly on the curve (matching PVsyst's own style).
        const mean = r.P50 / 1000, sd = r.sigma / 100 * mean;
        const pdfAt = (x) => (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
        let curvePoints = [];
        for (let x = mean - 4 * sd; x <= mean + 4 * sd; x += sd / 25) { curvePoints.push({ x, y: pdfAt(x) }); }
        const p50Point = { x: mean, y: pdfAt(mean) };
        const p90Point = { x: r.P90 / 1000, y: pdfAt(r.P90 / 1000) };
        const p95Point = { x: r.P95 / 1000, y: pdfAt(r.P95 / 1000) };

        if (charts.bell) charts.bell.destroy();
        charts.bell = new Chart(document.getElementById('chartBell'), {
          type: 'line',
          data: {
            datasets: [
              { label: 'Phân phối xác suất', data: curvePoints, borderColor: '#e7edf3', backgroundColor: 'transparent', pointRadius: 0, tension: .3, parsing: false, order: 2 },
              { label: 'Mốc P50/P90/P95', data: [p50Point, p90Point, p95Point], showLine: false, pointRadius: 5, pointBackgroundColor: ['#f2a93b', '#35c2c1', '#35c2c1'], pointBorderColor: '#16202f', pointBorderWidth: 1.5, parsing: false, order: 1 }
            ]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { type: 'linear', ticks: { color: '#8fa1b3' }, grid: { display: false }, title: { display: true, text: 'MWh/năm', color: '#8fa1b3' } },
              y: { ticks: { color: '#8fa1b3' }, grid: { color: '#1e2b3d' } }
            }
          },
          plugins: [{
            id: 'bellLabels',
            afterDatasetsDraw(chart) {
              const ctx = chart.ctx, xScale = chart.scales.x, yScale = chart.scales.y;
              const drawLabel = (pt, label, color, dy) => {
                const px = xScale.getPixelForValue(pt.x), py = yScale.getPixelForValue(pt.y);
                ctx.save();
                ctx.fillStyle = color; ctx.font = '11px monospace'; ctx.textAlign = 'left';
                ctx.fillText(label, px + 8, py + (dy || -6));
                ctx.restore();
              };
              drawLabel(p50Point, 'P50 = ' + fmt(r.P50 / 1000, 1) + ' MWh', '#f2a93b', -8);
              drawLabel(p90Point, 'P90 = ' + fmt(r.P90 / 1000, 1) + ' MWh', '#35c2c1', -8);
              drawLabel(p95Point, 'P95 = ' + fmt(r.P95 / 1000, 1) + ' MWh', '#35c2c1', 16);
            }
          }]
        });

        renderLossDiagram(r);
      }
