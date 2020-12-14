import {tempEditor, requireFocus} from "./temp-editor"
import {EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType} from "@observablehq/codemirror-next/view"
import {EditorState} from "@observablehq/codemirror-next/state"
import ist from "ist"

function event(cm: EditorView, type: string) {
  cm.contentDOM.dispatchEvent(new CompositionEvent(type))
}

function up(node: Text, text: string = "", from = node.nodeValue!.length, to = from) {
  let val = node.nodeValue!
  node.nodeValue = val.slice(0, from) + text + val.slice(to)
  document.getSelection()!.collapse(node, from + text.length)
  return node
}

function hasCompositionDeco(cm: EditorView) {
  return cm.docView.compositionDeco.size > 0
}

function compose(cm: EditorView, start: () => Text,
                 update: ((node: Text) => void)[],
                 options: {end?: (node: Text) => void, cancel?: boolean} = {}) {
  event(cm, "compositionstart")
  let node!: Text, sel = document.getSelection()!
  for (let i = -1; i < update.length; i++) {
    if (i < 0) node = start()
    else update[i](node)
    let {focusNode, focusOffset} = sel
    cm.observer.flush()

    if (options.cancel && i == update.length - 1) {
      ist(!hasCompositionDeco(cm))
    } else {
      ist(node.parentNode && cm.contentDOM.contains(node.parentNode))
      ist(sel.focusNode, focusNode)
      ist(sel.focusOffset, focusOffset)
      ist(hasCompositionDeco(cm))
    }
  }
  event(cm, "compositionend")
  if (options.end) options.end(node)
  cm.observer.flush()
  cm.update([])
  ist(!cm.inputState.composing)
  ist(!hasCompositionDeco(cm))
}

function wordDeco(state: EditorState): DecorationSet {
  let re = /\w+/g, m, deco = [], text = state.doc.toString()
  while (m = re.exec(text))
    deco.push(Decoration.mark({class: "word"}).range(m.index, m.index + m[0].length))
  return Decoration.set(deco)
}

const wordHighlighter = EditorView.decorations.compute(["doc"], wordDeco)

function widgets(positions: number[], sides: number[]): ViewPlugin<any> {
  let xWidget = new class extends WidgetType {
    toDOM() { let s = document.createElement("var"); s.textContent = "×"; return s }
  }
  let startDeco = Decoration.set(positions.map((p, i) => Decoration.widget({widget: xWidget, side: sides[i]}).range(p)))
  return ViewPlugin.define(() => ({
    decorations: startDeco,
    update(update: ViewUpdate) { this.decorations = this.decorations.map(update.changes) }
  }), {decorations: v => v.decorations})
}

describe("Composition", () => {
  it("supports composition on an empty line", () => {
    let cm = requireFocus(tempEditor("foo\n\nbar"))
    compose(cm, () => up(cm.domAtPos(4).node.appendChild(document.createTextNode("a"))), [
      n => up(n, "b"),
      n => up(n, "c")
    ])
    ist(cm.state.doc.toString(), "foo\nabc\nbar")
  })

  it("supports composition at end of line in existing node", () => {
    let cm = requireFocus(tempEditor("foo"))
    compose(cm, () => up(cm.domAtPos(2).node as Text), [
      n => up(n, "!"),
      n => up(n, "?")
    ])
    ist(cm.state.doc.toString(), "foo!?")
  })

  it("supports composition at end of line in a new node", () => {
    let cm = requireFocus(tempEditor("foo"))
    compose(cm, () => up(cm.domAtPos(0).node.appendChild(document.createTextNode("!"))), [
      n => up(n, "?")
    ])
    ist(cm.state.doc.toString(), "foo!?")
  })

  it("supports composition at start of line in a new node", () => {
    let cm = requireFocus(tempEditor("foo"))
    compose(cm, () => {
      let l0 = cm.domAtPos(0).node
      return up(l0.insertBefore(document.createTextNode("!"), l0.firstChild))
    }, [
      n => up(n, "?")
    ])
    ist(cm.state.doc.toString(), "!?foo")
  })

  it("supports composition inside existing text", () => {
    let cm = requireFocus(tempEditor("foo"))
    compose(cm, () => up(cm.domAtPos(2).node as Text), [
      n => up(n, "x", 1),
      n => up(n, "y", 2),
      n => up(n, "z", 3)
    ])
    ist(cm.state.doc.toString(), "fxyzoo")
  })

  it("can deal with Android-style newline-after-composition", () => {
    let cm = requireFocus(tempEditor("abcdef"))
    compose(cm, () => up(cm.domAtPos(2).node as Text), [
      n => up(n, "x", 3),
      n => up(n, "y", 4)
    ], {end: n => {
      let line = n.parentNode!.appendChild(document.createElement("div"))
      line.textContent = "def"
      n.nodeValue = "abcxy"
      document.getSelection()!.collapse(line, 0)
    }})
    ist(cm.state.doc.toString(), "abcxy\ndef")
  })

  it("handles replacement of existing words", () => {
    let cm = requireFocus(tempEditor("one two three"))
    compose(cm, () => up(cm.domAtPos(1).node as Text, "five", 4, 7), [
      n => up(n, "seven", 4, 8),
      n => up(n, "zero", 4, 9)
    ])
    ist(cm.state.doc.toString(), "one zero three")
  })

  it("doesn't get interrupted by changes in decorations", () => {
    let cm = requireFocus(tempEditor("foo ...", [wordHighlighter]))
    compose(cm, () => up(cm.domAtPos(5).node as Text), [
      n => up(n, "hi", 1, 4)
    ])
    ist(cm.state.doc.toString(), "foo hi")
  })

  it("works inside highlighted text", () => {
    let cm = requireFocus(tempEditor("one two", [wordHighlighter]))
    compose(cm, () => up(cm.domAtPos(1).node as Text, "x"), [
      n => up(n, "y"),
      n => up(n, ".")
    ])
    ist(cm.state.doc.toString(), "onexy. two")
  })

  it("can handle compositions spanning multiple tokens", () => {
    let cm = requireFocus(tempEditor("one two", [wordHighlighter]))
    compose(cm, () => up(cm.domAtPos(5).node as Text, "a"), [
      n => up(n, "b"),
      n => up(n, "c")
    ], {end: n => {
      ;(n.parentNode!.previousSibling! as ChildNode).remove()
      ;(n.parentNode!.previousSibling! as ChildNode).remove()
      return up(n, "xyzone ", 0)
    }})
    ist(cm.state.doc.toString(), "xyzone twoabc")
  })

  it("doesn't overwrite widgets next to the composition", () => {
    let cm = requireFocus(tempEditor("", [widgets([0, 0], [-1, 1])]))
    compose(cm, () => {
      let l0 = cm.domAtPos(0).node
      return up(l0.insertBefore(document.createTextNode("a"), l0.lastChild))
    }, [n => up(n, "b", 0, 1)], {end: () => {
      ist(cm.contentDOM.querySelectorAll("var").length, 2)
    }})
    ist(cm.state.doc.toString(), "b")
  })

  it("cancels composition when a change fully overlaps with it", () => {
    let cm = requireFocus(tempEditor("one\ntwo\nthree"))
    compose(cm, () => up(cm.domAtPos(5).node as Text, "x"), [
      () => cm.dispatch({changes: {from: 2, to: 10, insert: "---"}})
    ], {cancel: true})
    ist(cm.state.doc.toString(), "on---hree")
  })

  it("cancels composition when a change partially overlaps with it", () => {
    let cm = requireFocus(tempEditor("one\ntwo\nthree"))
    compose(cm, () => up(cm.domAtPos(5).node as Text, "x", 0), [
      () => cm.dispatch({changes: {from: 5, to: 12, insert: "---"}})
    ], {cancel: true})
    ist(cm.state.doc.toString(), "one\nx---ee")
  })

  it("cancels composition when a change happens inside of it", () => {
    let cm = requireFocus(tempEditor("one\ntwo\nthree"))
    compose(cm, () => up(cm.domAtPos(5).node as Text, "x", 0), [
      () => cm.dispatch({changes: {from: 5, to: 6, insert: "!"}})
    ], {cancel: true})
    ist(cm.state.doc.toString(), "one\nx!wo\nthree")
  })

  it("doesn't cancel composition when a change happens elsewhere", () => {
    let cm = requireFocus(tempEditor("one\ntwo\nthree"))
    compose(cm, () => up(cm.domAtPos(5).node as Text, "x", 0), [
      n => up(n, "y", 1),
      () => cm.dispatch({changes: {from: 1, to: 2, insert: "!"}}),
      n => up(n, "z", 2)
    ])
    ist(cm.state.doc.toString(), "o!e\nxyztwo\nthree")
  })

  it("doesn't cancel composition when the composition is moved into a new line", () => {
    let cm = requireFocus(tempEditor("one\ntwo three", [wordHighlighter]))
    compose(cm, () => up(cm.domAtPos(9).node as Text, "x"), [
      n => up(n, "y"),
      () => cm.dispatch({changes: {from: 4, insert: "\n"}}),
      n => up(n, "z")
    ])
    ist(cm.state.doc.toString(), "one\n\ntwo threexyz")
  })

  it("doesn't cancel composition when a line break is inserted in front of it", () => {
    let cm = requireFocus(tempEditor("one two three", [wordHighlighter]))
    compose(cm, () => up(cm.domAtPos(9).node as Text, "x"), [
      n => up(n, "y"),
      () => cm.dispatch({changes: {from: 8, insert: "\n"}}),
      n => up(n, "z")
    ])
    ist(cm.state.doc.toString(), "one two \nthreexyz")
  })

  it("doesn't cancel composition when a newline is added immediately in front", () => {
    let cm = requireFocus(tempEditor("one\ntwo three", [wordHighlighter]))
    compose(cm, () => up(cm.domAtPos(9).node as Text, "x"), [
      n => up(n, "y"),
      () => cm.dispatch({changes: {from: 7, to: 8, insert: "\n"}}),
      n => up(n, "z")
    ])
    ist(cm.state.doc.toString(), "one\ntwo\nthreexyz")
  })

  it("handles compositions rapidly following each other", () => {
    let cm = requireFocus(tempEditor("one\ntwo"))
    event(cm, "compositionstart")
    let one = cm.domAtPos(1).node as Text
    up(one, "!")
    cm.observer.flush()
    event(cm, "compositionend")
    one.nodeValue = "one!!"
    let L2 = cm.contentDOM.lastChild
    event(cm, "compositionstart")
    let two = cm.domAtPos(7).node as Text
    ist(cm.contentDOM.lastChild, L2)
    up(two, ".")
    cm.observer.flush()
    ist(hasCompositionDeco(cm))
    ist(getSelection()!.focusNode, two)
    ist(getSelection()!.focusOffset, 4)
    ist(cm.inputState.composing)
    event(cm, "compositionend")
    cm.observer.flush()
    ist(cm.state.doc.toString(), "one!!\ntwo.")
  })
})
