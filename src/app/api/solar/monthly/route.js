import { NextResponse } from 'next/server';

function pvgisToMonthlyArrays(json) {
  const rows = json.outputs.monthly;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let sums = new Array(12).fill(0), counts = new Array(12).fill(0), tsums = new Array(12).fill(0);
  rows.forEach(r => {
    const idx = r.month - 1;
    sums[idx] += r['H(h)_m']; 
    counts[idx]++;
    tsums[idx] += (r.T2m ?? 25);
  });
  const ghiArr = [], tempArr = [];
  for (let i = 0; i < 12; i++) {
    ghiArr.push(counts[i] > 0 ? (sums[i] / counts[i]) / daysInMonth[i] : 4.0);
    tempArr.push(counts[i] > 0 ? tsums[i] / counts[i] : 25);
  }
  return { ghiArr, tempArr };
}

function nasaToMonthlyArrays(nasaJson) {
  const keys = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const g = nasaJson.properties.parameter.ALLSKY_SFC_SW_DWN;
  const t = nasaJson.properties.parameter.T2M;
  return { 
    ghiArr: keys.map(k => g[k] ?? 4.0), 
    tempArr: keys.map(k => t[k] ?? 25) 
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const startyear = searchParams.get('startyear');
  const endyear = searchParams.get('endyear');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Thiếu tọa độ lat/lon' }, { status: 400 });
  }

  try {
    // 1. Try PVGIS first with Next.js Fetch Caching (24h)
    let pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_3/MRcalc?lat=${lat}&lon=${lon}&horirrad=1&avtemp=1&outputformat=json`;
    if (startyear && endyear) {
      pvgisUrl += `&startyear=${startyear}&endyear=${endyear}`;
    }
    console.log(`[API] Fetching PVGIS: ${pvgisUrl}`);
    
    // We use AbortController since fetch doesn't have timeout built-in
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased from 15s to 30s
    
    const pvgisRes = await fetch(pvgisUrl, {
      next: { revalidate: 86400 }, // Cache for 24 hours
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const pvgisData = await pvgisRes.json();
    
    if (pvgisData.message && !pvgisData.outputs) {
      throw new Error(pvgisData.message);
    }
    
    const data = pvgisToMonthlyArrays(pvgisData);
    return NextResponse.json({
      source: 'PVGIS MRcalc (GHI+T2m thực) + mô hình AOI/Erbs/IAM giờ-theo-giờ',
      data
    });

  } catch (pvgisError) {
    console.warn(`[API] PVGIS Failed: ${pvgisError.message}. Falling back to NASA POWER...`);
    
    try {
      // 2. Fallback to NASA POWER
      const nasaUrl = `https://power.larc.nasa.gov/api/temporal/monthly/climatology/point?parameters=ALLSKY_SFC_SW_DWN,T2M&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
      console.log(`[API] Fetching NASA: ${nasaUrl}`);
      
      const nasaController = new AbortController();
      const nasaTimeoutId = setTimeout(() => nasaController.abort(), 30000); // Increased from 15s to 30s
      
      const nasaRes = await fetch(nasaUrl, {
        next: { revalidate: 86400 }, // Cache for 24 hours
        signal: nasaController.signal
      });
      
      clearTimeout(nasaTimeoutId);
      
      const nasaData = await nasaRes.json();
      const data = nasaToMonthlyArrays(nasaData);
      
      return NextResponse.json({
        source: 'NASA POWER + mô hình AOI/Erbs/IAM giờ-theo-giờ',
        data
      });
      
    } catch (nasaError) {
      console.error(`[API] NASA Failed: ${nasaError.message}`);
      return NextResponse.json({
        error: `PVGIS: ${pvgisError.message} | NASA POWER: ${nasaError.message}`
      }, { status: 500 });
    }
  }
}
