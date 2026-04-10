import { KB } from './rules.js';
import { byId, normalise, compareVersions, extractMajor, extractWindowsYear, safeFileBase, isFieldVisible, isValidHostname } from './utils.js';

export function buildSANList(rawSAN){
  return String(rawSAN || '').split(',').map(x => x.trim()).filter(Boolean);
}

export function getCertificateWarnings(data){
  const warnings = [];
  const errors = [];
  const sans = buildSANList(data.san);
  const invalidSans = sans.filter(x => !isValidHostname(x));
  if (invalidSans.length) {
    errors.push(`SAN contains invalid hostname entries: ${invalidSans.join(', ')}.`);
  }
  if (data.cn && !isValidHostname(data.cn)) {
    errors.push('CN must be a valid fully qualified hostname.');
  }
  if (data.cn && sans.some(x => x.toLowerCase() === data.cn.toLowerCase())) {
    errors.push('CN must not be repeated inside SAN. Remove the duplicate entry from SAN for multi-domain OV/EV requests.');
    warnings.push('For multi-domain requests, keep CN as the primary subject and list only additional names in SAN.');
  }
  return { warnings, errors, sans };
}

export function renderCertificateWarnings(){
  const box = byId('certValidationBox');
  const data = { cn: byId('cn').value, san: byId('san').value };
  const { warnings, errors } = getCertificateWarnings(data);
  const items = [...errors, ...warnings];
  if (!items.length) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.className = `panel ${errors.length ? 'bad' : 'warn'}`;
  box.style.display = '';
  box.innerHTML = `<strong>${errors.length ? 'Input issue detected' : 'Review SAN input'}</strong><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
}

export function readForm(){
  const data = {
    platform: normalise(byId('platform').value),
    osName: normalise(byId('osName').value),
    osVersion: normalise(byId('osVersion').value),
    server: normalise(byId('server').value),
    iisVersion: normalise(byId('iisVersion').value),
    iisMethod: byId('iisMethod') ? normalise(byId('iisMethod').value) : 'powershell',
    nginxVersion: normalise(byId('nginxVersion').value),
    apacheVersion: normalise(byId('apacheVersion').value),
    xamppVersion: normalise(byId('xamppVersion').value),
    phpVersion: normalise(byId('phpVersion').value),
    javaVersion: byId('javaVersion') ? normalise(byId('javaVersion').value) : '',
    opensslVersion: normalise(byId('opensslVersion').value),
    opensshVersion: normalise(byId('opensshVersion').value),
    cn: normalise(byId('cn').value),
    san: normalise(byId('san').value),
    org: normalise(byId('org').value),
    ou: normalise(byId('ou').value),
    city: normalise(byId('city').value),
    state: normalise(byId('state').value),
    country: normalise(byId('country').value).toUpperCase(),
    email: normalise(byId('email').value)
  };
  const certState = getCertificateWarnings(data);
  data.sans = certState.sans;
  data.fileBase = safeFileBase(data.cn);
  return data;
}

export function validate(data){
  const missing = [];
  if (!data.cn) missing.push('CN');
  if (!data.org) missing.push('O');
  if (!data.ou) missing.push('OU');
  if (!data.city) missing.push('L');
  if (!data.state) missing.push('ST');
  if (!data.country || data.country.length !== 2) missing.push('C');
  const certState = getCertificateWarnings(data);
  return { missing, errors: certState.errors };
}

function subjectLine(data){
  const parts = [`CN=${data.cn}`, `O=${data.org}`, `OU=${data.ou}`, `L=${data.city}`, `S=${data.state}`, `C=${data.country}`];
  if (data.email) parts.push(`E=${data.email}`);
  return parts.join(', ');
}
function escapePS(text){ return String(text || '').replace(/`/g, '``'); }

export function buildLinuxScript(data){
  const keyFile = `${data.fileBase}.key`;
  const csrFile = `${data.fileBase}.csr`;
  const addExt = data.sans.length ? `\\
-addext "subjectAltName = ${data.sans.map(x => `DNS:${x}`).join(',')}"` : '';
  return `# Linux CSR generation
# ECC curve: secp384r1 (P-384)
# Hash: SHA-256
# Expected CSR signature: ecdsa-with-SHA256

set -euo pipefail

KEY_FILE="${keyFile}"
CSR_FILE="${csrFile}"

openssl ecparam -name secp384r1 -genkey -noout -out "$KEY_FILE"

openssl req -new -sha256 -key "$KEY_FILE" -out "$CSR_FILE" \\
-subj "/C=${data.country}/ST=${data.state}/L=${data.city}/O=${data.org}/OU=${data.ou}/CN=${data.cn}${data.email ? `/emailAddress=${data.email}` : ''}"${addExt}

openssl req -in "$CSR_FILE" -noout -text`;
}

export function buildWindowsINF(data){
  const sanLines = data.sans.length ? data.sans.map(x => `_continue_ = "DNS=${x}&"`).join('\n') : '';
  return `[Version]
Signature="$Windows NT$"

[NewRequest]
Subject = "${subjectLine(data)}"
MachineKeySet = TRUE
Exportable = FALSE
RequestType = PKCS10
KeyAlgorithm = ECDSA_P384
KeyLength = 384
HashAlgorithm = SHA256
ProviderName = "Microsoft Software Key Storage Provider"
KeyUsage = 0x80
${data.sans.length ? `
[Extensions]
2.5.29.17 = "{text}"
${sanLines}` : ''}
`;
}

export function buildWindowsPowerShell(data){
  const infName = `${data.fileBase}-request.inf`;
  const reqName = `${data.fileBase}-request.req`;
  const inf = buildWindowsINF(data);
  return `# Windows PowerShell CSR generation
# ECC curve: P-384
# Hash: SHA-256

$InfPath = Join-Path (Get-Location) "${infName}"
$ReqPath = Join-Path (Get-Location) "${reqName}"

$InfContent = @"
${escapePS(inf)}
"@

Set-Content -Path $InfPath -Value $InfContent -Encoding ascii
certreq -new $InfPath $ReqPath`;
}

export function buildWindowsGUIGuidance(data){
  return `# IIS GUI guidance\n1. Open IIS Manager\n2. Open Server Certificates\n3. Choose Create Certificate Request\n4. Fill subject values for ${data.cn}\n5. Choose Microsoft Software Key Storage Provider\n6. Choose 384-bit ECC path\n7. Save the CSR and verify it after generation`;
}

export function assess(data){
  const table = [];
  const issues = [];
  let score = 100;
  const add = (item, detected, rule, status, explanation) => {
    table.push({ item, detected, rule, status, explanation });
    if (status === 'Warning') score -= 10;
    if (status === 'Fail') score -= 25;
    if (status !== 'OK' && explanation) issues.push({ status, text: explanation });
  };
  if (data.sans.length === 0 && data.san) add('SAN', 'Invalid SAN input', 'Valid DNS names only', 'Fail', 'One or more SAN entries are invalid.');
  else if (data.sans.length === 0) add('SAN', 'None', 'Optional unless additional names are required', 'OK', '');
  else add('SAN', data.sans.join(', '), 'Valid DNS names only', 'OK', '');

  if (isFieldVisible('field_opensslVersion')) {
    if (data.opensslVersion) {
      const c = compareVersions(data.opensslVersion, KB.baselines.opensslMin);
      if (c === null) add('OpenSSL', data.opensslVersion, `>= ${KB.baselines.opensslMin}`, 'Warning', 'OpenSSL version could not be parsed clearly.');
      else if (c < 0) add('OpenSSL', data.opensslVersion, `>= ${KB.baselines.opensslMin}`, 'Fail', `OpenSSL appears below ${KB.baselines.opensslMin}.`);
      else add('OpenSSL', data.opensslVersion, `>= ${KB.baselines.opensslMin}`, 'OK', '');
    } else add('OpenSSL', 'Not provided', `>= ${KB.baselines.opensslMin}`, 'Warning', 'OpenSSL version not provided.');
  }
  if (isFieldVisible('field_opensshVersion')) {
    if (data.opensshVersion) {
      const c = compareVersions(data.opensshVersion, KB.baselines.opensshMin);
      if (c === null) add('OpenSSH', data.opensshVersion, `>= ${KB.baselines.opensshMin}`, 'Warning', 'OpenSSH version could not be parsed clearly.');
      else if (c < 0) add('OpenSSH', data.opensshVersion, `>= ${KB.baselines.opensshMin}`, 'Fail', `OpenSSH appears below ${KB.baselines.opensshMin}.`);
      else add('OpenSSH', data.opensshVersion, `>= ${KB.baselines.opensshMin}`, 'OK', '');
    } else add('OpenSSH', 'Not provided', `>= ${KB.baselines.opensshMin}`, 'Unknown', '');
  }
  if (data.platform === 'Windows') {
    const year = extractWindowsYear(data.osVersion) || extractMajor(data.osVersion);
    if (year === null) add('Windows OS', data.osVersion || 'Not provided', `>= ${KB.baselines.windowsMinYear}`, 'Warning', 'Windows version could not be parsed.');
    else if (year < KB.baselines.windowsMinYear) add('Windows OS', String(year), `>= ${KB.baselines.windowsMinYear}`, 'Fail', `Windows appears below Server ${KB.baselines.windowsMinYear}.`);
    else add('Windows OS', String(year), `>= ${KB.baselines.windowsMinYear}`, 'OK', '');
  }
  if (data.platform === 'Linux' && data.osName === 'CentOS') {
    const major = extractMajor(data.osVersion);
    if (major === null) add('CentOS', data.osVersion || 'Not provided', `>= ${KB.baselines.linuxCentOSMin}`, 'Warning', 'CentOS version could not be parsed.');
    else if (major < KB.baselines.linuxCentOSMin) add('CentOS', String(major), `>= ${KB.baselines.linuxCentOSMin}`, 'Fail', `CentOS appears below ${KB.baselines.linuxCentOSMin}.`);
    else add('CentOS', String(major), `>= ${KB.baselines.linuxCentOSMin}`, 'OK', '');
  }
  if (isFieldVisible('field_iisVersion')) {
    if (data.iisVersion) {
      const c = compareVersions(data.iisVersion, KB.baselines.iisMinMajor);
      if (c === null) add('IIS', data.iisVersion, `>= ${KB.baselines.iisMinMajor}`, 'Warning', 'IIS version could not be parsed clearly.');
      else if (c < 0) add('IIS', data.iisVersion, `>= ${KB.baselines.iisMinMajor}`, 'Fail', `IIS appears below ${KB.baselines.iisMinMajor}.`);
      else add('IIS', data.iisVersion, `>= ${KB.baselines.iisMinMajor}`, 'OK', '');
    } else add('IIS', 'Not provided', `>= ${KB.baselines.iisMinMajor}`, 'Warning', 'IIS version not provided.');
  }
  if (isFieldVisible('field_apacheVersion')) {
    if (data.apacheVersion) {
      const c = compareVersions(data.apacheVersion, KB.baselines.apacheMin);
      if (c === null) add('Apache', data.apacheVersion, `>= ${KB.baselines.apacheMin}`, 'Warning', 'Apache version could not be parsed clearly.');
      else if (c < 0) add('Apache', data.apacheVersion, `>= ${KB.baselines.apacheMin}`, 'Fail', `Apache appears below ${KB.baselines.apacheMin}.`);
      else add('Apache', data.apacheVersion, `>= ${KB.baselines.apacheMin}`, 'OK', '');
    } else add('Apache', 'Not provided', `>= ${KB.baselines.apacheMin}`, 'Warning', 'Apache version not provided.');
  }
  if (isFieldVisible('field_xamppVersion')) {
    if (data.xamppVersion) {
      const c = compareVersions(data.xamppVersion, KB.baselines.xamppMin);
      if (c === null) add('XAMPP', data.xamppVersion, `>= ${KB.baselines.xamppMin}`, 'Warning', 'XAMPP version could not be parsed clearly.');
      else if (c < 0) add('XAMPP', data.xamppVersion, `>= ${KB.baselines.xamppMin}`, 'Fail', `XAMPP appears below ${KB.baselines.xamppMin}.`);
      else add('XAMPP', data.xamppVersion, `>= ${KB.baselines.xamppMin}`, 'OK', '');
    } else add('XAMPP', 'Not provided', `>= ${KB.baselines.xamppMin}`, 'Warning', 'XAMPP version not provided.');
  }
  if (isFieldVisible('field_phpVersion')) {
    if (data.phpVersion) {
      const c = compareVersions(data.phpVersion, KB.baselines.phpMin);
      if (c === null) add('PHP', data.phpVersion, `>= ${KB.baselines.phpMin}`, 'Warning', 'PHP version could not be parsed clearly.');
      else if (c < 0) add('PHP', data.phpVersion, `>= ${KB.baselines.phpMin}`, 'Fail', `PHP appears below ${KB.baselines.phpMin}.`);
      else add('PHP', data.phpVersion, `>= ${KB.baselines.phpMin}`, 'OK', '');
    } else add('PHP', 'Not provided', `>= ${KB.baselines.phpMin}`, 'Warning', 'PHP version not provided.');
  }
  return {
    score: Math.max(0, Math.min(100, score)),
    table, issues,
    okCount: table.filter(x => x.status === 'OK').length,
    warnCount: table.filter(x => x.status === 'Warning').length,
    failCount: table.filter(x => x.status === 'Fail').length
  };
}

export function buildDownloads(data){
  const files = [];
  const linux = buildLinuxScript(data);
  const ps = buildWindowsPowerShell(data);
  const gui = buildWindowsGUIGuidance(data);
  const inf = buildWindowsINF(data);
  if (data.platform === 'Linux') {
    files.push({ filename: `${data.fileBase}-linux-openssl.sh`, content: linux });
  } else {
    files.push({ filename: `${data.fileBase}-windows-certreq.ps1`, content: ps });
    files.push({ filename: `${data.fileBase}-request.inf`, content: inf });
    if (data.server === 'IIS') files.push({ filename: `${data.fileBase}-windows-gui.txt`, content: gui });
  }
  return files;
}

const statusBadge = (status) => status === 'OK' ? `<span class="badge ok">OK</span>` : status === 'Warning' ? `<span class="badge warn">Warning</span>` : status === 'Fail' ? `<span class="badge bad">Fail</span>` : `<span class="badge unk">Unknown</span>`;
const recommendedPath = (data) => data.platform === 'Linux' ? 'Use the Linux OpenSSL tab and run it on the target server or approved admin workstation.' : data.server === 'IIS' ? (data.iisMethod === 'gui' ? 'Use the Windows IIS GUI tab.' : data.iisMethod === 'powershell' ? 'Use the Windows PowerShell tab.' : 'Use Windows PowerShell for scripted generation, then cross-check with the IIS GUI tab.') : 'Use the Windows PowerShell tab.';

export function renderReadinessSummary(data, result){
  const box = byId('readinessSummary');
  box.style.display = '';
  let overall = 'Ready with standard caution';
  let nextAction = 'Proceed with CSR generation on the target host and submit the original request file.';
  let panelClass = 'ok';
  if (result.failCount > 0) { overall = 'Not ready for submission'; nextAction = 'Address the failed baseline items first, then regenerate the request.'; panelClass = 'bad'; }
  else if (result.warnCount > 0) { overall = 'Conditionally ready'; nextAction = 'Proceed only after reviewing the warning items and confirming the target stack supports ECC.'; panelClass = 'warn'; }
  const topConcerns = result.issues.slice(0, 4).map(x => `<li>${x.text}</li>`).join('') || '<li>No major concern recorded.</li>';
  const snapshot = getVisibleEnvironmentSnapshot(data);
  box.innerHTML = `<div class="readiness-top"><div><div class="readiness-title">Readiness Summary</div><div class="panel ${panelClass}" style="margin-top:0;"><strong>${overall}</strong>Health score: ${result.score}/100</div></div><div class="readiness-score"><div class="big">${result.score}</div><div class="hint">overall score</div></div></div><div class="readiness-grid"><div class="readiness-box"><h4>Environment snapshot</h4><ul>${snapshot}</ul></div><div class="readiness-box"><h4>Immediate next action</h4><div>${nextAction}</div></div><div class="readiness-box"><h4>Primary concerns</h4><ul>${topConcerns}</ul></div><div class="readiness-box"><h4>Recommended output path</h4><div>${recommendedPath(data)}</div></div></div>`;
}

export function renderOperatorChecklist(data){
  byId('operatorChecklist').style.display = '';
  const beforeSubmit = [
    'Confirm target profile is ECC P-384 with SHA-256.',
    'Generate the request on the target server or approved admin workstation.',
    'Keep the private key under agency control. Do not export or share it unless there is an approved process.',
    'Use the original request file for submission.',
    `Confirm CN is correct: ${data.cn}.`,
    data.sans.length ? `Confirm SAN list is complete: ${data.sans.join(', ')}.` : 'SAN is intentionally empty because no additional names were requested.',
    'Verify the server stack entered in the form matches the actual target environment.',
    'Review all warning and failed checks before proceeding.'
  ];
  byId('checkBeforeSubmit').innerHTML = beforeSubmit.map(x => `<li>${x}</li>`).join('');
  byId('checkAfterIssuance').innerHTML = ['Match the issued certificate against CN and SAN values requested.','Confirm the certificate algorithm and chain are what the service expects.','Retain the issued certificate, chain, and request artifacts in the service record.'].map(x => `<li>${x}</li>`).join('');
  byId('checkBeforeBinding').innerHTML = ['Review service configuration one final time before restart or reload.','Confirm downstream applications, proxies, or clients support ECC certificates.'].map(x => `<li>${x}</li>`).join('');
  byId('checkEvidence').innerHTML = [`Target hostname(s): ${data.sans.length ? data.sans.join(', ') : data.cn}.`,'Change record or ticket reference.','Verification note confirming successful binding and HTTPS validation.'].map(x => `<li>${x}</li>`).join('');
}

export function renderPostDeploymentChecklist(data){
  byId('postDeployChecklist').style.display = '';
  byId('checkImmediateValidation').innerHTML = [`Open the site in a browser and verify HTTPS loads without certificate warning.`,`Verify the certificate subject and SAN include: ${data.sans.length ? data.sans.join(', ') : data.cn}.`].map(x => `<li>${x}</li>`).join('');
  byId('checkCertChain').innerHTML = ['Check that the full certificate chain is presented correctly.','Verify the certificate algorithm is ECC / ECDSA.'].map(x => `<li>${x}</li>`).join('');
  byId('checkServiceSpecific').innerHTML = ['Confirm the service configuration now points to the new certificate material.','Verify the running service has been reloaded or restarted cleanly.'].map(x => `<li>${x}</li>`).join('');
  byId('checkCloseOut').innerHTML = ['Record the deployment date and time.','Capture validation evidence such as screenshot or command output.'].map(x => `<li>${x}</li>`).join('');
}

export function renderAssessment(result){
  let panelClass = 'ok';
  let panelTitle = 'No major baseline failure detected';
  if (result.failCount > 0) { panelClass = 'bad'; panelTitle = 'Baseline failures detected'; }
  else if (result.warnCount > 0) { panelClass = 'warn'; panelTitle = 'Warnings detected'; }
  const issuesHTML = result.issues.length ? `<ul>${result.issues.map(x => `<li>${x.text}</li>`).join('')}</ul>` : `<div>No warning currently triggered.</div>`;
  const statusGrid = result.table.map(r => { let cardClass='unknown'; if(r.status==='OK') cardClass='pass'; else if(r.status==='Warning') cardClass='warn'; else if(r.status==='Fail') cardClass='fail'; return `<div class="status-item ${cardClass}"><div class="status-top"><strong>${r.item}</strong>${statusBadge(r.status)}</div><div><strong>Detected:</strong> ${r.detected}</div><div class="status-rule"><strong>Rule:</strong> ${r.rule}</div>${r.explanation ? `<div class="hint" style="margin-top:6px;">${r.explanation}</div>` : ''}</div>`; }).join('');
  byId('resultArea').innerHTML = `<div class="panel ${panelClass}"><strong>${panelTitle}</strong>${issuesHTML}</div><div class="summary-box"><div class="mini pass"><div class="n">${result.okCount}</div><div class="t">Checks passed</div></div><div class="mini warn"><div class="n">${result.warnCount}</div><div class="t">Warnings</div></div><div class="mini fail"><div class="n">${result.failCount}</div><div class="t">Failures</div></div></div><div class="section-title" style="margin-top:16px;">Check details</div><div class="status-grid">${statusGrid}</div>`;
}

export function updateScore(result){
  byId('scoreNumber').textContent = result.score;
  byId('scoreBar').style.width = `${result.score}%`;
  let posture = 'Healthy baseline';
  if (result.failCount > 0) posture = 'Needs remediation';
  else if (result.warnCount > 0) posture = 'Proceed with care';
  byId('scoreSub').textContent = `${posture} • ${result.okCount} passed, ${result.warnCount} warnings, ${result.failCount} failures`;
  const pills = [];
  if (result.failCount > 0) pills.push(`<div class="pill">Failures: ${result.failCount}</div>`);
  if (result.warnCount > 0) pills.push(`<div class="pill">Warnings: ${result.warnCount}</div>`);
  if (result.okCount > 0) pills.push(`<div class="pill">Passed: ${result.okCount}</div>`);
  if (!pills.length) pills.push(`<div class="pill">No result yet</div>`);
  byId('quickPills').innerHTML = pills.join('');
}
