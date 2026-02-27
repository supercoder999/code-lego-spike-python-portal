/**
 * Python-to-Blockly Converter for Pybricks/Spike Prime code.
 *
 * Parses common Pybricks Python patterns and generates Blockly XML
 * that maps to the custom spike blocks defined in spikeBlocks.ts.
 *
 * Supported patterns:
 *  - hub = PrimeHub()
 *  - hub.light.on(Color.X), hub.speaker.beep(freq, dur)
 *  - var = Motor(Port.X, Direction.X)
 *  - var.run(speed), var.run_time(speed, time), var.run_angle(speed, angle [,Stop.X])
 *  - var.stop(), var.brake()
 *  - DriveBase(var, var, diameter, track) — with variable motor refs & floats
 *  - drive_base.straight(expr), .turn(expr), .drive(speed, turn), .stop()
 *  - drive_base.settings(straight_speed=...), settings(straight_acceleration=...), settings(turn_rate=...), use_gyro(...)
 *  - var = ColorSensor/UltrasonicSensor/ForceSensor(Port.X)
 *  - wait(ms), print(...)
 *  - for i in range(n): ... / while True: ... / if/elif/else
 *  - def funcname(args): ... → Blockly procedure definition
 *  - funcname(args) → Blockly procedure call
 */

// ——— Helpers ———

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Wrap a number value as a shadow math_number block */
function numShadow(inputName: string, value: string | number): string {
  const v = String(value).trim();
  return `<value name="${inputName}"><shadow type="math_number"><field name="NUM">${v}</field></shadow></value>`;
}

/** Wrap a text value as a shadow text block */
function textShadow(inputName: string, value: string): string {
  return `<value name="${inputName}"><shadow type="text"><field name="TEXT">${escapeXml(value)}</field></shadow></value>`;
}

function numValue(inputName: string, expr: string): string {
  const trimmed = expr.trim();

  // Numeric literal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return numShadow(inputName, trimmed);
  }

  // Simple variable reference
  if (/^[A-Za-z_]\w*$/.test(trimmed)) {
    return `<value name="${inputName}"><block type="variables_get">${variableField('VAR', trimmed)}</block></value>`;
  }

  // Unary minus variable, e.g. -mm
  const unaryMinusVar = trimmed.match(/^-(\w+)$/);
  if (unaryMinusVar) {
    const varName = unaryMinusVar[1];
    return `<value name="${inputName}"><block type="math_arithmetic"><field name="OP">MINUS</field><value name="A"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="B"><block type="variables_get">${variableField('VAR', varName)}</block></value></block></value>`;
  }

  // Fallback
  return numShadow(inputName, toNum(trimmed));
}

// ——— State ———

interface ConvertResult {
  xml: string;
  warnings: string[];
}

let varCounter = 0;
let variableMap: Map<string, string> = new Map();
/** Track user-defined function names and their arg count */
let functionDefs: Map<string, string[]> = new Map();
/** Track which motor variable maps to which Port */
let motorPortMap: Map<string, string> = new Map();

function getVarId(name: string): string {
  if (!variableMap.has(name)) {
    variableMap.set(name, `var_${varCounter++}`);
  }
  return variableMap.get(name)!;
}

function variableField(fieldName: string, varName: string): string {
  return `<field name="${fieldName}" id="${getVarId(varName)}">${escapeXml(varName)}</field>`;
}

function variablesXml(): string {
  let xml = '';
  for (const [name, id] of variableMap.entries()) {
    xml += `<variable id="${id}">${escapeXml(name)}</variable>`;
  }
  return xml;
}

/** Best-effort: extract a float-friendly number from an arg, or return 0 */
function toNum(s: string): string {
  const trimmed = s.trim();
  const m = trimmed.match(/^-?\d+(\.\d+)?$/);
  return m ? m[0] : '0';
}

// ——— Pattern matchers ———
// Each returns a block XML string or null.

function matchHubInit(line: string): string | null {
  if (/\w+\s*=\s*PrimeHub\(\)/.test(line)) {
    return `<block type="spike_init_hub">`;
  }
  return null;
}

function matchHubLight(line: string): string | null {
  const m = line.match(/\w+\.light\.on\(\s*(Color\.\w+)\s*\)/);
  if (m) return `<block type="spike_hub_light"><field name="COLOR">${m[1]}</field>`;
  return null;
}

function matchHubBeep(line: string): string | null {
  const m = line.match(/\w+\.speaker\.beep\(\s*(.+?)\s*(?:,\s*(.+?))?\s*\)/);
  if (m) {
    return `<block type="spike_hub_beep">${numShadow('FREQUENCY', toNum(m[1]))}${numShadow('DURATION', toNum(m[2] || '200'))}`;
  }
  return null;
}

function matchMotorInit(line: string): string | null {
  const m = line.match(/(\w+)\s*=\s*Motor\(\s*(Port\.[A-F])\s*(?:,\s*(Direction\.\w+))?\s*\)/);
  if (m) {
    motorPortMap.set(m[1], m[2]);
    const direction = m[3] || 'Direction.CLOCKWISE';
    return `<block type="spike_motor_init">${variableField('VAR', m[1])}<field name="PORT">${m[2]}</field><field name="DIRECTION">${direction}</field>`;
  }
  return null;
}

function matchMotorRun(line: string): string | null {
  const m = line.match(/(\w+)\.run\(\s*(.+?)\s*\)/);
  if (m && !m[0].includes('run_time') && !m[0].includes('run_angle') && !m[0].includes('run_target')) {
    return `<block type="spike_motor_run">${variableField('VAR', m[1])}${numValue('SPEED', m[2])}`;
  }
  return null;
}

function matchMotorRunTime(line: string): string | null {
  const m = line.match(/(\w+)\.run_time\(\s*(.+?)\s*,\s*(.+?)\s*\)/);
  if (m) {
    return `<block type="spike_motor_run_time">${variableField('VAR', m[1])}${numValue('SPEED', m[2])}${numValue('TIME', m[3])}`;
  }
  return null;
}

function matchMotorRunAngle(line: string): string | null {
  // 2 or 3 args: var.run_angle(speed, angle [, Stop.X])
  const m = line.match(/(\w+)\.run_angle\(\s*(.+?)\s*,\s*(.+?)\s*(?:,\s*(Stop\.(?:COAST|BRAKE|HOLD)))?\s*\)/);
  if (m) {
    const stopMode = m[4] || 'Stop.COAST';
    return `<block type="spike_motor_run_angle">${variableField('VAR', m[1])}${numValue('SPEED', m[2])}${numValue('ANGLE', m[3])}<field name="STOP">${stopMode}</field>`;
  }
  return null;
}

function matchMotorStop(line: string): string | null {
  const m = line.match(/^(\w+)\.stop\(\)/);
  if (m && !isDriveBaseVar(m[1])) {
    return `<block type="spike_motor_stop">${variableField('VAR', m[1])}`;
  }
  return null;
}

function matchMotorBrake(line: string): string | null {
  const m = line.match(/^(\w+)\.brake\(\)/);
  if (m) {
    // brake() is equivalent to stop() in Blockly
    return `<block type="spike_motor_stop">${variableField('VAR', m[1])}`;
  }
  return null;
}

// ——— DriveBase ———

const DRIVEBASE_VAR_NAMES = new Set(['drive_base', 'drivebase', 'robot', 'db']);
let driveBaseVarName = 'drive_base';

function isDriveBaseVar(name: string): boolean {
  return DRIVEBASE_VAR_NAMES.has(name) || name === driveBaseVarName;
}

function matchDriveBaseInit(line: string): string | null {
  // DriveBase(motor_var, motor_var, num_or_float, num_or_float)
  const m = line.match(/(\w+)\s*=\s*DriveBase\(\s*(\w+)\s*,\s*(\w+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
  if (m) {
    driveBaseVarName = m[1];
    DRIVEBASE_VAR_NAMES.add(m[1]);
    const leftMotorVar = m[2];
    const rightMotorVar = m[3];
    const diameter = m[4];
    const track = m[5];
    return `<block type="spike_drivebase_init">${variableField('LEFT_MOTOR', leftMotorVar)}${variableField('RIGHT_MOTOR', rightMotorVar)}${numShadow('WHEEL_DIAMETER', diameter)}${numShadow('AXLE_TRACK', track)}`;
  }
  return null;
}

function matchDriveBaseStraight(line: string): string | null {
  const m = line.match(/(\w+)\.straight\(\s*(.+?)\s*\)/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_straight">${numValue('DISTANCE', m[2])}`;
  }
  return null;
}

function matchDriveBaseTurn(line: string): string | null {
  const m = line.match(/(\w+)\.turn\(\s*(.+?)\s*\)/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_turn">${numValue('ANGLE', m[2])}`;
  }
  return null;
}

function matchDriveBaseDrive(line: string): string | null {
  const m = line.match(/(\w+)\.drive\(\s*(.+?)\s*,\s*(.+?)\s*\)/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_drive">${numValue('SPEED', m[2])}${numValue('TURN_RATE', m[3])}`;
  }
  return null;
}

function matchDriveBaseStop(line: string): string | null {
  const m = line.match(/^(\w+)\.stop\(\)/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_stop">`;
  }
  return null;
}

function matchDriveBaseSettingsSpeed(line: string): string | null {
  const m = line.match(/^(\w+)\.settings\(\s*straight_speed\s*=\s*(.+?)\s*\)$/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_settings_speed">${numValue('SPEED', m[2])}`;
  }
  return null;
}

function matchDriveBaseSettingsAcceleration(line: string): string | null {
  const m = line.match(/^(\w+)\.settings\(\s*straight_acceleration\s*=\s*(.+?)\s*\)$/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_settings_acceleration">${numValue('ACCEL', m[2])}`;
  }
  return null;
}

function matchDriveBaseSettingsTurnRate(line: string): string | null {
  const m = line.match(/^(\w+)\.settings\(\s*turn_rate\s*=\s*(.+?)\s*\)$/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_settings_turn_rate">${numValue('TURN_RATE', m[2])}`;
  }
  return null;
}

function matchDriveBaseUseGyro(line: string): string | null {
  const m = line.match(/^(\w+)\.use_gyro\(\s*(True|False)\s*\)$/);
  if (m && isDriveBaseVar(m[1])) {
    return `<block type="spike_drivebase_use_gyro"><field name="ENABLED">${m[2]}</field>`;
  }
  return null;
}

/** Skip unknown drive_base settings/use_gyro forms that don't have direct blocks */
function matchDriveBaseSkippable(line: string): string | null {
  const m = line.match(/^(\w+)\.(settings|use_gyro)\(/);
  if (m && isDriveBaseVar(m[1])) {
    return '__SKIP__';
  }
  return null;
}

// ——— Sensors ———

function matchColorSensorInit(line: string): string | null {
  const m = line.match(/(\w+)\s*=\s*ColorSensor\(\s*(Port\.[A-F])\s*\)/);
  if (m) return `<block type="spike_color_sensor_init">${variableField('VAR', m[1])}<field name="PORT">${m[2]}</field>`;
  return null;
}

function matchUltrasonicInit(line: string): string | null {
  const m = line.match(/(\w+)\s*=\s*UltrasonicSensor\(\s*(Port\.[A-F])\s*\)/);
  if (m) return `<block type="spike_ultrasonic_init">${variableField('VAR', m[1])}<field name="PORT">${m[2]}</field>`;
  return null;
}

function matchForceSensorInit(line: string): string | null {
  const m = line.match(/(\w+)\s*=\s*ForceSensor\(\s*(Port\.[A-F])\s*\)/);
  if (m) return `<block type="spike_force_sensor_init">${variableField('VAR', m[1])}<field name="PORT">${m[2]}</field>`;
  return null;
}

// ——— Control ———

function matchWait(line: string): string | null {
  const m = line.match(/^wait\(\s*(.+?)\s*\)/);
  if (m) return `<block type="spike_wait">${numShadow('TIME', toNum(m[1]))}`;
  return null;
}

function matchPrint(line: string): string | null {
  const m = line.match(/^print\(\s*(.+?)\s*\)$/);
  if (m) {
    const arg = m[1];
    const strMatch = arg.match(/^["'](.+)["']$/);
    if (strMatch) return `<block type="spike_print">${textShadow('TEXT', strMatch[1])}`;
    return `<block type="spike_print">${textShadow('TEXT', arg)}`;
  }
  return null;
}

// ——— Custom function calls (user-defined) ———

function matchFunctionCall(line: string): string | null {
  // funcname(arg1, arg2, ...)  — only if we know it's a user-defined function
  const m = line.match(/^(\w+)\(\s*(.*?)\s*\)$/);
  if (m && functionDefs.has(m[1])) {
    const funcName = m[1];
    const args = m[2] ? m[2].split(',').map(a => a.trim()) : [];
    const params = functionDefs.get(funcName) || [];

    // Build Blockly procedures_callnoreturn
    let xml = `<block type="procedures_callnoreturn"><mutation name="${escapeXml(funcName)}">`;
    for (const p of params) {
      xml += `<arg name="${escapeXml(p)}"></arg>`;
    }
    xml += `</mutation>`;
    // Fill argument values
    for (let j = 0; j < params.length && j < args.length; j++) {
      const argVal = args[j];
      xml += `<value name="ARG${j}"><shadow type="math_number"><field name="NUM">${toNum(argVal)}</field></shadow></value>`;
    }
    return xml;
  }
  return null;
}

// ——— Main line matcher ———

function tryParseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('from ') || trimmed.startsWith('import ')) {
    return null;
  }

  const matchers = [
    matchHubInit,
    matchHubLight,
    matchHubBeep,
    matchMotorInit,
    matchMotorRunTime,
    matchMotorRunAngle,
    matchMotorRun,
    matchMotorBrake,
    matchDriveBaseInit,
    matchDriveBaseStop,
    matchDriveBaseSettingsSpeed,
    matchDriveBaseSettingsAcceleration,
    matchDriveBaseSettingsTurnRate,
    matchDriveBaseUseGyro,
    matchDriveBaseSkippable,
    matchDriveBaseStraight,
    matchDriveBaseTurn,
    matchDriveBaseDrive,
    matchMotorStop,
    matchColorSensorInit,
    matchUltrasonicInit,
    matchForceSensorInit,
    matchWait,
    matchPrint,
    matchFunctionCall,
  ];

  for (const matcher of matchers) {
    const result = matcher(trimmed);
    if (result) return result;
  }

  return null;
}

// ——— Indentation-aware parser ———

interface CodeLine {
  indent: number;
  text: string;
  lineNum: number;
}

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function parseLines(code: string): CodeLine[] {
  return code.split('\n').map((text, i) => ({
    indent: getIndent(text),
    text: text.trim(),
    lineNum: i + 1,
  }));
}

/**
 * First pass: scan for `def funcname(args):` to register user function names.
 * This lets us recognize calls to them later.
 */
function preScanFunctions(lines: CodeLine[]): void {
  for (const line of lines) {
    const m = line.text.match(/^def\s+(\w+)\(\s*(.*?)\s*\)\s*:/);
    if (m) {
      const name = m[1];
      const args = m[2] ? m[2].split(',').map(a => a.trim()) : [];
      functionDefs.set(name, args);
    }
  }
}

/** Parse a block of lines into chained Blockly XML.
 *  Procedure definitions are collected separately since they can't be chained.
 */
function parseBlock(lines: CodeLine[], startIdx: number, baseIndent: number, warnings: string[], standaloneBag?: string[]): { xml: string; nextIdx: number; standaloneBlocks: string[] } {
  const xmlParts: string[] = [];
  // Standalone blocks that can't be chained (e.g. procedure definitions)
  const standaloneBlocks: string[] = standaloneBag || [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.text) { i++; continue; }
    if (line.indent < baseIndent) break;
    if (line.text.startsWith('#') || line.text.startsWith('from ') || line.text.startsWith('import ')) { i++; continue; }

    // ——— def funcname(args): ———
    const defMatch = line.text.match(/^def\s+(\w+)\(\s*(.*?)\s*\)\s*:/);
    if (defMatch) {
      const funcName = defMatch[1];
      const args = defMatch[2] ? defMatch[2].split(',').map(a => a.trim()) : [];
      i++;
      const bodyIndent = i < lines.length && lines[i].text ? lines[i].indent : baseIndent + 4;
      const body = parseBlock(lines, i, bodyIndent, warnings);
      i = body.nextIdx;

      // Build Blockly procedures_defnoreturn — must be standalone (no prev/next connections)
      let defXml = `<block type="procedures_defnoreturn"><mutation>`;
      for (const a of args) {
        defXml += `<arg name="${escapeXml(a)}"></arg>`;
      }
      defXml += `</mutation><field name="NAME">${escapeXml(funcName)}</field>`;
      if (body.xml) {
        defXml += `<statement name="STACK">${body.xml}</statement>`;
      }
      defXml += `</block>`;
      standaloneBlocks.push(defXml);
      continue;
    }

    // ——— for ... in range(N): ———
    const forMatch = line.text.match(/^for\s+\w+\s+in\s+range\(\s*(.+?)\s*\)\s*:/);
    if (forMatch) {
      i++;
      const bodyIndent = i < lines.length && lines[i].text ? lines[i].indent : baseIndent + 4;
      const body = parseBlock(lines, i, bodyIndent, warnings);
      i = body.nextIdx;
      xmlParts.push(`<block type="controls_repeat_ext">${numShadow('TIMES', toNum(forMatch[1]))}<statement name="DO">${body.xml}</statement>`);
      continue;
    }

    // ——— while True: ———
    const whileMatch = line.text.match(/^while\s+True\s*:/);
    if (whileMatch) {
      i++;
      const bodyIndent = i < lines.length && lines[i].text ? lines[i].indent : baseIndent + 4;
      const body = parseBlock(lines, i, bodyIndent, warnings);
      i = body.nextIdx;
      xmlParts.push(`<block type="controls_whileUntil"><field name="MODE">WHILE</field><value name="BOOL"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value><statement name="DO">${body.xml}</statement>`);
      continue;
    }

    // ——— if ...: / elif ...: / else: ———
    const ifMatch = line.text.match(/^if\s+(.+)\s*:/);
    if (ifMatch) {
      i++;
      const bodyIndent = i < lines.length && lines[i].text ? lines[i].indent : baseIndent + 4;
      const body = parseBlock(lines, i, bodyIndent, warnings);
      i = body.nextIdx;

      let elseXml = '';
      let elseCount = 0;
      if (i < lines.length && lines[i].text.startsWith('else:')) {
        i++;
        const elseBodyIndent = i < lines.length && lines[i].text ? lines[i].indent : baseIndent + 4;
        const elseBody = parseBlock(lines, i, elseBodyIndent, warnings);
        i = elseBody.nextIdx;
        elseXml = `<statement name="ELSE">${elseBody.xml}</statement>`;
        elseCount = 1;
      }

      xmlParts.push(`<block type="controls_if">${elseCount ? '<mutation else="1"></mutation>' : ''}<value name="IF0"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value><statement name="DO0">${body.xml}</statement>${elseXml}`);
      warnings.push(`Line ${line.lineNum}: Condition "${ifMatch[1]}" → placeholder — edit in Blocks mode.`);
      continue;
    }

    // ——— Regular statement ———
    const blockXml = tryParseLine(line.text);
    if (blockXml) {
      if (blockXml !== '__SKIP__') {
        xmlParts.push(blockXml);
      }
    } else {
      warnings.push(`Line ${line.lineNum}: Could not convert "${line.text}"`);
    }
    i++;
  }

  return { xml: chainBlocks(xmlParts), nextIdx: i, standaloneBlocks };
}

/** Chain block XML strings with <next> wrappers */
function chainBlocks(blocks: string[]): string {
  if (blocks.length === 0) return '';
  let xml = blocks[0];
  for (let i = 1; i < blocks.length; i++) {
    xml += `<next>${blocks[i]}`;
  }
  for (let i = 0; i < blocks.length; i++) {
    xml += '</block>';
    if (i < blocks.length - 1) xml += '</next>';
  }
  return xml;
}

// ——— Public API ———

/**
 * Convert Python (Pybricks) code to Blockly XML.
 * Returns the full <xml> string ready to load into a workspace.
 */
export function pythonToBlocklyXml(pythonCode: string): ConvertResult {
  // Reset state
  varCounter = 0;
  variableMap = new Map();
  functionDefs = new Map();
  motorPortMap = new Map();
  driveBaseVarName = 'drive_base';
  DRIVEBASE_VAR_NAMES.clear();
  DRIVEBASE_VAR_NAMES.add('drive_base');
  DRIVEBASE_VAR_NAMES.add('drivebase');
  DRIVEBASE_VAR_NAMES.add('robot');
  DRIVEBASE_VAR_NAMES.add('db');

  const warnings: string[] = [];
  const codeLines = parseLines(pythonCode);

  // Pre-scan to register user function definitions
  preScanFunctions(codeLines);

  const result = parseBlock(codeLines, 0, 0, warnings);
  const varsXml = variablesXml();

  let fullXml = `<xml xmlns="https://developers.google.com/blockly/xml">`;
  if (varsXml) fullXml += `<variables>${varsXml}</variables>`;

  // Place standalone blocks (procedure definitions) at staggered positions
  let yOffset = 30;
  for (const sb of result.standaloneBlocks) {
    // These are already fully closed with </block>
    fullXml += sb.replace('<block ', `<block x="400" y="${yOffset}" `);
    yOffset += 200;
  }

  // Place the main code chain
  if (result.xml) {
    // Inject x/y position into the first <block of the chain
    const mainXml = result.xml.replace('<block ', '<block x="30" y="30" ');
    fullXml += mainXml;
  } else {
    // No main code — add a default hub init
    fullXml += `<block type="spike_init_hub" x="30" y="30"></block>`;
  }

  fullXml += `</xml>`;

  return { xml: fullXml, warnings };
}
