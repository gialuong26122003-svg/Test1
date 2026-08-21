      async function fetchClimateData(lat, lon, startYear, endYear) {
        const params = new URLSearchParams({ lat, lon });
        if (startYear) params.set('startyear', startYear);
        if (endYear) params.set('endyear', endYear);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for frontend
        try {
          const res = await fetch(`/api/solar/monthly?${params.toString()}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Lỗi kết nối Backend (HTTP ${res.status})`);
          }
          return await res.json();
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      }

      // Tracks whether confirmClimateData() has ever succeeded — runCalculation() warns via
      // modal instead of silently computing off the (possibly stale/default) manual fields.
      let climateDataFetched = false;

      // Called by the "Xác nhận" button in step 2 — fetches PVGIS monthly GHI/temperature
      // averaged over [startYear, endYear] and fills the (readonly) manualGHI/manualTemp fields,
      // which runCalculation() always reads from.
      async function confirmClimateData() {
        const lat = parseFloat(document.getElementById('lat').value);
        const lon = parseFloat(document.getElementById('lon').value);
        const startYear = parseInt(document.getElementById('climateStartYear').value, 10);
        const endYear = parseInt(document.getElementById('climateEndYear').value, 10);
        if (isNaN(lat) || isNaN(lon)) { setStatus('Vui lòng nhập Vĩ độ / Kinh độ hợp lệ.', 'err'); return; }
        if (isNaN(startYear) || isNaN(endYear) || startYear > endYear) {
          setStatus('Năm bắt đầu phải nhỏ hơn hoặc bằng Năm kết thúc.', 'err'); return;
        }
        setStatus('⏳ Đang lấy dữ liệu bức xạ/nhiệt độ từ PVGIS (có thể mất 10-30 giây)…');
        try {
          const result = await fetchClimateData(lat, lon, startYear, endYear);
          const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          const monthlyTotals = result.data.ghiArr.map((v, i) => (v * daysInMonth[i]).toFixed(2));
          document.getElementById('manualGHI').value = monthlyTotals.join(' ');
          document.getElementById('manualTemp').value = result.data.tempArr.map(v => v.toFixed(2)).join(' ');
          const yearsLabel = startYear === endYear ? `năm ${startYear}` : `trung bình ${endYear - startYear + 1} năm (${startYear}–${endYear})`;
          setStatus(`✓ Đã lấy dữ liệu ${yearsLabel} từ ${result.source}.`, 'ok');
          climateDataFetched = true;
        } catch (e) {
          setStatus('❌ Không lấy được dữ liệu — ' + (e.message || String(e)) + '. Hãy thử lại hoặc nhập dữ liệu thủ công.', 'err');
        }
      }
