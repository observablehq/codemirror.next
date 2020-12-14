import {parser} from "lezer-python"
import {continuedIndent, indentNodeProp, foldNodeProp, LezerLanguage} from "@observablehq/codemirror-next/language"
import {Extension} from "@observablehq/codemirror-next/state"
import {styleTags, tags as t} from "@observablehq/codemirror-next/highlight"

/// A language provider based on the [Lezer Python
/// parser](https://github.com/lezer-parser/python), extended with
/// highlighting and indentation information.
export const pythonLanguage = LezerLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Body: continuedIndent()
      }),
      foldNodeProp.add({
        Body(tree) { return {from: tree.from + 1, to: tree.to - 1} },
        ArrayExpression(tree) { return {from: tree.from + 1, to: tree.to - 1} },
        DictionaryExpression(tree) { return {from: tree.from + 1, to: tree.to - 1} }
      }),
      styleTags({
        "async '*' '**' FormatConversion": t.modifier,
        "for while if elif else try except finally return raise break continue with pass assert await yield": t.controlKeyword,
        "in not and or is del": t.operatorKeyword,
        "import from def class global nonlocal lambda": t.definitionKeyword,
        "with as print": t.keyword,
        self: t.self,
        Boolean: t.bool,
        None: t.null,
        VariableName: t.variableName,
        "CallExpression/VariableName": t.function(t.variableName),
        PropertyName: t.propertyName,
        "CallExpression/MemberExpression/ProperyName": t.function(t.propertyName),
        Comment: t.lineComment,
        Number: t.number,
        String: t.string,
        FormatString: t.special(t.string),
        UpdateOp: t.updateOperator,
        ArithOp: t.arithmeticOperator,
        BitOp: t.bitwiseOperator,
        CompareOp: t.compareOperator,
        AssignOp: t.definitionOperator,
        Ellipsis: t.punctuation,
        At: t.meta,
        "( )": t.paren,
        "[ ]": t.squareBracket,
        "{ }": t.brace,
        ".": t.derefOperator,
        ", ;": t.separator
      })
    ],
  }),
  languageData: {
    closeBrackets: {brackets: ["(", "[", "{", "'", '"', "'''", '"""']},
    commentTokens: {line: "#"},
    indentOnInput: /^\s*[\}\]\)]$/
  }
})

/// Returns an extension that installs the Python language.
export function python(): Extension {
  return pythonLanguage
}
