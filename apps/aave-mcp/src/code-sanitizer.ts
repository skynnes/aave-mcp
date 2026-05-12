const CODE_FENCE_REGEX =
  /^```(?:js|javascript|typescript|ts|tsx|jsx)?\s*\n([\s\S]*?)```\s*$/;
const IMPORT_TYPE_REGEX = /^\s*import\s+type\s+[^;]+;\s*$/gm;
const TYPE_DECLARATION_REGEX = /^\s*type\s+\w+[\s\S]*?;\s*$/gm;
const INTERFACE_DECLARATION_REGEX = /^\s*interface\s+\w+\s*\{[\s\S]*?\}\s*$/gm;
const ASYNC_RETURN_TYPE_REGEX = /(async\s*\([^)]*\))\s*:\s*[^=]+=>/g;
const VARIABLE_TYPE_REGEX =
  /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g;
const IDENTIFIER_START_REGEX = /[A-Za-z_$]/;
const IDENTIFIER_CHAR_REGEX = /[A-Za-z_$0-9]/;
const WHITESPACE_REGEX = /\s/;
const EMPTY_FOR_LOOP_REGEX = /\bfor\s*\(\s*;\s*(?:true)?\s*;\s*\)/;
const TRUE_WHILE_LOOP_REGEX = /\bwhile\s*\(\s*true\s*\)/;
const STRING_DELIMITERS = new Set(["'", '"', "`"]);
const CATCH_KEYWORD = "catch";

const stripCodeFence = (code: string): string => {
  const match = code.trim().match(CODE_FENCE_REGEX);
  return match?.[1] ?? code;
};

const isLineCommentStart = (code: string, index: number): boolean => {
  return code[index] === "/" && code[index + 1] === "/";
};

const isBlockCommentStart = (code: string, index: number): boolean => {
  return code[index] === "/" && code[index + 1] === "*";
};

const readCommentEnd = (code: string, startIndex: number): number => {
  if (isLineCommentStart(code, startIndex)) {
    const newlineIndex = code.indexOf("\n", startIndex + 2);
    return newlineIndex === -1 ? code.length : newlineIndex + 1;
  }

  const blockEndIndex = code.indexOf("*/", startIndex + 2);
  return blockEndIndex === -1 ? code.length : blockEndIndex + 2;
};

const skipWhitespaceAndComments = (
  code: string,
  startIndex: number
): number => {
  let index = startIndex;

  while (index < code.length) {
    if (WHITESPACE_REGEX.test(code[index] ?? "")) {
      index += 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      index = readCommentEnd(code, index);
      continue;
    }

    break;
  }

  return index;
};

const readIgnoredSpanEnd = (
  code: string,
  startIndex: number
): number | null => {
  if (STRING_DELIMITERS.has(code[startIndex])) {
    return readStringEnd(code, startIndex) + 1;
  }

  if (
    isLineCommentStart(code, startIndex) ||
    isBlockCommentStart(code, startIndex)
  ) {
    return readCommentEnd(code, startIndex);
  }

  return null;
};

const readStringEnd = (code: string, startIndex: number): number => {
  const delimiter = code[startIndex];
  let index = startIndex + 1;

  while (index < code.length) {
    if (code[index] === "\\") {
      index += 2;
      continue;
    }

    if (code[index] === delimiter) {
      return index;
    }

    index += 1;
  }

  return code.length - 1;
};

const findClosingDelimiter = (
  code: string,
  openIndex: number,
  openDelimiter: string,
  closeDelimiter: string
): number => {
  let depth = 0;
  let index = openIndex;

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      index = readStringEnd(code, index) + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      index = readCommentEnd(code, index);
      continue;
    }

    if (char === openDelimiter) {
      depth += 1;
    }

    if (char === closeDelimiter) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }

    index += 1;
  }

  return -1;
};

const findClosingParen = (code: string, openIndex: number): number => {
  return findClosingDelimiter(code, openIndex, "(", ")");
};

const findArrowAfterParameterList = (
  code: string,
  closeIndex: number
): number | null => {
  let index = closeIndex + 1;

  while (WHITESPACE_REGEX.test(code[index] ?? "")) {
    index += 1;
  }

  if (code[index] === ":") {
    index += 1;

    while (index < code.length) {
      const char = code[index];

      if (STRING_DELIMITERS.has(char)) {
        index = readStringEnd(code, index) + 1;
        continue;
      }

      if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
        index = readCommentEnd(code, index);
        continue;
      }

      if (code.slice(index, index + 2) === "=>") {
        return index;
      }

      index += 1;
    }

    return null;
  }

  return code.slice(index, index + 2) === "=>" ? index : null;
};

const stripParameterListTypes = (parameters: string): string => {
  let output = "";
  let index = 0;
  let depth = 0;

  while (index < parameters.length) {
    const char = parameters[index];
    const ignoredEndIndex = readIgnoredSpanEnd(parameters, index);

    if (ignoredEndIndex !== null) {
      output += parameters.slice(index, ignoredEndIndex);
      index = ignoredEndIndex;
      continue;
    }

    if (char === "(" || char === "{" || char === "[") {
      depth += 1;
    }

    if (char === ")" || char === "}" || char === "]") {
      depth -= 1;
    }

    if (char === ":" && depth === 0) {
      index += 1;

      while (index < parameters.length) {
        const nextChar = parameters[index];

        if (nextChar === "," || nextChar === "=") {
          break;
        }

        index += 1;
      }

      continue;
    }

    output += char;
    index += 1;
  }

  return output;
};

const stripArrowParameterTypes = (code: string): string => {
  let output = "";
  let index = 0;

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      const endIndex = readStringEnd(code, index);
      output += code.slice(index, endIndex + 1);
      index = endIndex + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      const endIndex = readCommentEnd(code, index);
      output += code.slice(index, endIndex);
      index = endIndex;
      continue;
    }

    if (char !== "(") {
      output += char;
      index += 1;
      continue;
    }

    const closeIndex = findClosingParen(code, index);
    const arrowIndex =
      closeIndex === -1 ? null : findArrowAfterParameterList(code, closeIndex);

    if (closeIndex === -1 || arrowIndex === null) {
      output += char;
      index += 1;
      continue;
    }

    output += `(${stripParameterListTypes(code.slice(index + 1, closeIndex))})`;
    index = arrowIndex;
  }

  return output;
};

const isIdentifierChar = (char: string | undefined): boolean => {
  return char !== undefined && IDENTIFIER_CHAR_REGEX.test(char);
};

const isTypeAssertionEnd = (char: string | undefined): boolean => {
  return (
    char === undefined ||
    char === "," ||
    char === ";" ||
    char === "\n" ||
    char === ")" ||
    char === "}" ||
    char === "]"
  );
};

const readTypeAssertionEnd = (code: string, startIndex: number): number => {
  let index = startIndex;
  let depth = 0;

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      index = readStringEnd(code, index) + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      index = readCommentEnd(code, index);
      continue;
    }

    if (char === "{" || char === "(" || char === "[") {
      depth += 1;
      index += 1;
      continue;
    }

    if (char === "}" || char === ")" || char === "]") {
      if (depth === 0) {
        break;
      }

      depth -= 1;
      index += 1;
      continue;
    }

    if (depth === 0 && isTypeAssertionEnd(char)) {
      break;
    }

    index += 1;
  }

  return index;
};

const stripAsAssertions = (code: string): string => {
  let output = "";
  let index = 0;

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      const endIndex = readStringEnd(code, index);
      output += code.slice(index, endIndex + 1);
      index = endIndex + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      const endIndex = readCommentEnd(code, index);
      output += code.slice(index, endIndex);
      index = endIndex;
      continue;
    }

    const isAsKeyword =
      char === "a" &&
      code[index + 1] === "s" &&
      !isIdentifierChar(code[index - 1]) &&
      !isIdentifierChar(code[index + 2]);

    if (!isAsKeyword) {
      output += char;
      index += 1;
      continue;
    }

    const lastOutputChar = output.at(-1);

    if (
      lastOutputChar !== undefined &&
      !WHITESPACE_REGEX.test(lastOutputChar)
    ) {
      output += char;
      index += 1;
      continue;
    }

    if (lastOutputChar !== undefined) {
      output = output.slice(0, -1);
    }

    index += 2;

    while (WHITESPACE_REGEX.test(code[index] ?? "")) {
      index += 1;
    }

    index = readTypeAssertionEnd(code, index);
  }

  return output;
};

const stripSatisfiesOperators = (code: string): string => {
  let output = "";
  let index = 0;

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      const endIndex = readStringEnd(code, index);
      output += code.slice(index, endIndex + 1);
      index = endIndex + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      const endIndex = readCommentEnd(code, index);
      output += code.slice(index, endIndex);
      index = endIndex;
      continue;
    }

    const isSatisfiesKeyword =
      code.slice(index, index + 9) === "satisfies" &&
      !isIdentifierChar(code[index - 1]) &&
      !isIdentifierChar(code[index + 9]);

    if (!isSatisfiesKeyword) {
      output += char;
      index += 1;
      continue;
    }

    const lastOutputChar = output.at(-1);

    if (lastOutputChar !== undefined && WHITESPACE_REGEX.test(lastOutputChar)) {
      output = output.slice(0, -1);
    }

    index += 9;

    while (WHITESPACE_REGEX.test(code[index] ?? "")) {
      index += 1;
    }

    index = readTypeAssertionEnd(code, index);
  }

  return output;
};

export const stripTypeScriptSyntax = (code: string): string => {
  const strippedCode = stripCodeFence(code)
    .replace(IMPORT_TYPE_REGEX, "")
    .replace(TYPE_DECLARATION_REGEX, "")
    .replace(INTERFACE_DECLARATION_REGEX, "")
    .replace(ASYNC_RETURN_TYPE_REGEX, "$1 =>")
    .replace(VARIABLE_TYPE_REGEX, "$1 $2 =");

  return stripArrowParameterTypes(
    stripSatisfiesOperators(stripAsAssertions(strippedCode))
  );
};

const readIdentifierEnd = (code: string, startIndex: number): number => {
  let index = startIndex;

  if (!IDENTIFIER_START_REGEX.test(code[index] ?? "")) {
    return -1;
  }

  while (isIdentifierChar(code[index])) {
    index += 1;
  }

  return index;
};

const readArrowTokenIndex = (code: string, startIndex: number): number => {
  let index = startIndex;

  while (index < code.length) {
    if (STRING_DELIMITERS.has(code[index])) {
      index = readStringEnd(code, index) + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      index = readCommentEnd(code, index);
      continue;
    }

    if (code.slice(index, index + 2) === "=>") {
      return index;
    }

    index += 1;
  }

  return -1;
};

const hasOnlyTrailingSemicolons = (
  code: string,
  startIndex: number
): boolean => {
  let index = skipWhitespaceAndComments(code, startIndex);

  while (code[index] === ";") {
    index = skipWhitespaceAndComments(code, index + 1);
  }

  return index >= code.length;
};

const readExpressionBodyEnd = (code: string, startIndex: number): number => {
  let index = startIndex;
  const delimiters: string[] = [];
  const closingToOpening: Record<string, string> = {
    ")": "(",
    "]": "[",
    "}": "{",
  };

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      index = readStringEnd(code, index) + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      index = readCommentEnd(code, index);
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      delimiters.push(char);
      index += 1;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      if (delimiters.at(-1) !== closingToOpening[char]) {
        return -1;
      }

      delimiters.pop();
      index += 1;
      continue;
    }

    if (char === ";" && delimiters.length === 0) {
      return index;
    }

    index += 1;
  }

  return delimiters.length === 0 ? code.length : -1;
};

export const isAsyncArrowFunctionCode = (code: string): boolean => {
  const strippedCode = stripTypeScriptSyntax(code);
  let index = skipWhitespaceAndComments(strippedCode, 0);

  if (
    strippedCode.slice(index, index + 5) !== "async" ||
    isIdentifierChar(strippedCode[index - 1]) ||
    isIdentifierChar(strippedCode[index + 5])
  ) {
    return false;
  }

  index = skipWhitespaceAndComments(strippedCode, index + 5);

  if (strippedCode[index] === "(") {
    const closeIndex = findClosingParen(strippedCode, index);

    if (closeIndex === -1) {
      return false;
    }

    index = closeIndex + 1;
  } else {
    const identifierEndIndex = readIdentifierEnd(strippedCode, index);

    if (identifierEndIndex === -1) {
      return false;
    }

    index = identifierEndIndex;
  }

  index = skipWhitespaceAndComments(strippedCode, index);

  if (strippedCode[index] === ":") {
    const arrowIndex = readArrowTokenIndex(strippedCode, index + 1);

    if (arrowIndex === -1) {
      return false;
    }

    index = arrowIndex;
  }

  if (strippedCode.slice(index, index + 2) !== "=>") {
    return false;
  }

  index = skipWhitespaceAndComments(strippedCode, index + 2);

  if (index >= strippedCode.length) {
    return false;
  }

  if (strippedCode[index] === "{") {
    const closeIndex = findClosingDelimiter(strippedCode, index, "{", "}");
    return (
      closeIndex !== -1 &&
      hasOnlyTrailingSemicolons(strippedCode, closeIndex + 1)
    );
  }

  const expressionEndIndex = readExpressionBodyEnd(strippedCode, index);
  return (
    expressionEndIndex !== -1 &&
    expressionEndIndex > index &&
    hasOnlyTrailingSemicolons(strippedCode, expressionEndIndex)
  );
};

export const hasCatchClause = (code: string): boolean => {
  let index = 0;

  while (index < code.length) {
    const char = code[index];

    if (STRING_DELIMITERS.has(char)) {
      index = readStringEnd(code, index) + 1;
      continue;
    }

    if (isLineCommentStart(code, index) || isBlockCommentStart(code, index)) {
      index = readCommentEnd(code, index);
      continue;
    }

    const isCatchKeyword =
      code.slice(index, index + CATCH_KEYWORD.length) === CATCH_KEYWORD &&
      !isIdentifierChar(code[index - 1]) &&
      !isIdentifierChar(code[index + CATCH_KEYWORD.length]);

    if (isCatchKeyword) {
      return true;
    }

    index += 1;
  }

  return false;
};

const maskIgnoredSpans = (code: string): string => {
  let output = "";
  let index = 0;

  while (index < code.length) {
    const ignoredEndIndex = readIgnoredSpanEnd(code, index);

    if (ignoredEndIndex !== null) {
      output += " ".repeat(ignoredEndIndex - index);
      index = ignoredEndIndex;
      continue;
    }

    output += code[index];
    index += 1;
  }

  return output;
};

export const hasObviousNonTerminatingLoop = (code: string): boolean => {
  const maskedCode = maskIgnoredSpans(code);
  return (
    EMPTY_FOR_LOOP_REGEX.test(maskedCode) ||
    TRUE_WHILE_LOOP_REGEX.test(maskedCode)
  );
};
