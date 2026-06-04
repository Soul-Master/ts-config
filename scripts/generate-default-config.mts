import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type CompilerOptionDeclaration = {
  name: string;
  defaultValueDescription?: unknown;
  strictFlag?: boolean;
};

const outputFile = path.resolve(process.argv[2] ?? 'generated-ts-defaults.json');
const optionDeclarations = (
  ts as typeof ts & { optionDeclarations: CompilerOptionDeclaration[] }
).optionDeclarations;

function normalizeDefaultValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === false) return undefined;
  if (value === null) return null;

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeDefaultValue(item))
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (typeof value === 'object') {
    const maybeMessage = value as { message?: unknown; code?: unknown };

    if (typeof maybeMessage.message === 'string') {
      return maybeMessage.message;
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
    return normalizeDefaultValue(compilerDefaults[optionName]);
  }

  if (typeof option.defaultValueDescription === 'object') {
    return undefined;
  }

  return normalizeDefaultValue(option.defaultValueDescription);
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

fs.writeFileSync(outputFile, stringifyCompilerOptions(result, strictOptions));

console.log(`Generated ${outputFile}`);
console.log(`TypeScript ${ts.version}`);
