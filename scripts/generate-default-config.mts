import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type CompilerOptionDeclaration = {
  name: string;
  type?: unknown;
  defaultValueDescription?: unknown;
  strictFlag?: boolean;
};

const outputFile = path.resolve(process.argv[2] ?? 'generated-ts-defaults.json');
const optionDeclarations = (
  ts as typeof ts & { optionDeclarations: CompilerOptionDeclaration[] }
).optionDeclarations;

function getEnumDefaultValue(
  option: CompilerOptionDeclaration,
  value: unknown
): string | undefined {
  if (!(option.type instanceof Map)) {
    return undefined;
  }

  for (const [enumName, enumValue] of option.type.entries()) {
    if (enumValue === value && typeof enumName === 'string') {
      return enumName;
    }
  }

  return undefined;
}

function normalizeDefaultString(value: string): string {
  if (value.length > 1 && value.startsWith('`') && value.endsWith('`')) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeDefaultValue(
  option: CompilerOptionDeclaration,
  value: unknown
): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === false) return undefined;
  if (value === null) return null;

  const enumValue = getEnumDefaultValue(option, value);

  if (enumValue !== undefined) {
    return enumValue;
  }

  if (
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return normalizeDefaultString(value);
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeDefaultValue(option, item))
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (typeof value === 'object') {
    const maybeMessage = value as { message?: unknown; code?: unknown };

    if (typeof maybeMessage.message === 'string') {
      return normalizeDefaultString(maybeMessage.message);
    }

    if (
      typeof maybeMessage.code === 'string' ||
      typeof maybeMessage.code === 'number'
    ) {
      return String(maybeMessage.code);
    }

    return String(value);
  }

  return String(value);
}

function getDefaultForOption(
  option: CompilerOptionDeclaration,
  compilerDefaults: ts.CompilerOptions
): JsonValue | undefined {
  const optionName = option.name as keyof ts.CompilerOptions;

  if (Object.hasOwn(compilerDefaults, optionName)) {
    return normalizeDefaultValue(option, compilerDefaults[optionName]);
  }

  if (typeof option.defaultValueDescription === 'object') {
    return undefined;
  }

  return normalizeDefaultValue(option, option.defaultValueDescription);
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJsonValue(item)])
    );
  }

  return value;
}

function stringifyProperty(key: string, value: JsonValue, hasNext: boolean): string {
  const comma = hasNext ? ',' : '';
  return `  ${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`;
}

function stringifyCompilerOptions(
  compilerOptions: Record<string, JsonValue>,
  strictOptions: string[]
): string {
  const sortedCompilerOptions = Object.entries(compilerOptions)
    .filter(([key]) => key !== 'strict' && !strictOptions.includes(key))
    .sort(([left], [right]) => left.localeCompare(right));
  const sortedStrictOptions = [...strictOptions].sort((left, right) =>
    left.localeCompare(right)
  );
  const lines: string[] = ['{'];
  const propertyCount =
    sortedCompilerOptions.length + 1 + sortedStrictOptions.length;
  let propertyIndex = 0;

  for (const [key, value] of sortedCompilerOptions) {
    propertyIndex += 1;
    lines.push(stringifyProperty(key, value, propertyIndex < propertyCount));
  }

  propertyIndex += 1;
  lines.push('');
  lines.push(
    stringifyProperty('strict', true, propertyIndex < propertyCount)
  );
  lines.push('');

  if (sortedStrictOptions.length > 0) {
    lines.push(
      '  // These options are enabled by "strict": true and are listed explicitly to show TypeScript\'s strict-mode expansion.'
    );
  }

  for (const key of sortedStrictOptions) {
    propertyIndex += 1;
    lines.push(stringifyProperty(key, true, propertyIndex < propertyCount));
  }

  lines.push('}');

  return `${lines.join('\n')}\n`;
}

function validateCompilerOptions(compilerOptions: Record<string, JsonValue>): void {
  const validation = ts.convertCompilerOptionsFromJson(compilerOptions, process.cwd());

  if (validation.errors.length === 0) {
    return;
  }

  const host: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: process.cwd,
    getNewLine: () => '\n',
  };

  throw new Error(ts.formatDiagnostics(validation.errors, host));
}

const compilerDefaults = ts.getDefaultCompilerOptions();
const compilerOptions: Record<string, JsonValue> = {};
const strictOptions: string[] = [];

for (const option of optionDeclarations) {
  if (option.strictFlag === true) {
    strictOptions.push(option.name);
  }

  const value = getDefaultForOption(option, compilerDefaults);

  if (value !== undefined) {
    compilerOptions[option.name] = value;
  }
}

const result = sortJsonValue(compilerOptions) as Record<string, JsonValue>;

validateCompilerOptions(result);

fs.writeFileSync(outputFile, stringifyCompilerOptions(result, strictOptions));

console.log(`Generated ${outputFile}`);
console.log(`TypeScript ${ts.version}`);
