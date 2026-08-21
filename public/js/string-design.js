      // ============================================================
      // STRING DESIGN CHECK — user enters modules/string + total strings;
      // we validate against Voc(cold)/Vmp(hot)/Vmp(cold)/MPPT window/current.
      // ============================================================
      // ============================================================
      // STRING GROUPS — the user may define several groups of strings with DIFFERENT
      // modules/string (non-uniform arrays). Total DC power = Σ over all groups.
      // Each group is checked for voltage independently (its own string length); the
      // current-per-input limit and the total string count are checked at system level.
      // ============================================================
      function stringGroupRowHtml(mps, ns) {
        return `<div class="string-group-row" style="display:grid; grid-template-columns:1fr 1fr auto; gap:8px; align-items:end; margin-bottom:6px;">
          <div class="field" style="margin:0;"><label>Số tấm/chuỗi</label><input type="number" step="1" class="grp-mps" value="${mps}" oninput="updateStringGroupSummary()"></div>
          <div class="field" style="margin:0;"><label>Số chuỗi</label><input type="number" step="1" class="grp-ns" value="${ns}" oninput="updateStringGroupSummary()"></div>
          <button type="button" class="btn btn-secondary" style="padding:6px 10px; margin-bottom:1px;" title="Xóa nhóm" onclick="removeStringGroup(this)">✕</button>
        </div>`;
      }
      function addStringGroup(mps, ns) {
        const body = document.getElementById('stringGroupsBody');
        const m = (mps !== undefined && mps !== null && !isNaN(mps)) ? mps : (parseFloat(document.getElementById('modulesPerStringInput').value) || 20);
        const n = (ns !== undefined && ns !== null && !isNaN(ns)) ? ns : 1;
        body.insertAdjacentHTML('beforeend', stringGroupRowHtml(m, n));
        updateStringGroupSummary();
      }
      function removeStringGroup(btn) {
        const body = document.getElementById('stringGroupsBody');
        const rows = body.querySelectorAll('.string-group-row');
        if (rows.length <= 1) { setStatus('Cần giữ ít nhất 1 nhóm chuỗi.', 'warn'); return; }
        btn.closest('.string-group-row').remove();
        updateStringGroupSummary();
      }
      function updateStringGroupSummary() {
        const el = document.getElementById('stringGroupSummary');
        if (!el) return;
        const groups = readStringGroups();
        const totalStrings = groups.reduce((s, g) => s + (g.numStrings || 0), 0);
        const totalModules = groups.reduce((s, g) => s + (g.modulesPerString || 0) * (g.numStrings || 0), 0);
        const modulePower = parseFloat(document.getElementById('modulePower').value) || 0;
        const kwp = totalModules * modulePower / 1000;
        el.textContent = `${groups.length} nhóm · tổng ${totalStrings} chuỗi · ${totalModules} tấm${modulePower ? ' · ~' + kwp.toFixed(1) + ' kWp' : ''}`;
      }
      // Returns the active configuration as an array of groups regardless of mode.
      function readStringGroups() {
        const mode = document.getElementById('stringConfigMode').value;
        if (mode === 'mixed') {
          const rows = document.querySelectorAll('#stringGroupsBody .string-group-row');
          const groups = [];
          rows.forEach(r => {
            const mps = parseFloat(r.querySelector('.grp-mps').value);
            const ns = parseFloat(r.querySelector('.grp-ns').value);
            if (!isNaN(mps) && !isNaN(ns) && mps > 0 && ns > 0) groups.push({ modulesPerString: mps, numStrings: ns });
          });
          if (groups.length === 0) groups.push({ modulesPerString: parseFloat(document.getElementById('modulesPerStringInput').value) || 0, numStrings: 0 });
          return groups;
        }
        return [{
          modulesPerString: parseFloat(document.getElementById('modulesPerStringInput').value),
          numStrings: parseFloat(document.getElementById('numStringsInput').value)
        }];
      }
      function toggleStringMode() {
        const mixed = document.getElementById('stringConfigMode').value === 'mixed';
        document.getElementById('uniformStringBlock').style.display = mixed ? 'none' : 'block';
        document.getElementById('mixedStringBlock').style.display = mixed ? 'block' : 'none';
        if (mixed) {
          const body = document.getElementById('stringGroupsBody');
          if (!body.querySelector('.string-group-row')) {
            addStringGroup(parseFloat(document.getElementById('modulesPerStringInput').value) || 20,
                           parseFloat(document.getElementById('numStringsInput').value) || 1);
          }
          updateStringGroupSummary();
        }
      }
      toggleStringMode();

      function validateStringDesign() {
        const Voc = parseFloat(document.getElementById('moduleVoc').value);
        const Vmp = parseFloat(document.getElementById('moduleVmp').value);
        const Isc = parseFloat(document.getElementById('moduleIsc').value);
        const Imp = parseFloat(document.getElementById('moduleImp').value);
        const tcVoc = parseFloat(document.getElementById('tempCoeffVoc').value);
        const tcPmax = parseFloat(document.getElementById('tempCoeff').value);
        const tMin = parseFloat(document.getElementById('tMinDesign').value);
        const tMaxCell = parseFloat(document.getElementById('tMaxCellDesign').value);
        const modulePower = parseFloat(document.getElementById('modulePower').value);
        const invVmax = parseFloat(document.getElementById('inverterVmaxDC').value);
        const mpptVmin = parseFloat(document.getElementById('inverterMpptVmin').value);
        const mpptVmax = parseFloat(document.getElementById('inverterMpptVmax').value);
        const maxCurrentPerMppt = parseFloat(document.getElementById('inverterMaxCurrentPerMppt').value);
        const maxCurrentPerInput = parseFloat(document.getElementById('inverterMaxCurrentPerInput').value);
        const maxIscPerMppt = parseFloat(document.getElementById('inverterMaxIscPerMppt').value);
        const mpptTrackers = parseFloat(document.getElementById('inverterMpptTrackers').value);
        const maxStringsPerTrackerPhysical = parseFloat(document.getElementById('inverterMaxStringsPerTracker').value);
        const inverterCount = parseFloat(document.getElementById('inverterCount').value);

        // Active configuration: 1 group in uniform mode, N groups in mixed mode.
        const rawGroups = readStringGroups();
        const numGroups = rawGroups.length;

        // Three independent current constraints per tracker, each checked against the current metric
        // that actually applies to it — the binding one is whichever gives the smallest string count:
        //  - "Max Current per MPPT" is the CONTINUOUS/OPERATING rating of the MPPT's electronics —
        //    checked against Imp (the current that actually flows during normal operation).
        //  - "Max Short-circuit Current per MPPT" is the hardware's absolute non-destructive ceiling
        //    for a fault condition — checked against Isc (the worst-case current a string can ever
        //    produce). These two ratings exist as separate datasheet numbers precisely because they
        //    protect against two different scenarios with two different currents — comparing both
        //    against Isc would make the short-circuit rating redundant (operating always binds first
        //    since it's numerically lower), which real datasheets wouldn't bother publishing separately.
        const maxStringsPerTrackerByOperating = Math.floor(maxCurrentPerMppt / Imp);
        const maxStringsPerTrackerByIsc = Math.floor(maxIscPerMppt / Isc);
        const maxStringsPerTrackerEffective = Math.min(maxStringsPerTrackerByOperating, maxStringsPerTrackerByIsc, maxStringsPerTrackerPhysical);
        const maxStringsPerInverter = mpptTrackers * maxStringsPerTrackerEffective;
        const maxStringsSystemTotal = maxStringsPerInverter * inverterCount;

        const issues = [];

        // Per-group voltage checks — each group's string length gives its own Voc/Vmp.
        const groups = rawGroups.map((g, gi) => {
          const M = g.modulesPerString;
          const VocCold = Voc * (1 + (tcVoc / 100) * (tMin - 25)) * M;
          const VmpHot = Vmp * (1 + (tcPmax / 100) * (tMaxCell - 25)) * M;
          const VmpCold = Vmp * (1 + (tcPmax / 100) * (tMin - 25)) * M;
          const prefix = numGroups > 1 ? `Nhóm ${gi + 1} (${M} tấm/chuỗi): ` : '';
          if (VocCold > invVmax) issues.push(`${prefix}Voc lạnh nhất (${VocCold.toFixed(0)}V) vượt V DC max của inverter (${invVmax}V).`);
          if (VmpCold > mpptVmax) issues.push(`${prefix}Vmp ở nhiệt độ thấp nhất (${VmpCold.toFixed(0)}V) vượt MPPT V max (${mpptVmax}V).`);
          if (VmpHot < mpptVmin) issues.push(`${prefix}Vmp ở nhiệt độ nóng nhất (${VmpHot.toFixed(0)}V) thấp hơn MPPT V min (${mpptVmin}V).`);
          return { index: gi + 1, modulesPerString: M, numStrings: g.numStrings, VocCold, VmpHot, VmpCold, dcKwp: M * g.numStrings * modulePower / 1000 };
        });

        // Current-per-input is a per-module limit — checked once (independent of grouping).
        if (!isNaN(maxCurrentPerInput) && Isc > maxCurrentPerInput) issues.push(`Isc module (${Isc}A) vượt dòng tối đa/1 đầu vào của inverter (${maxCurrentPerInput}A).`);

        // Total string count across ALL groups vs system capacity.
        const totalStrings = groups.reduce((s, g) => s + g.numStrings, 0);
        if (totalStrings > maxStringsSystemTotal) {
          const bindingReason = maxStringsPerTrackerByOperating <= maxStringsPerTrackerByIsc && maxStringsPerTrackerByOperating <= maxStringsPerTrackerPhysical ? 'dòng vận hành tối đa/MPPT'
            : (maxStringsPerTrackerByIsc <= maxStringsPerTrackerPhysical ? 'dòng ngắn mạch tối đa/MPPT' : 'giới hạn số đầu vào vật lý/tracker');
          issues.push(`Tổng số chuỗi (${totalStrings}) vượt khả năng hệ thống (tối đa ${maxStringsSystemTotal} = ${mpptTrackers} tracker × ${maxStringsPerTrackerEffective} chuỗi/tracker × ${inverterCount} bộ — ràng buộc bởi ${bindingReason}).`);
        }

        const actualModuleCount = groups.reduce((s, g) => s + g.modulesPerString * g.numStrings, 0);
        const actualDcKwp = actualModuleCount * modulePower / 1000;

        return {
          groups, numGroups, totalStrings, actualModuleCount, actualDcKwp,
          maxStringsPerTrackerEffective, maxStringsPerTrackerByOperating, maxStringsPerTrackerByIsc, maxStringsPerTrackerPhysical,
          maxStringsPerInverter, maxStringsSystemTotal, Isc, Imp, maxCurrentPerInput, maxCurrentPerMppt, maxIscPerMppt,
          // backward-compatible single-value fields (group 1) so older display code keeps working
          modulesPerString: groups[0].modulesPerString, numStrings: totalStrings,
          VocCold: groups[0].VocCold, VmpHot: groups[0].VmpHot, VmpCold: groups[0].VmpCold,
          ok: issues.length === 0, issues
        };
      }
