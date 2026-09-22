import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function inspectTelemetry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some((key) => !['mode', 'appId', 'payloadAgentId', 'consentGranted', 'licensedUserAssigned', 'rootOperation', 'workIqRequested'].includes(key))
    || !['S2S', 'OBO', 'Agentic-User'].includes(input.mode)
    || typeof input.appId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input.appId)
    || typeof input.payloadAgentId !== 'string'
    || typeof input.consentGranted !== 'boolean' || typeof input.licensedUserAssigned !== 'boolean'
    || typeof input.rootOperation !== 'string' || typeof input.workIqRequested !== 'boolean') {
    throw new Error('Invalid redacted telemetry fixture. Supply documented fields only; never include tokens or secrets.');
  }
  const findings = [];
  if (!input.licensedUserAssigned) findings.push({code: 'LICENSE_ASSIGNMENT_MISSING', claim: 'A365-C12'});
  if (!input.consentGranted) findings.push({code: 'CONSENT_MISSING', claim: 'A365-C17'});
  if (input.rootOperation !== 'invoke_agent') findings.push({code: 'INVOKE_AGENT_ROOT_MISSING', claim: 'A365-C11'});
  if (input.payloadAgentId.toLowerCase() !== input.appId.toLowerCase()) findings.push({code: 'APP_ID_MISMATCH', claim: 'A365-C13'});
  if (input.mode === 'S2S' && input.workIqRequested) findings.push({code: 'WORK_IQ_REQUIRES_DELEGATED_PATH', claim: 'A365-C09'});
  return {scope: 'offline-redacted-fixture', liveIntegrationVerified: false, findings};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node agent/preflight.mjs <redacted-fixture.json>');
    const report = inspectTelemetry(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    if (report.findings.length) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
