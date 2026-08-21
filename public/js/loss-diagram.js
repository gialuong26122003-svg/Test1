      function lossRow(value, label, isGain) {
        const sign = isGain ? '+' : '−';
        const color = isGain ? 'var(--green)' : 'var(--text-dim)';
        return `<div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:11px; padding:3px 0; border-bottom:1px dashed var(--line);">
    <span style="color:${color}">${sign}${fmt(Math.abs(value), 2)}%</span><span style="color:var(--text-dim)">${label}</span>
  </div>`;
      }
      function milestoneRow(value, label) {
        return `<div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:12px; font-weight:600; padding:6px 0; border-bottom:2px solid var(--line); margin-top:4px;">
    <span>${fmt(value, 0)} kWh</span><span>${label}</span>
  </div>`;
      }
      // Builds one funnel section as a single SVG (shape + all text drawn together so everything
      // lines up pixel-perfectly — mixing HTML text next to an SVG shape is fragile to keep aligned).
      // rows: ordered array of {type:'box', value, unit, label} | {type:'loss', pct, label, isGain}
      function buildFunnelSVG(rows) {
        const rowH = 26, padTop = 14, padBottom = 10;
        const leftX = 14, maxW = 190, minW = 120;
        const textX = leftX + maxW + 22;
        const svgW = 560, svgH = padTop + rows.length * rowH + padBottom;

        // Interpolate a numeric value at every row (box rows are exact; loss rows sit between
        // the two nearest box rows) purely to drive the funnel's taper width.
        let boxIdx = []; rows.forEach((r, i) => { if (r.type === 'box') boxIdx.push(i); });
        let vals = new Array(rows.length).fill(0);
        rows.forEach((row, i) => {
          if (row.type === 'box') { vals[i] = row.value; return; }
          let prev = null, next = null;
          boxIdx.forEach(bi => { if (bi < i) prev = bi; if (bi > i && next === null) next = bi; });
          if (prev === null) vals[i] = rows[next].value;
          else if (next === null) vals[i] = rows[prev].value;
          else { const f = (i - prev) / (next - prev); vals[i] = rows[prev].value + (rows[next].value - rows[prev].value) * f; }
        });
        const maxV = Math.max(...vals), minV = Math.min(...vals);
        const widthAt = (v) => minW + (maxV > minV ? (v - minV) / (maxV - minV) : 1) * (maxW - minW);

        let leftPts = [], rightPts = [];
        rows.forEach((row, i) => {
          const y = padTop + i * rowH;
          const w = widthAt(vals[i]);
          const cx = leftX + maxW / 2;
          leftPts.push([cx - w / 2, y]); rightPts.push([cx + w / 2, y]);
        });
        // last row's bottom edge
        const lastY = padTop + rows.length * rowH;
        const lastW = widthAt(vals[vals.length - 1]);
        const cx = leftX + maxW / 2;
        leftPts.push([cx - lastW / 2, lastY]); rightPts.push([cx + lastW / 2, lastY]);

        const pathD = 'M ' + leftPts.map(p => p.join(',')).join(' L ') + ' L ' + rightPts.slice().reverse().map(p => p.join(',')).join(' L ') + ' Z';

        let elements = [`<path d="${pathD}" fill="#f2a93b14" stroke="#3a4a5f" stroke-width="1.2"/>`];
        rows.forEach((row, i) => {
          const yTop = padTop + i * rowH, yMid = yTop + rowH / 2, yBottom = yTop + rowH;
          const w = widthAt(vals[i]);
          const rEdge = leftX + maxW / 2 + w / 2;
          if (row.type === 'box') {
            elements.push(`<line x1="${leftX + maxW / 2 - w / 2}" y1="${yBottom}" x2="${leftX + maxW / 2 + w / 2}" y2="${yBottom}" stroke="#8fa1b3" stroke-width="1"/>`);
            elements.push(`<text x="${textX}" y="${yMid + 4}" font-family="monospace" font-size="12" font-weight="700" fill="${row.final ? '#f2a93b' : '#e7edf3'}">${fmt(row.value, 0)} ${row.unit}</text>`);
            elements.push(`<text x="${textX}" y="${yMid + 18}" font-family="monospace" font-size="10" fill="#8fa1b3">${row.label}</text>`);
          } else {
            const sign = row.isGain ? '+' : '−';
            const color = row.isGain ? '#4caf7d' : '#8fa1b3';
            elements.push(`<path d="M ${rEdge} ${yMid} q 10,0 14,-6" stroke="#3a4a5f" stroke-width="1" fill="none"/>`);
            elements.push(`<text x="${textX}" y="${yMid + 3}" font-family="monospace" font-size="10.5" fill="${color}">${sign}${fmt(Math.abs(row.pct), 2)}%</text>`);
            elements.push(`<text x="${textX + 58}" y="${yMid + 3}" font-family="monospace" font-size="10.5" fill="#8fa1b3">${row.label}</text>`);
          }
        });
        return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%; height:auto; display:block;">${elements.join('')}</svg>`;
      }

      function renderLossDiagram(r) {
        const irradLossPct = (1 - r.afterIrradiance / r.arrayNominal_y) * 100;
        const tempLossPct = (1 - (r.afterTemp / r.afterIrradiance)) * 100;
        const qualPct = -(1 - (r.afterQuality / r.afterTemp)) * 100; // negative of loss = shows as gain if quality input negative
        const mismatchPct = (1 - (r.afterMismatch / r.afterQuality)) * 100;
        const ohmicPct = (1 - (r.afterOhmic / r.afterMismatch)) * 100;
        const mixedPct = (1 - (r.afterMixedOrient / r.afterOhmic)) * 100;
        const soilPct = (1 - (r.afterSoiling / r.afterMixedOrient)) * 100;
        const invPct = (1 - r.inverterEff) * 100;
        const clipPct = r.clippingLossPct;
        const availPct = (1 - (r.E_y / r.afterClipping)) * 100;
        const iamPct = (1 - (r.POAeff_y / r.POA_y)) * 100;

        const irradRows = [
          ...(r.isFarm && r.selfShadingLossPct > 0.01 ? [
            { type: 'box', value: r.POA_y_noShade, unit: 'kWh/m²', label: 'Global incident (chưa trừ tự bóng hàng-hàng)' },
            { type: 'loss', pct: r.selfShadingLossPct, label: 'Tự bóng hàng-hàng (row-to-row self-shading)' },
          ] : []),
          { type: 'box', value: r.POA_y, unit: 'kWh/m²', label: 'Global incident in coll. plane' },
          { type: 'loss', pct: iamPct, label: 'IAM factor (Fresnel+AR)' },
          { type: 'box', value: r.POAeff_y, unit: 'kWh/m²', label: 'Effective irradiation on collectors' },
        ];
        const frontSideOnly = r.bifacialGain ? r.arrayNominal_y / (1 + r.bifacialGain / 100) : r.arrayNominal_y;
        const energyRows = [
          ...(r.bifacialGain > 0 ? [
            { type: 'box', value: frontSideOnly, unit: 'kWh', label: 'Array nominal energy — mặt trước (STC)' },
            { type: 'loss', pct: r.bifacialGain, label: 'Bifacial gain (mặt sau)', isGain: true },
          ] : []),
          { type: 'box', value: r.arrayNominal_y, unit: 'kWh', label: 'Array nominal energy (STC)' },
          { type: 'loss', pct: irradLossPct, label: 'PV loss do cường độ bức xạ thấp' },
          { type: 'loss', pct: tempLossPct, label: 'PV loss do nhiệt độ' },
          { type: 'loss', pct: qualPct, label: 'Module quality', isGain: qualPct < 0 },
          { type: 'loss', pct: mismatchPct, label: 'Mismatch modules/strings' },
          { type: 'loss', pct: ohmicPct, label: 'Ohmic wiring (DC+AC)' },
          ...(r.isTwoRoof ? [{ type: 'loss', pct: mixedPct, label: 'Mixed orientation mismatch' }] : []),
          { type: 'loss', pct: soilPct, label: 'Bụi bẩn (soiling)' },
          { type: 'box', value: r.afterSoiling, unit: 'kWh', label: 'Array virtual energy at MPP' },
          { type: 'loss', pct: invPct, label: 'Inverter loss (hiệu suất)' },
          ...(clipPct > 0.01 ? [{ type: 'loss', pct: clipPct, label: 'Clipping (vượt công suất AC inverter)' }] : []),
          { type: 'box', value: r.afterClipping, unit: 'kWh', label: 'Available energy at inverter output' },
          { type: 'loss', pct: availPct, label: 'Khả dụng hệ thống' },
          { type: 'box', value: r.E_y, unit: 'kWh', label: 'Energy injected into grid', final: true },
        ];

        document.getElementById('lossDiagramWrap').innerHTML = buildFunnelSVG(irradRows) + '<div style="height:10px;"></div>' + buildFunnelSVG(energyRows);
      }
