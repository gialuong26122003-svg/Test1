      // ============================================================
      // DEVICE DATABASE — every value below is transcribed directly from the
      // manufacturer datasheets provided (STC electrical data). Each power bin of
      // a multi-wattage module line (e.g. Trina 645–670W, 740–760W) is listed as
      // its own entry so the exact Voc/Vmp/Isc for that specific wattage is used —
      // never interpolated or guessed between bins.
      // ============================================================
      const MODULE_DB = [
        // Trina Vertex N G3, TSM-NEG19RC.20Q, 645–670W (datasheet TSM_EN_2026_PA7)
        // Bifacial dual-glass, Power Bifaciality 85±5%; warranty: 1% year-1 degradation, 0.35%/year thereafter.
        { id: 'trina19rc-645', label: 'Trina TSM-NEG19RC.20Q — 645W', model: 'Trina Solar TSM-NEG19RC.20Q 645W', power: 645, voc: 49.78, vmp: 41.22, isc: 16.38, imp: 15.65, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina19rc-650', label: 'Trina TSM-NEG19RC.20Q — 650W', model: 'Trina Solar TSM-NEG19RC.20Q 650W', power: 650, voc: 50.00, vmp: 41.43, isc: 16.43, imp: 15.69, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina19rc-655', label: 'Trina TSM-NEG19RC.20Q — 655W', model: 'Trina Solar TSM-NEG19RC.20Q 655W', power: 655, voc: 50.25, vmp: 41.59, isc: 16.47, imp: 15.75, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina19rc-660', label: 'Trina TSM-NEG19RC.20Q — 660W', model: 'Trina Solar TSM-NEG19RC.20Q 660W', power: 660, voc: 50.45, vmp: 41.74, isc: 16.53, imp: 15.82, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina19rc-665', label: 'Trina TSM-NEG19RC.20Q — 665W', model: 'Trina Solar TSM-NEG19RC.20Q 665W', power: 665, voc: 50.70, vmp: 41.88, isc: 16.56, imp: 15.88, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina19rc-670', label: 'Trina TSM-NEG19RC.20Q — 670W', model: 'Trina Solar TSM-NEG19RC.20Q 670W', power: 670, voc: 50.95, vmp: 42.04, isc: 16.60, imp: 15.94, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        // Trina Vertex N G3, TSM-NEG21C.20Q, 740–760W (datasheet TSM_EN_2026_PA6)
        // Bifacial dual-glass, Power Bifaciality 85±5%; warranty: 1% year-1 degradation, 0.35%/year thereafter.
        { id: 'trina21c-740', label: 'Trina TSM-NEG21C.20Q — 740W', model: 'Trina Solar TSM-NEG21C.20Q 740W', power: 740, voc: 50.10, vmp: 42.10, isc: 18.69, imp: 17.58, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina21c-745', label: 'Trina TSM-NEG21C.20Q — 745W', model: 'Trina Solar TSM-NEG21C.20Q 745W', power: 745, voc: 50.30, vmp: 42.30, isc: 18.73, imp: 17.62, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina21c-750', label: 'Trina TSM-NEG21C.20Q — 750W', model: 'Trina Solar TSM-NEG21C.20Q 750W', power: 750, voc: 50.50, vmp: 42.50, isc: 18.77, imp: 17.66, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina21c-755', label: 'Trina TSM-NEG21C.20Q — 755W', model: 'Trina Solar TSM-NEG21C.20Q 755W', power: 755, voc: 50.70, vmp: 42.70, isc: 18.81, imp: 17.69, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        { id: 'trina21c-760', label: 'Trina TSM-NEG21C.20Q — 760W', model: 'Trina Solar TSM-NEG21C.20Q 760W', power: 760, voc: 50.90, vmp: 42.90, isc: 18.85, imp: 17.72, tcPmax: -0.26, tcVoc: -0.24, bifacial: 85, degYear1: 1, degAnnual: 0.35 },
        // LONGi Hi-MO X10 Scientist, LR7-72HVH, 650M (datasheet BGV03 20260509, N-type HPBC 2.0)
        // Monofacial (single-glass) — no bifacial rear-side gain. Warranty: 1% year-1 degradation, 0.35%/year thereafter.
        { id: 'longi-lr7-72hvh-650', label: 'LONGi LR7-72HVH — 650W', model: 'LONGi Solar LR7-72HVH-650M', power: 650, voc: 53.90, vmp: 44.56, isc: 15.29, imp: 14.59, tcPmax: -0.26, tcVoc: -0.20, degYear1: 1, degAnnual: 0.35 },
      ];

      const INVERTER_DB = [
        // Huawei SUN2000-150K-MG0 (full datasheet)
        {
          id: 'huawei-150k-mg0', label: 'Huawei SUN2000-150K-MG0', model: 'Huawei SUN2000-150K-MG0', acPower: 150, eff: 98.6,
          vmaxDC: 1100, mpptVmin: 200, mpptVmax: 1000, maxCurrentPerMppt: 48, maxCurrentPerInput: 23, maxIscPerMppt: 66, mpptTrackers: 7, maxStringsPerTracker: 3
        },
        // Huawei SUN2000-100KTL-M2 / 115KTL-M2 — full specs from official datasheets
        // (solar.huawei.com/admin/asset/.../SUN2000-100KTL-M2 & 115KTL-M2, verified via search).
        {
          id: 'huawei-100ktl-m2', label: 'Huawei SUN2000-100KTL-M2', model: 'Huawei SUN2000-100KTL-M2', acPower: 100, eff: 98.6,
          vmaxDC: 1100, mpptVmin: 200, mpptVmax: 1000, maxCurrentPerMppt: 30, maxCurrentPerInput: 20, maxIscPerMppt: 40, mpptTrackers: 10, maxStringsPerTracker: 2
        },
        {
          id: 'huawei-115ktl-m2', label: 'Huawei SUN2000-115KTL-M2', model: 'Huawei SUN2000-115KTL-M2', acPower: 115, eff: 98.6,
          vmaxDC: 1100, mpptVmin: 200, mpptVmax: 1000, maxCurrentPerMppt: 30, maxCurrentPerInput: 20, maxIscPerMppt: 40, mpptTrackers: 10, maxStringsPerTracker: 2
        },
        // Solis S6-GC3P(150-200)K07-ND (full datasheet)
        {
          id: 'solis-150k07-nv', label: 'Solis S6-GC3P150K07-NV-ND', model: 'Solis S6-GC3P150K07-NV-ND', acPower: 150, eff: 98.8,
          vmaxDC: 1100, mpptVmin: 160, mpptVmax: 1000, maxCurrentPerMppt: 54, maxIscPerMppt: 75, mpptTrackers: 7, maxStringsPerTracker: 3
        },
        {
          id: 'solis-200k07-hv', label: 'Solis S6-GC3P200K07-HV-ND', model: 'Solis S6-GC3P200K07-HV-ND', acPower: 200, eff: 98.8,
          vmaxDC: 1100, mpptVmin: 160, mpptVmax: 1000, maxCurrentPerMppt: 54, maxIscPerMppt: 75, mpptTrackers: 7, maxStringsPerTracker: 3
        },
        // Solis S6-GC(80-125)K (full datasheet, Vietnamese)
        {
          id: 'solis-80k', label: 'Solis S6-GC80K', model: 'Solis S6-GC80K', acPower: 80, eff: 98.7,
          vmaxDC: 1100, mpptVmin: 160, mpptVmax: 1000, maxCurrentPerMppt: 42, maxIscPerMppt: 50, mpptTrackers: 8, maxStringsPerTracker: 2
        },
        {
          id: 'solis-100k', label: 'Solis S6-GC100K', model: 'Solis S6-GC100K', acPower: 100, eff: 98.7,
          vmaxDC: 1100, mpptVmin: 160, mpptVmax: 1000, maxCurrentPerMppt: 42, maxIscPerMppt: 50, mpptTrackers: 10, maxStringsPerTracker: 2
        },
        {
          id: 'solis-110k', label: 'Solis S6-GC110K', model: 'Solis S6-GC110K', acPower: 110, eff: 98.7,
          vmaxDC: 1100, mpptVmin: 160, mpptVmax: 1000, maxCurrentPerMppt: 42, maxIscPerMppt: 50, mpptTrackers: 10, maxStringsPerTracker: 2
        },
        {
          id: 'solis-125k', label: 'Solis S6-GC125K', model: 'Solis S6-GC125K', acPower: 125, eff: 98.7,
          vmaxDC: 1100, mpptVmin: 160, mpptVmax: 1000, maxCurrentPerMppt: 42, maxIscPerMppt: 50, mpptTrackers: 10, maxStringsPerTracker: 2
        },
      ];

      function populateDeviceDropdowns() {
        const ms = document.getElementById('moduleSelect');
        MODULE_DB.forEach(m => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.label; ms.appendChild(o); });
        const is = document.getElementById('inverterSelect');
        INVERTER_DB.forEach(v => { const o = document.createElement('option'); o.value = v.id; o.textContent = v.label; is.appendChild(o); });
      }
      populateDeviceDropdowns();

      function applyModuleSelection() {
        const id = document.getElementById('moduleSelect').value;
        if (!id) return;
        const m = MODULE_DB.find(x => x.id === id);
        if (!m) return;
        document.getElementById('moduleModel').value = m.model;
        document.getElementById('modulePower').value = m.power;
        document.getElementById('moduleVoc').value = m.voc;
        document.getElementById('moduleVmp').value = m.vmp;
        document.getElementById('moduleIsc').value = m.isc;
        document.getElementById('moduleImp').value = m.imp;
        document.getElementById('tempCoeff').value = m.tcPmax;
        document.getElementById('tempCoeffVoc').value = m.tcVoc;
        let notes = [];
        // Always clear bifacial gain on module change — it's mounting/albedo-dependent and must
        // never silently carry over from a previously selected module (e.g. switching from a
        // bifacial panel to this monofacial one must not leave a stale rear-side gain applied).
        document.getElementById('bifacialGain').value = 0;
        if (m.bifacial !== undefined) {
          notes.push('tấm bifacial (hệ số 2 mặt ' + m.bifacial + '±5% theo datasheet) — tự chọn % tăng công suất mặt sau phù hợp điều kiện lắp đặt thực tế, mặc định để 0');
        } else {
          notes.push('tấm monofacial (1 mặt) — không áp dụng bifacial gain');
        }
        if (m.degYear1 !== undefined && m.degAnnual !== undefined) {
          document.getElementById('degYear1').value = m.degYear1;
          document.getElementById('degAnnual').value = m.degAnnual;
          notes.push('đã điền suy giảm 25 năm theo đúng warranty: năm 1 -' + m.degYear1 + '%, các năm sau -' + m.degAnnual + '%/năm');
        }
        if (notes.length) setStatus('Đã điền thông số ' + m.model + '. ' + notes.join('; ') + '.', 'ok');
      }

      function applyInverterSelection() {
        const id = document.getElementById('inverterSelect').value;
        if (!id) return;
        const v = INVERTER_DB.find(x => x.id === id);
        if (!v) return;
        document.getElementById('inverterModel').value = v.model;
        document.getElementById('inverterPower').value = v.acPower;
        document.getElementById('inverterEff').value = v.eff;
        // Set the field if the datasheet has this value — otherwise CLEAR it (don't leave a stale
        // number from whichever inverter was selected before, which would look like real data).
        const fieldSpecs = [
          ['inverterVmaxDC', v.vmaxDC, 'V DC max'],
          ['inverterMpptVmin', v.mpptVmin, 'MPPT V min'],
          ['inverterMpptVmax', v.mpptVmax, 'MPPT V max'],
          ['inverterMaxCurrentPerMppt', v.maxCurrentPerMppt, 'Dòng vào tối đa/MPPT'],
          ['inverterMaxCurrentPerInput', v.maxCurrentPerInput, 'Dòng tối đa/1 đầu vào'],
          ['inverterMaxIscPerMppt', v.maxIscPerMppt, 'Dòng ngắn mạch tối đa/MPPT'],
          ['inverterMpptTrackers', v.mpptTrackers, 'Số MPPT tracker/bộ'],
          ['inverterMaxStringsPerTracker', v.maxStringsPerTracker, 'Số chuỗi tối đa/tracker'],
        ];
        let missing = [];
        fieldSpecs.forEach(([fieldId, val, label]) => {
          document.getElementById(fieldId).value = (val !== undefined) ? val : '';
          if (val === undefined) missing.push(label);
        });
        if (missing.length) {
          setStatus('⚠ ' + v.model + ': datasheet không có sẵn — ' + missing.join(', ') + '. Các ô đó đã để trống, cần bổ sung thủ công nếu cần.', 'warn');
        } else {
          setStatus('Đã điền thông số ' + v.model + ' theo datasheet.', 'ok');
        }
      }
