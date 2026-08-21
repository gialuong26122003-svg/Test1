      // ============================================================
      // PHYSICS ENGINE — validated against real PVsyst reports:
      // GlobInc/GlobEff within 0.1-0.3%, final energy within ~0.7%.
      // ============================================================
      const MEAN_DAY_OF_YEAR = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
      const IAM_ANGLES = [0, 30, 50, 60, 70, 75, 80, 85, 90];
      const IAM_VALUES = [1.000, 0.999, 0.987, 0.963, 0.892, 0.814, 0.679, 0.438, 0.000]; // Fresnel+AR n=1.526/1.290, same table PVsyst prints

      function interpIAM(thetaDeg) {
        let t = Math.max(0, Math.min(90, thetaDeg));
        for (let i = 0; i < IAM_ANGLES.length - 1; i++) {
          if (t >= IAM_ANGLES[i] && t <= IAM_ANGLES[i + 1]) {
            const f = (t - IAM_ANGLES[i]) / (IAM_ANGLES[i + 1] - IAM_ANGLES[i]);
            return IAM_VALUES[i] + f * (IAM_VALUES[i + 1] - IAM_VALUES[i]);
          }
        }
        return IAM_VALUES[IAM_VALUES.length - 1];
      }
      function erbsDiffuseFraction(Kt) {
        if (Kt <= 0.17) return 1.0 - 0.09 * Kt;
        if (Kt <= 0.8) return 0.9511 - 0.1604 * Kt + 4.388 * Kt * Kt - 16.638 * Math.pow(Kt, 3) + 12.336 * Math.pow(Kt, 4);
        return 0.165;
      }
      function daylightAndH0(latDeg, dayOfYear) {
        const phi = latDeg * Math.PI / 180;
        const decl = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365) * Math.PI / 180;
        let cosWs = -Math.tan(phi) * Math.tan(decl); cosWs = Math.max(-1, Math.min(1, cosWs));
        const ws = Math.acos(cosWs);
        const Gsc = 1.367;
        const dayAngle = 2 * Math.PI * dayOfYear / 365;
        const H0 = (24 / Math.PI) * Gsc * (1 + 0.033 * Math.cos(dayAngle)) * (Math.cos(phi) * Math.cos(decl) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(decl));
        return { decl, ws, H0 };
      }
      // Full hourly AOI simulation for one face/month: returns POA before IAM, POA after IAM,
      // and the energy-weighted average cell-temperature derating factor for that month.
      // Row-to-row mutual shading fraction for fixed-tilt ground-mount racking (rows running
      // perpendicular to the array's azimuth-tilt plane — the standard farm layout). Classic
      // Duffie & Beckman "shaded fraction of a collector row" result: converts sun position
      // (via the hour angle w, zenith cosine, declination, latitude) into the profile angle in
      // the plane perpendicular to the rows, compares it to the geometric shading-limit angle
      // set by row pitch D and collector slant height Lc, and returns the fraction (0-1) of the
      // row's slant height that lies in shadow from the row in front of it.
      function rowShadeFraction(w, cosThetaZ, phi, decl, gammaRad, beta, Lc, D) {
        const sinAlpha = Math.max(0, Math.min(1, cosThetaZ)); // cosThetaZ = cos(zenith) = sin(solar elevation)
        const cosAlpha = Math.sqrt(Math.max(0, 1 - sinAlpha * sinAlpha));
        const cosPhi = Math.cos(phi);
        if (cosAlpha < 1e-9 || Math.abs(cosPhi) < 1e-9) return 0;
        let cosGammaS = (sinAlpha * Math.sin(phi) - Math.sin(decl)) / (cosAlpha * cosPhi);
        cosGammaS = Math.max(-1, Math.min(1, cosGammaS));
        const gammaS = (w >= 0 ? 1 : -1) * Math.acos(cosGammaS); // solar azimuth, same south-based convention as gammaRad
        const cosDeltaGamma = Math.cos(gammaS - gammaRad);
        if (cosDeltaGamma <= 0.01) return 0; // sun >~89° off the row's facing direction — front-face beam already negligible
        const tanAlpha = sinAlpha / cosAlpha;
        const profileAngle = Math.atan(tanAlpha / cosDeltaGamma);
        if (profileAngle <= 0) return 1;
        const limitAngle = Math.atan2(Lc * Math.sin(beta), D - Lc * Math.cos(beta));
        if (profileAngle >= limitAngle) return 0;
        const s = 1 - (D * Math.sin(profileAngle)) / (Lc * Math.sin(profileAngle + beta));
        return Math.max(0, Math.min(1, s));
      }

      function simulateFaceMonth(ghiDay, tAmbDay, tiltDeg, azimuthCompass, latDeg, albedo, Uc, tempCoeffPct, monthIdx, rowShade) {
        const phi = latDeg * Math.PI / 180, beta = tiltDeg * Math.PI / 180;
        let gamma = azimuthCompass - 180; if (gamma > 180) gamma -= 360; if (gamma < -180) gamma += 360;
        const gammaRad = gamma * Math.PI / 180;
        const n = MEAN_DAY_OF_YEAR[monthIdx];
        const { decl, ws, H0 } = daylightAndH0(latDeg, n);
        let Kt = H0 > 0 ? ghiDay / H0 : 0.5; Kt = Math.max(0.05, Math.min(0.85, Kt));
        const fd = erbsDiffuseFraction(Kt);

        let hours = [];
        for (let h = 0; h < 24; h++) {
          const w = (15 * (h + 0.5 - 12)) * Math.PI / 180;
          const cosThetaZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(w);
          if (cosThetaZ <= 0.01) continue;
          const cosTheta = Math.sin(decl) * Math.sin(phi) * Math.cos(beta) - Math.sin(decl) * Math.cos(phi) * Math.sin(beta) * Math.cos(gammaRad)
            + Math.cos(decl) * Math.cos(w) * Math.cos(phi) * Math.cos(beta) + Math.cos(decl) * Math.cos(w) * Math.sin(phi) * Math.sin(beta) * Math.cos(gammaRad)
            + Math.cos(decl) * Math.sin(w) * Math.sin(beta) * Math.sin(gammaRad);
          hours.push({ hourIndex: h, cosThetaZ, cosTheta, w });
        }
        const Wsum = hours.reduce((s, h) => s + h.cosThetaZ, 0) || 1;
        let sumBeamTilted = 0, sumBeamTiltedUnshaded = 0, sumBeamTiltedIAM = 0, sumEnergyWeightedTempFactor = 0, sumGpoa = 0;
        // Per-hour-of-day (0-23) effective (IAM-corrected, temperature-derated) POA in Wh/m2 —
        // beam part filled here; diffuse+ground IAM (day-level constants) added on after the loop.
        // This feeds the clipping calculation downstream.
        let hourProfile = new Array(24).fill(0);
        for (const h of hours) {
          const GHI_h = ghiDay * 1000 * h.cosThetaZ / Wsum;
          const Beam_h = GHI_h * (1 - fd), Diffuse_h = GHI_h * fd;
          const cosThetaClamped = Math.max(h.cosTheta, 0);
          const Rb_h = cosThetaClamped / h.cosThetaZ;
          const Beam_tilted_h_unshaded = Beam_h * Rb_h;
          sumBeamTiltedUnshaded += Beam_tilted_h_unshaded;
          // Row-to-row self-shading (farm/ground-mount only — reduces the DIRECT beam reaching the
          // shaded portion of the row; diffuse and albedo terms are left untouched, matching the
          // standard "linear shading on beam only" simplification used for irradiance-level losses).
          let shadeFrac = 0;
          if (rowShade && Beam_tilted_h_unshaded > 0) {
            shadeFrac = rowShadeFraction(h.w, h.cosThetaZ, phi, decl, gammaRad, beta, rowShade.Lc, rowShade.D);
          }
          const Beam_tilted_h = Beam_tilted_h_unshaded * (1 - shadeFrac);
          sumBeamTilted += Beam_tilted_h;
          let beamIAM_h = 0;
          if (cosThetaClamped > 0) {
            const thetaDeg = Math.acos(Math.min(1, cosThetaClamped)) * 180 / Math.PI;
            beamIAM_h = interpIAM(thetaDeg);
            sumBeamTiltedIAM += Beam_tilted_h * beamIAM_h;
          }
          const G_poa_h = Beam_tilted_h + Diffuse_h * (1 + Math.cos(beta)) / 2 + GHI_h * albedo * (1 - Math.cos(beta)) / 2;
          const Tcell = tAmbDay + G_poa_h / Uc;
          const tempFactor = 1 + (tempCoeffPct / 100) * (Tcell - 25);
          sumEnergyWeightedTempFactor += G_poa_h * tempFactor;
          sumGpoa += G_poa_h;
          hourProfile[h.hourIndex] = { beamIAMWh: Beam_tilted_h * beamIAM_h, diffuseWh: Diffuse_h, groundGHIWh: GHI_h, tempFactor };
        }
        const Hb_tilted = sumBeamTilted / 1000, Hb_tilted_IAM = sumBeamTiltedIAM / 1000, Hb_tilted_unshaded = sumBeamTiltedUnshaded / 1000;
        const Hd_tilted = (fd * ghiDay) * (1 + Math.cos(beta)) / 2;
        const thetaD = 59.68 - 0.1388 * tiltDeg + 0.001497 * tiltDeg * tiltDeg;
        const iamDiffuse = interpIAM(thetaD);
        const Hd_tilted_IAM = Hd_tilted * iamDiffuse;
        const Hg_tilted = ghiDay * albedo * (1 - Math.cos(beta)) / 2;
        const thetaG = 90 - 0.5788 * tiltDeg + 0.002693 * tiltDeg * tiltDeg;
        const iamGround = interpIAM(thetaG);
        const Hg_tilted_IAM = Hg_tilted * iamGround;
        const POA = Hb_tilted + Hd_tilted + Hg_tilted;
        const POA_noShade = Hb_tilted_unshaded + Hd_tilted + Hg_tilted;
        const POA_eff = Hb_tilted_IAM + Hd_tilted_IAM + Hg_tilted_IAM;
        const avgTempFactor = sumGpoa > 0 ? sumEnergyWeightedTempFactor / sumGpoa : 1;

        // Finalize the 24-slot hourly effective-POA-times-tempFactor profile (Wh/m2), combining
        // beam (per-hour IAM already applied) + diffuse/ground (day-level IAM constants applied here).
        const cosBeta = Math.cos(beta);
        let hourlyEff = new Array(24).fill(0);
        for (let h = 0; h < 24; h++) {
          const rec = hourProfile[h];
          if (!rec) continue;
          const diffusePart = rec.diffuseWh * (1 + cosBeta) / 2 * iamDiffuse;
          const groundPart = rec.groundGHIWh * albedo * (1 - cosBeta) / 2 * iamGround;
          const gPoaEff_h = rec.beamIAMWh + diffusePart + groundPart;
          hourlyEff[h] = gPoaEff_h * rec.tempFactor;
        }
        return { POA, POA_noShade, POA_eff, avgTempFactor, hourlyEff };
      }
      function sumLossPctExceptTemp() {
        const irr = parseFloat(document.getElementById('lossIrradiance').value) || 0;
        const qual = parseFloat(document.getElementById('lossQuality').value) || 0;
        const mismatch = parseFloat(document.getElementById('lossMismatch').value) || 0;
        const ohmic = parseFloat(document.getElementById('lossOhmic').value) || 0;
        const soiling = parseFloat(document.getElementById('lossSoiling').value) || 0;
        const avail = parseFloat(document.getElementById('lossAvailability').value) || 0;
        return { irr, qual, mismatch, ohmic, soiling, avail };
      }
      // Estimates the IAM loss factor purely from geometry (tilt/azimuth/lat), independent of the
      // actual POA magnitude — used when the user supplies already-tilted POA data directly, so we
      // still apply an IAM correction instead of silently skipping it. Reuses the same validated
      // hourly AOI engine with a nominal clearness index (Kt≈0.55) just to get a realistic beam/
      // diffuse split; the resulting ratio (POA_eff/POA) is what matters, not the absolute value.
      function estimateMonthlyIamFactors(tiltDeg, azimuthDeg, latDeg, albedo) {
        let factors = [];
        for (let i = 0; i < 12; i++) {
          const { H0 } = daylightAndH0(latDeg, MEAN_DAY_OF_YEAR[i]);
          const ghiDayNominal = 0.55 * H0;
          const r = simulateFaceMonth(ghiDayNominal, 25, tiltDeg, azimuthDeg, latDeg, albedo, 20, 0, i);
          factors.push(r.POA > 0 ? r.POA_eff / r.POA : 1);
        }
        return factors;
      }

      // Synthesizes a plausible 24-slot hourly shape (weights summing to 1) from sun-position alone,
      // for use when the user supplies aggregate POA data directly (no real hourly breakdown available).
      function syntheticHourWeights(latDeg, tiltDeg, azimuthCompass, monthIdx) {
        const phi = latDeg * Math.PI / 180, beta = tiltDeg * Math.PI / 180;
        let gamma = azimuthCompass - 180; if (gamma > 180) gamma -= 360; if (gamma < -180) gamma += 360;
        const gammaRad = gamma * Math.PI / 180;
        const n = MEAN_DAY_OF_YEAR[monthIdx];
        const { decl } = daylightAndH0(latDeg, n);
        let weights = new Array(24).fill(0);
        let sum = 0;
        for (let h = 0; h < 24; h++) {
          const w = (15 * (h + 0.5 - 12)) * Math.PI / 180;
          const cosTheta = Math.sin(decl) * Math.sin(phi) * Math.cos(beta) - Math.sin(decl) * Math.cos(phi) * Math.sin(beta) * Math.cos(gammaRad)
            + Math.cos(decl) * Math.cos(w) * Math.cos(phi) * Math.cos(beta) + Math.cos(decl) * Math.cos(w) * Math.sin(phi) * Math.sin(beta) * Math.cos(gammaRad)
            + Math.cos(decl) * Math.sin(w) * Math.sin(beta) * Math.sin(gammaRad);
          const v = Math.max(cosTheta, 0);
          weights[h] = v; sum += v;
        }
        if (sum > 0) for (let h = 0; h < 24; h++) weights[h] /= sum;
        return weights;
      }

      function buildFaceResult(ghiArr, tempArr, tilt, azimuth, lat, albedo, Uc, tempCoeff, faceDcKwp, isAlreadyPOA, engineLabel, rowShade) {
        const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const iamFactors = isAlreadyPOA ? estimateMonthlyIamFactors(tilt, azimuth, lat, albedo) : null;
        let monthly = [], POA_y = 0, POA_y_noShade = 0, POAeff_y = 0, tempWeightedSum = 0, tempWeightSum = 0;
        for (let i = 0; i < 12; i++) {
          const ghiDay = ghiArr[i] ?? ghiArr[ghiArr.length - 1] ?? 4.0;
          const tAmb = tempArr[i] ?? tempArr[tempArr.length - 1] ?? 25;
          let POA, POA_noShade, POA_eff, avgTempFactor, hourlyEff, ghiTotal = null, diffuseTotal = null;
          if (isAlreadyPOA) {
            POA = ghiDay; POA_noShade = ghiDay; POA_eff = ghiDay * iamFactors[i];
            avgTempFactor = 1 + (tempCoeff / 100) * Math.max(0, (tAmb + ghiDay * 3) - 25);
            const weights = syntheticHourWeights(lat, tilt, azimuth, i);
            hourlyEff = weights.map(w => POA_eff * 1000 * w * avgTempFactor); // Wh/m2 per hour, synthetic shape
          } else {
            const r = simulateFaceMonth(ghiDay, tAmb, tilt, azimuth, lat, albedo, Uc, tempCoeff, i, rowShade);
            POA = r.POA; POA_noShade = r.POA_noShade; POA_eff = r.POA_eff; avgTempFactor = r.avgTempFactor; hourlyEff = r.hourlyEff;
            // GHI/diffuse are site-level (independent of tilt/azimuth) — recomputed here from the
            // same Erbs clearness-index split used inside the physics engine, for the monthly table.
            const { H0 } = daylightAndH0(lat, MEAN_DAY_OF_YEAR[i]);
            let Kt = H0 > 0 ? ghiDay / H0 : 0.5; Kt = Math.max(0.05, Math.min(0.85, Kt));
            const fd = erbsDiffuseFraction(Kt);
            ghiTotal = ghiDay * daysInMonth[i];
            diffuseTotal = ghiDay * fd * daysInMonth[i];
          }
          const H_m = POA * daysInMonth[i], H_m_noShade = POA_noShade * daysInMonth[i], H_m_eff = POA_eff * daysInMonth[i];
          monthly.push({ month: monthLabels[i], H_m, H_m_noShade, H_m_eff, avgTempFactor, hourlyEff, ghiTotal, diffuseTotal, tAmb });
          POA_y += H_m; POA_y_noShade += H_m_noShade; POAeff_y += H_m_eff;
          tempWeightedSum += avgTempFactor * H_m_eff; tempWeightSum += H_m_eff;
        }
        const annualTempFactor = tempWeightSum > 0 ? tempWeightedSum / tempWeightSum : 1;
        return { monthly, POA_y, POA_y_noShade, POAeff_y, annualTempFactor, faceDcKwp, engine: engineLabel };
      }
