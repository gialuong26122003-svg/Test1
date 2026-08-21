      async function computeOneFace(lat, lon, faceDcKwp, tilt, azimuth, tempCoeff, albedo, Uc, rowShade) {
        const monthlyTotals = parseCsvNumbers(document.getElementById('manualGHI').value);
        const tempArr = parseCsvNumbers(document.getElementById('manualTemp').value);
        if (monthlyTotals.length < 12 || tempArr.length < 12) throw new Error('MANUAL_DATA_INCOMPLETE');
        // Field holds monthly TOTAL irradiation (kWh/m²/month, matching PVGIS/Meteonorm display) —
        // convert to daily average here since the physics engine below works in kWh/m²/day.
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const ghiArr = monthlyTotals.map((v, i) => v / daysInMonth[i]);
        return buildFaceResult(ghiArr, tempArr, tilt, azimuth, lat, albedo, Uc, tempCoeff, faceDcKwp, false, 'Bức xạ/nhiệt độ theo tháng (PVGIS hoặc nhập tay)', rowShade);
      }
      // Entry point for the "Tính toán" button — warns via modal if the user never fetched
      // PVGIS data, since computing would silently use whatever is in manualGHI/manualTemp.
      function runCalculation() {
        if (!climateDataFetched) {
          document.getElementById('climateWarnModal').classList.add('show');
          return;
        }
        performCalculation();
      }

      function closeClimateWarnModal() {
        document.getElementById('climateWarnModal').classList.remove('show');
      }

      function proceedCalculationAnyway() {
        closeClimateWarnModal();
        performCalculation();
      }

      async function performCalculation() {
        setStatus('⏳ Đang tính toán (quá trình có thể mất vài giây)…');
        
        // Cache ALL DOM values at once (avoid repeated DOM reads in loops)
        const domValues = {
          lat: parseFloat(document.getElementById('lat').value),
          lon: parseFloat(document.getElementById('lon').value),
          albedo: parseFloat(document.getElementById('albedo').value) || 0.2,
          tempCoeff: parseFloat(document.getElementById('tempCoeff').value),
          mountMode: document.getElementById('mountMode').value,
          isTwoRoof: document.getElementById('mountMode').value !== 'farm' && document.getElementById('roofMode').value === '2',
          farmModuleLength: parseFloat(document.getElementById('farmModuleLength').value) || 0,
          farmPanelsSlope: Math.max(1, parseFloat(document.getElementById('farmPanelsSlope').value) || 1),
          farmPitch: parseFloat(document.getElementById('farmPitch').value) || 0,
          farmUc: parseFloat(document.getElementById('farmUc').value) || 29,
          lifetime: parseInt(document.getElementById('lifetime').value),
          inverterPower: parseFloat(document.getElementById('inverterPower').value),
          inverterCount: parseFloat(document.getElementById('inverterCount').value),
          tilt: parseFloat(document.getElementById('tilt').value),
          azimuth: parseFloat(document.getElementById('azimuth').value),
          tilt2: parseFloat(document.getElementById('tilt2').value),
          azimuth2: parseFloat(document.getElementById('azimuth2').value),
          roofRatio1: parseFloat(document.getElementById('roofRatio1').value),
          bifacialGain: parseFloat(document.getElementById('bifacialGain').value) || 0,
          lossMixedOrientation: parseFloat(document.getElementById('lossMixedOrientation').value) || 0,
          weatherVariability: parseFloat(document.getElementById('weatherVariability').value) || 0,
          uncModule: parseFloat(document.getElementById('uncModule').value) || 0,
          uncInverter: parseFloat(document.getElementById('uncInverter').value) || 0,
          uncSoilingMismatch: parseFloat(document.getElementById('uncSoilingMismatch').value) || 0,
          uncDegradation: parseFloat(document.getElementById('uncDegradation').value) || 0,
          degYear1: parseFloat(document.getElementById('degYear1').value),
          degAnnual: parseFloat(document.getElementById('degAnnual').value),
          dispersionRate: parseFloat(document.getElementById('dispersionRate').value),
          projName: document.getElementById('projName').value,
          moduleModel: document.getElementById('moduleModel').value,
          inverterModel: document.getElementById('inverterModel').value,
          tMinDesign: parseInt(document.getElementById('tMinDesign').value),
          tMaxCellDesign: parseInt(document.getElementById('tMaxCellDesign').value),
          inverterVmaxDC: parseInt(document.getElementById('inverterVmaxDC').value),
          inverterMpptVmax: parseInt(document.getElementById('inverterMpptVmax').value),
          inverterMpptVmin: parseInt(document.getElementById('inverterMpptVmin').value),
          inverterMaxCurrentPerInput: parseInt(document.getElementById('inverterMaxCurrentPerInput').value),
          inverterMpptTrackers: parseInt(document.getElementById('inverterMpptTrackers').value),
          inverterMaxStringsPerTracker: parseInt(document.getElementById('inverterMaxStringsPerTracker').value),
          inverterMaxCurrentPerMppt: parseInt(document.getElementById('inverterMaxCurrentPerMppt').value),
          inverterMaxIscPerMppt: parseInt(document.getElementById('inverterMaxIscPerMppt').value),
          inverterEff: parseFloat(document.getElementById('inverterEff').value)
        };
        
        const { lat, lon, albedo, tempCoeff, isTwoRoof, lifetime, inverterPower, inverterCount, mountMode } = domValues;
        const isFarm = mountMode === 'farm';
        // Uc = PVsyst-style thermal loss factor. Roof racks sit close to a deck (limited airflow on
        // the back) → 20 W/m²K ("semi-integrated" preset). Farm/ground-mount racking is free-standing
        // and ventilated on both faces → runs cooler, so it defaults to PVsyst's "Free-standing" 29
        // W/m²K unless the user overrides it with a measured value.
        const Uc = isFarm ? domValues.farmUc : 20;
        const acKw = inverterPower * inverterCount;

        // Row-to-row self-shading geometry (farm mode only) — Lc = slant height of one row
        // (module length along the slope × how many panels are stacked up the slope), D = pitch
        // (centre-to-centre row spacing). Passed through to the hourly physics engine so beam
        // irradiance is reduced whenever the sun's profile angle falls below the shading-limit angle.
        let rowShade = null;
        if (isFarm) {
          const farmLc = domValues.farmModuleLength * domValues.farmPanelsSlope;
          if (farmLc > 0 && domValues.farmPitch > 0) rowShade = { Lc: farmLc, D: domValues.farmPitch };
        }

        // 1) string design (independent of irradiance)
        const sd = validateStringDesign();
        if (!sd.ok) { setStatus('Cấu hình chuỗi không hợp lệ — xem cảnh báo chi tiết bên dưới.', 'err'); }
        const dcKwp = sd.actualDcKwp;

        let faces;
        if (isTwoRoof) {
          const ratio1 = Math.min(100, Math.max(0, domValues.roofRatio1 || 50)) / 100;
          faces = [
            { tilt: domValues.tilt, azimuth: domValues.azimuth, ratio: ratio1 },
            { tilt: domValues.tilt2, azimuth: domValues.azimuth2, ratio: 1 - ratio1 }
          ];
        } else {
          faces = [{ tilt: domValues.tilt, azimuth: domValues.azimuth, ratio: 1 }];
        }

        const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        let combinedPOA = new Array(12).fill(0), combinedPOAeff = new Array(12).fill(0), combinedTempW = new Array(12).fill(0);
        let combinedGHI = new Array(12).fill(0), combinedDiffuse = new Array(12).fill(0), combinedTamb = new Array(12).fill(null);
        // combinedHourlyPowerSTC[month][hour] = total system DC power (kW), already temperature-derated,
        // BEFORE static DC losses (irradiance-level/quality/mismatch/ohmic/soiling) and BEFORE inverter —
        // summed across roof faces (each face contributes its own dcKwp × that face's hourly irradiance shape).
        let combinedHourlyPowerSTC = Array.from({ length: 12 }, () => new Array(24).fill(0));
        let POA_y = 0, POA_y_noShade = 0, POAeff_y = 0, engines = [];
        const bifacialFactor = 1 + domValues.bifacialGain / 100;
        setStatus('⏳ Đang tính toán mặt 1/' + faces.length + '…');

        for (const face of faces) {
          const faceDcKwp = dcKwp * face.ratio;
          if (faceDcKwp <= 0) continue;
          let result;
          try {
            result = await computeOneFace(lat, lon, faceDcKwp, face.tilt, face.azimuth, tempCoeff, albedo, Uc, rowShade);
          } catch (e) {
            if (e.message === 'MANUAL_DATA_INCOMPLETE') {
              setStatus('Cần đủ 12 giá trị bức xạ và nhiệt độ.', 'err');
            }
            return;
          }
          engines.push(result.engine);
          result.monthly.forEach((m, i) => {
            combinedPOA[i] += m.H_m * face.ratio;
            combinedPOAeff[i] += m.H_m_eff * face.ratio;
            combinedTempW[i] += m.avgTempFactor * m.H_m_eff * face.ratio;
            if (m.ghiTotal != null) { combinedGHI[i] += m.ghiTotal * face.ratio; combinedDiffuse[i] += m.diffuseTotal * face.ratio; combinedTamb[i] = m.tAmb; }
            if (m.hourlyEff) {
              for (let h = 0; h < 24; h++) { combinedHourlyPowerSTC[i][h] += faceDcKwp * (m.hourlyEff[h] / 1000) * bifacialFactor; }
            }
          });
          POA_y += result.POA_y * face.ratio;
          POA_y_noShade += result.POA_y_noShade * face.ratio;
          POAeff_y += result.POAeff_y * face.ratio;
        }
        // Annual row-to-row self-shading loss (farm mode only) — informational figure comparing
        // GlobInc with vs. without the row-shading reduction; already baked into POA_y/POAeff_y
        // above (and therefore into every downstream energy figure), NOT an extra multiplier.
        const selfShadingLossPct = (isFarm && POA_y_noShade > 0) ? Math.max(0, (1 - POA_y / POA_y_noShade) * 100) : 0;

        setStatus('⏳ Đang tính toán tổn hao…');
        
        // 2) apply the detailed PVsyst-style loss cascade
        const L = sumLossPctExceptTemp();
        const inverterEff = parseFloat(document.getElementById('inverterEff').value) / 100;
        const mixedOrient = isTwoRoof ? domValues.lossMixedOrientation : 0;

        const arrayNominal_y = POAeff_y * dcKwp * bifacialFactor; // kWh, "Array nominal energy (at STC effic.)" — includes bifacial rear-side gain if set
        const afterIrradiance = arrayNominal_y * (1 - L.irr / 100);
        // energy-weighted annual temp factor
        let tempWSum = 0, effWSum = 0;
        for (let i = 0; i < 12; i++) { tempWSum += combinedTempW[i]; effWSum += combinedPOAeff[i]; }
        const annualTempFactor = effWSum > 0 ? tempWSum / effWSum : 1;
        const afterTemp = afterIrradiance * annualTempFactor;
        const afterQuality = afterTemp * (1 - L.qual / 100);
        const afterMismatch = afterQuality * (1 - L.mismatch / 100);
        const afterOhmic = afterMismatch * (1 - L.ohmic / 100);
        const afterMixedOrient = afterOhmic * (1 - mixedOrient / 100);
        const afterSoiling = afterMixedOrient * (1 - L.soiling / 100); // soiling reduces irradiance BEFORE the inverter, so it belongs here (affects clipping likelihood too)
        const arrayVirtualMPP = afterSoiling;

        // Static DC-side factor (everything already applied above as a fraction of arrayNominal_y,
        // expressed as one multiplier) applied hour-by-hour to the STC/temp-adjusted power profile,
        // so clipping is evaluated against the inverter's actual AC capacity at each hour.
        // Exclude the temperature factor here — it's already baked into combinedHourlyPowerSTC
        // per hour (via hourlyEff's tempFactor_h). Applying it again here would double-count it.
        const staticDcFactor = (arrayNominal_y > 0 && annualTempFactor > 0) ? arrayVirtualMPP / (arrayNominal_y * annualTempFactor) : 0;
        const daysInMonthArr = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let clippedEnergy = 0, preClipAcEnergy = 0, postClipAcEnergy = 0;
        let monthlyEGridPreAvail = new Array(12).fill(0);
        for (let i = 0; i < 12; i++) {
          for (let h = 0; h < 24; h++) {
            const PdcSTC = combinedHourlyPowerSTC[i][h]; // kW, temp-adjusted, before static DC losses
            if (PdcSTC <= 0) continue;
            const Pdc = PdcSTC * staticDcFactor;
            const PacPotential = Pdc * inverterEff;
            const PacActual = Math.min(PacPotential, acKw);
            preClipAcEnergy += PacPotential * daysInMonthArr[i];
            postClipAcEnergy += PacActual * daysInMonthArr[i];
            clippedEnergy += (PacPotential - PacActual) * daysInMonthArr[i];
            monthlyEGridPreAvail[i] += PacActual * daysInMonthArr[i];
          }
        }
        const afterInverter = preClipAcEnergy; // AC energy before clipping (for the loss-diagram milestone)
        const afterClipping = postClipAcEnergy; // AC energy after clipping, before availability
        const E_y = afterClipping * (1 - L.avail / 100);
        const clippingLossPct = preClipAcEnergy > 0 ? (clippedEnergy / preClipAcEnergy) * 100 : 0;

        const monthlyEGridFinal = monthlyEGridPreAvail.map(v => v * (1 - L.avail / 100)); // single source of truth for monthly AC energy
        const monthlyDisplay = monthLabels.map((m, i) => ({ month: m, H_m: combinedPOA[i], H_m_eff: combinedPOAeff[i], E_m: monthlyEGridFinal[i] }));

        // "Balances and main results" style monthly table (GlobHor/DiffHor/T_Amb/GlobInc/GlobEff/EArray/E_Grid/PR)
        const hasGHI = combinedGHI.some(v => v > 0);
        let monthlyBalances = null;
        if (hasGHI) {
          monthlyBalances = monthLabels.map((m, i) => {
            const monthlyTempFactor = combinedPOAeff[i] > 0 ? combinedTempW[i] / combinedPOAeff[i] : 1;
            const EArray_m = combinedPOAeff[i] * dcKwp * bifacialFactor * monthlyTempFactor * (1 - L.irr / 100) * (1 - L.qual / 100) * (1 - L.mismatch / 100) * (1 - L.ohmic / 100) * (1 - mixedOrient / 100) * (1 - L.soiling / 100);
            const EGrid_m = monthlyEGridFinal[i];
            const PR_m = combinedPOA[i] > 0 ? (EGrid_m / (dcKwp * combinedPOA[i])) * 100 : 0;
            return { month: m, GlobHor: combinedGHI[i], DiffHor: combinedDiffuse[i], T_Amb: combinedTamb[i], GlobInc: combinedPOA[i], GlobEff: combinedPOAeff[i], EArray: EArray_m, E_Grid: EGrid_m, PR: PR_m };
          });
        }

        const specificYield = E_y / dcKwp;
        const PR = (E_y / (dcKwp * POA_y)) * 100;

        // 3) uncertainty / P50-P90-P95 (quadratic sum, same methodology PVsyst uses)
        const { weatherVariability, uncModule, uncInverter, uncSoilingMismatch, uncDegradation } = domValues;
        const sigma = Math.sqrt(weatherVariability ** 2 + uncModule ** 2 + uncInverter ** 2 + uncSoilingMismatch ** 2 + uncDegradation ** 2);
        const P50 = E_y, P90 = E_y * (1 - 1.2816 * sigma / 100), P95 = E_y * (1 - 1.645 * sigma / 100);
        const variabilityMWh = sigma / 100 * E_y;

        setStatus('⏳ Đang tính toán suy giảm 25 năm…');
        
        // 4) 25-year ageing table — two-stage model matching how manufacturers publish it
        // (a distinct year-1 drop, then a steady annual rate), e.g. Trina Vertex N G3: 1% year-1 + 0.35%/year.
        const { degYear1, degAnnual, dispersionRate } = domValues;
        let yearsTable = [];
        for (let y = 1; y <= lifetime; y++) {
          const degLoss = (y === 1) ? degYear1 / 2 : degYear1 + degAnnual * (y - 1.5); // mid-year convention within each stage
          const mismatchLoss = Math.pow(dispersionRate * y / 100, 2) * 100;
          const totalLoss = degLoss + mismatchLoss;
          yearsTable.push({ year: y, lossPct: totalLoss, EUseful: P50 * (1 - totalLoss / 100), PR: PR * (1 - totalLoss / 100) });
        }

        setStatus('⏳ Đang render kết quả…');
        const engine = engines.length > 0 ? engines.join(' + ') : 'Không xác định';
        
        // Defer rendering to next frame to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 0));
        
        renderResults({
          projName: domValues.projName,
          lat, lon, dcKwp, acKw, dcAcRatio: dcKwp / acKw, isTwoRoof, engine,
          mountMode, isFarm, rowShade, Uc, selfShadingLossPct, POA_y_noShade,
          moduleModel: domValues.moduleModel,
          inverterModel: domValues.inverterModel,
          sd, monthly: monthlyDisplay, monthlyBalances, POA_y, POAeff_y, bifacialGain: domValues.bifacialGain,
          arrayNominal_y, afterIrradiance, afterTemp, afterQuality, afterMismatch, afterOhmic, afterMixedOrient, afterSoiling, afterInverter, afterClipping, clippingLossPct, E_y,
          L, mixedOrient, annualTempFactor, inverterEff,
          specificYield, PR, P50, P90, P95, sigma, variabilityMWh,
          yearsTable, lifetime, domValues
        });
        setStatus('✓ Tính toán hoàn tất. Nguồn: ' + engine, 'ok');
      }
