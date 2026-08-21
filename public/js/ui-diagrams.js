      function toggleRoof2() {
        const isFarm = document.getElementById('mountMode').value === 'farm';
        const two = !isFarm && document.getElementById('roofMode').value === '2';
        document.getElementById('roof2Block').style.display = two ? 'block' : 'none';
        document.getElementById('mixedOrientBlock').style.display = two ? 'block' : 'none';
        document.getElementById('face1Label').textContent = isFarm ? 'Góc nghiêng & hướng giàn' : (two ? 'Góc nghiêng & hướng mái 1' : 'Góc nghiêng & hướng mái');
      }
      function toggleMountMode() {
        const isFarm = document.getElementById('mountMode').value === 'farm';
        document.getElementById('roofOnlyBlock').style.display = isFarm ? 'none' : 'block';
        document.getElementById('farmOnlyBlock').style.display = isFarm ? 'block' : 'none';
        if (isFarm) document.getElementById('roofMode').value = '1';
        toggleRoof2();
      }
      toggleMountMode();
      toggleRoof2();

      // ============================================================
      // ROOF ORIENTATION DIAGRAM — side-profile (tilt) + compass (azimuth),
      // redraws live as the user edits tilt/azimuth/roof mode.
      // ============================================================
      function renderRoofDiagram() {
        const wrap = document.getElementById('roofDiagramWrap');
        if (!wrap) return;
        const isTwo = document.getElementById('roofMode').value === '2';
        const tilt1 = parseFloat(document.getElementById('tilt').value) || 0;
        const az1 = parseFloat(document.getElementById('azimuth').value) || 180;
        const tilt2 = isTwo ? (parseFloat(document.getElementById('tilt2').value) || 0) : null;
        const az2 = isTwo ? (parseFloat(document.getElementById('azimuth2').value) || 0) : null;

        const groundY = 95, L = 95; // side-profile geometry (px)
        let sideSvg;
        if (isTwo) {
          const t1 = tilt1 * Math.PI / 180, t2 = tilt2 * Math.PI / 180;
          const leftBase = { x: 35, y: groundY }, rightBase = { x: 225, y: groundY };
          const peak1 = { x: leftBase.x + L * Math.cos(t1), y: groundY - L * Math.sin(t1) };
          const peak2 = { x: rightBase.x - L * Math.cos(t2), y: groundY - L * Math.sin(t2) };
          sideSvg = `
      <line x1="10" y1="${groundY}" x2="250" y2="${groundY}" stroke="#3a4a5f" stroke-width="1.5"/>
      <line x1="${leftBase.x}" y1="${leftBase.y}" x2="${peak1.x}" y2="${peak1.y}" stroke="#f2a93b" stroke-width="4" stroke-linecap="round"/>
      <line x1="${rightBase.x}" y1="${rightBase.y}" x2="${peak2.x}" y2="${peak2.y}" stroke="#35c2c1" stroke-width="4" stroke-linecap="round"/>
      <line x1="${peak1.x}" y1="${peak1.y}" x2="${peak2.x}" y2="${peak2.y}" stroke="#8fa1b3" stroke-width="1.5" stroke-dasharray="3,2"/>
      <text x="${(leftBase.x + peak1.x) / 2 - 14}" y="${(leftBase.y + peak1.y) / 2 - 6}" fill="#f2a93b" font-size="11" font-family="monospace">${tilt1}°</text>
      <text x="${(rightBase.x + peak2.x) / 2 - 4}" y="${(rightBase.y + peak2.y) / 2 - 6}" fill="#35c2c1" font-size="11" font-family="monospace">${tilt2}°</text>
      <text x="${leftBase.x - 8}" y="${groundY + 14}" fill="#8fa1b3" font-size="10">Mái 1</text>
      <text x="${rightBase.x - 8}" y="${groundY + 14}" fill="#8fa1b3" font-size="10">Mái 2</text>
    `;
        } else {
          const t1 = tilt1 * Math.PI / 180;
          const base = { x: 60, y: groundY };
          const peak = { x: base.x + L * 1.4 * Math.cos(t1), y: groundY - L * 1.4 * Math.sin(t1) };
          sideSvg = `
      <line x1="10" y1="${groundY}" x2="250" y2="${groundY}" stroke="#3a4a5f" stroke-width="1.5"/>
      <line x1="${base.x}" y1="${base.y}" x2="${peak.x}" y2="${peak.y}" stroke="#f2a93b" stroke-width="4" stroke-linecap="round"/>
      <text x="${(base.x + peak.x) / 2 - 10}" y="${(base.y + peak.y) / 2 - 8}" fill="#f2a93b" font-size="11" font-family="monospace">${tilt1}°</text>
    `;
        }

        // top-down compass (azimuth): 0=N up, 90=E right, 180=S down, 270=W left (compass clockwise)
        const cx = 70, cy = 70, R = 42;
        function cardinalLabel(deg, text) {
          const a = deg * Math.PI / 180, rr = R + 16;
          const x = cx + rr * Math.sin(a), y = cy - rr * Math.cos(a);
          return `<text x="${x}" y="${y}" fill="#8fa1b3" font-size="11" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
        }
        function arrowFor(azDeg, color, label) {
          const a = azDeg * Math.PI / 180;
          const tipX = cx + R * Math.sin(a), tipY = cy - R * Math.cos(a);
          // Label sits INSIDE the circle (well short of the outer B/N/Đ/T ring) so it never
          // overlaps the cardinal letters, with a dark halo stroke for readability over the line.
          const labelR = R * 0.55;
          const lx = cx + labelR * Math.sin(a), ly = cy - labelR * Math.cos(a);
          return `<line x1="${cx}" y1="${cy}" x2="${tipX}" y2="${tipY}" stroke="${color}" stroke-width="3" marker-end="url(#arrowhead-${color.replace('#', '')})"/>
      <text x="${lx}" y="${ly}" fill="${color}" font-size="10" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="#16202f" stroke-width="3">${label}</text>`;
        }
        const compassSvg = `
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#3a4a5f" stroke-width="1"/>
    ${cardinalLabel(0, 'B')}
    ${cardinalLabel(180, 'N')}
    ${cardinalLabel(90, 'Đ')}
    ${cardinalLabel(270, 'T')}
    ${arrowFor(az1, '#f2a93b', 'M1')}
    ${isTwo ? arrowFor(az2, '#35c2c1', 'M2') : ''}
  `;

        wrap.innerHTML = `
    <div style="font-size:10px; color:var(--text-dim); letter-spacing:.5px; text-transform:uppercase; margin-bottom:6px;">Mặt cắt góc nghiêng</div>
    <svg viewBox="0 0 260 110" style="width:100%; height:auto;">${sideSvg}</svg>
    <div style="font-size:10px; color:var(--text-dim); letter-spacing:.5px; text-transform:uppercase; margin:8px 0 4px;">Hướng (nhìn từ trên xuống, B=Bắc)</div>
    <svg viewBox="0 0 140 140" style="width:140px; height:auto; display:block; margin:0 auto;">
      <defs>
        <marker id="arrowhead-f2a93b" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#f2a93b"/></marker>
        <marker id="arrowhead-35c2c1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#35c2c1"/></marker>
      </defs>
      ${compassSvg}
    </svg>
  `;
      }
      renderRoofDiagram();

      // ============================================================
      // FARM (GROUND-MOUNT RACKING) ROW-SPACING DIAGRAM — live GCR / row-to-row
      // self-shading preview. Uses the same "shading limit (profile) angle"
      // formula (Duffie & Beckman) that the physics engine applies hour-by-hour
      // during the real calculation — see rowShadeFraction() below.
      // ============================================================
      function renderFarmRowDiagram() {
        const wrap = document.getElementById('farmRowDiagramWrap');
        if (!wrap) return;
        const lat = parseFloat(document.getElementById('lat').value) || 21;
        const tiltDeg = Math.max(0.01, parseFloat(document.getElementById('tilt').value) || 0.01);
        const moduleLength = parseFloat(document.getElementById('farmModuleLength').value) || 0;
        const panelsSlope = Math.max(1, parseFloat(document.getElementById('farmPanelsSlope').value) || 1);
        const pitch = parseFloat(document.getElementById('farmPitch').value) || 0;
        const Lc = moduleLength * panelsSlope;
        const beta = tiltDeg * Math.PI / 180;
        const GCR = pitch > 0 ? (Lc / pitch) * 100 : 0;
        const limitAngleDeg = Math.atan2(Lc * Math.sin(beta), pitch - Lc * Math.cos(beta)) * 180 / Math.PI;
        // Solar elevation at true solar noon on the winter solstice (Dec 21, declination -23.45°),
        // for a due-south-facing array (Δγ=0 at solar noon, so profile angle = elevation angle there):
        // elevation_noon = 90° − |lat − decl| = 90° − |lat + 23.45°| for northern-hemisphere latitudes.
        const noonElevWinterDeg = Math.max(1, 90 - Math.abs(lat + 23.45));
        const elevRad = noonElevWinterDeg * Math.PI / 180;
        const suggestedPitch = Lc * Math.cos(beta) + Lc * Math.sin(beta) / Math.tan(elevRad);

        const groundY = 85, scale = 9; // px per meter, side-profile geometry
        const baseA = { x: 20, y: groundY };
        const peakA = { x: baseA.x + Lc * scale * Math.cos(beta), y: groundY - Lc * scale * Math.sin(beta) };
        const baseB = { x: baseA.x + pitch * scale, y: groundY };
        const peakB = { x: baseB.x + Lc * scale * Math.cos(beta), y: groundY - Lc * scale * Math.sin(beta) };
        // shading ray from the tip of row A, arriving at the limit angle — by construction it grazes baseB
        const rayLen = Math.max(0, baseB.x - peakA.x) / Math.cos(limitAngleDeg * Math.PI / 180) * 1.15 + 20;
        const rayEnd = { x: peakA.x + rayLen * Math.cos(limitAngleDeg * Math.PI / 180), y: peakA.y - rayLen * Math.sin(limitAngleDeg * Math.PI / 180) };
        const viewW = Math.max(260, baseB.x + Lc * scale + 30);

        wrap.innerHTML = `
    <div style="font-size:10px; color:var(--text-dim); letter-spacing:.5px; text-transform:uppercase; margin-bottom:6px;">Hình học hàng — mặt cắt vuông góc dãy</div>
    <svg viewBox="0 0 ${viewW} 100" style="width:100%; height:auto;">
      <line x1="5" y1="${groundY}" x2="${viewW - 5}" y2="${groundY}" stroke="#3a4a5f" stroke-width="1.5"/>
      <line x1="${baseA.x}" y1="${baseA.y}" x2="${peakA.x}" y2="${peakA.y}" stroke="#f2a93b" stroke-width="4" stroke-linecap="round"/>
      <line x1="${baseB.x}" y1="${baseB.y}" x2="${peakB.x}" y2="${peakB.y}" stroke="#35c2c1" stroke-width="4" stroke-linecap="round"/>
      <line x1="${peakA.x}" y1="${peakA.y}" x2="${rayEnd.x}" y2="${rayEnd.y}" stroke="#e2604f" stroke-width="1.3" stroke-dasharray="4,3"/>
      <line x1="${baseA.x}" y1="${groundY + 8}" x2="${baseB.x}" y2="${groundY + 8}" stroke="#8fa1b3" stroke-width="1"/>
      <text x="${(baseA.x + baseB.x) / 2 - 12}" y="${groundY + 19}" fill="#8fa1b3" font-size="9.5" font-family="monospace">pitch ${pitch ? pitch.toFixed(2) : '—'}m</text>
      <text x="${baseA.x - 4}" y="${groundY + 32}" fill="#8fa1b3" font-size="9">Hàng 1</text>
      <text x="${baseB.x - 4}" y="${groundY + 32}" fill="#8fa1b3" font-size="9">Hàng 2</text>
      <text x="${peakA.x + 3}" y="${peakA.y - 4}" fill="#e2604f" font-size="9" font-family="monospace">giới hạn ${isFinite(limitAngleDeg) ? limitAngleDeg.toFixed(1) : '—'}°</text>
    </svg>
    <table style="width:100%; font-family:var(--mono); font-size:11px; margin-top:6px; border-collapse:collapse;">
      <tr><td style="color:var(--text-dim); padding:2px 0;">Chiều rộng giàn theo mặt nghiêng (Lc)</td><td style="text-align:right;">${Lc.toFixed(2)} m</td></tr>
      <tr><td style="color:var(--text-dim); padding:2px 0;">GCR (Lc / pitch)</td><td style="text-align:right;">${GCR.toFixed(1)}%</td></tr>
      <tr><td style="color:var(--text-dim); padding:2px 0;">Góc giới hạn che bóng (profile angle)</td><td style="text-align:right;">${isFinite(limitAngleDeg) ? limitAngleDeg.toFixed(1) : '—'}°</td></tr>
      <tr><td style="color:var(--text-dim); padding:2px 0;">Pitch gợi ý — hết che lúc 12h trưa đông chí (21/12)</td><td style="text-align:right;">${suggestedPitch.toFixed(2)} m</td></tr>
    </table>
    <div class="hint">Góc giới hạn che bóng là góc nâng mặt trời (đo trong mặt phẳng vuông góc với hàng) mà dưới
      ngưỡng đó hàng phía sau bắt đầu bị che một phần bởi hàng phía trước. Pitch gợi ý tính cho giàn hướng chính
      Nam đúng thời điểm mặt trời qua kinh tuyến (12h trưa mặt trời, không phải 12h đồng hồ) ngày đông chí — ngày
      có góc nâng mặt trời buổi trưa thấp nhất trong năm ở Bắc bán cầu; đây là mốc thiết kế phổ biến cho farm.
      Công cụ tính tổn hao tự bóng ĐẦY ĐỦ theo từng giờ, từng tháng (kể cả khi giàn lệch hướng Nam) khi bấm
      "Tính toán" — số liệu trên chỉ là ước lượng nhanh để chọn pitch.</div>
  `;
      }
      renderFarmRowDiagram();
