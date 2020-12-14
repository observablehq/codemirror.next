import {keymap, highlightSpecialChars, drawSelection} from "@observablehq/codemirror-next/view"
import {Extension, EditorState} from "@observablehq/codemirror-next/state"
import {history, historyKeymap} from "@observablehq/codemirror-next/history"
import {foldGutter, foldKeymap} from "@observablehq/codemirror-next/fold"
import {indentOnInput} from "@observablehq/codemirror-next/language"
import {lineNumbers} from "@observablehq/codemirror-next/gutter"
import {defaultKeymap} from "@observablehq/codemirror-next/commands"
import {bracketMatching} from "@observablehq/codemirror-next/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@observablehq/codemirror-next/closebrackets"
import {searchKeymap} from "@observablehq/codemirror-next/search"
import {autocompletion, completionKeymap} from "@observablehq/codemirror-next/autocomplete"
import {commentKeymap} from "@observablehq/codemirror-next/comment"
import {rectangularSelection} from "@observablehq/codemirror-next/rectangular-selection"
import {gotoLineKeymap} from "@observablehq/codemirror-next/goto-line"
import {highlightActiveLine, highlightSelectionMatches} from "@observablehq/codemirror-next/highlight-selection"
import {defaultHighlightStyle} from "@observablehq/codemirror-next/highlight"
import {lintKeymap} from "@observablehq/codemirror-next/lint"

/// This is an extension value that just pulls together a whole lot of
/// extensions that you might want in a basic editor. It is meant as a
/// convenient helper to quickly set up CodeMirror without installing
/// and importing a lot of packages.
///
/// Specifically, it includes...
///
///  - [the default command bindings](#commands.defaultKeymap)
///  - [line numbers](#gutter.lineNumbers)
///  - [special character highlighting](#view.highlightSpecialChars)
///  - [the undo history](#history.history)
///  - [a fold gutter](#fold.foldGutter)
///  - [custom selection drawing](#view.drawSelection)
///  - [multiple selections](#state.EditorState^allowMultipleSelections)
///  - [reindentation on input](#language.indentOnInput)
///  - [the default highlight style](#highlight.defaultHighlightStyle)
///  - [bracket matching](#matchbrackets.bracketMatching)
///  - [bracket closing](#closebrackets.closeBrackets)
///  - [autocompletion](#autocomplete.autocompletion)
///  - [rectangular selection](#rectangular-selection.rectangularSelection)
///  - [active line highlighting](#highlight-selection.highlightActiveLine)
///  - [selection match highlighting](#highlight-selection.highlightSelectionMatches)
///  - [search](#search.searchKeymap)
///  - [go to line](#goto-line.gotoLineKeymap)
///  - [commenting](#comment.commentKeymap)
///  - [linting](#lint.lintKeymap)
///
/// (You'll probably want to add some language package to your setup
/// too.)
///
/// This package does not allow customization. The idea is that, once
/// you decide you want to configure your editor more precisely, you
/// take this package's source (which is just a bunch of imports and
/// an array literal), copy it into your own code, and adjust it as
/// desired.
export const basicSetup: Extension = [
  lineNumbers(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle,
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...commentKeymap,
    ...gotoLineKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
]

export {EditorView} from "@observablehq/codemirror-next/view"
export {EditorState} from "@observablehq/codemirror-next/state"
