import {tempEditor} from "./temp-editor"
import {StateField} from "@observablehq/codemirror-next/state"
import {Decoration, DecorationSet, EditorView, WidgetType} from "@observablehq/codemirror-next/view"
import ist from "ist"

function flush(cm: EditorView) {
  cm.observer.flush()
}

describe("DOM changes", () => {
  it("notices text changes", () => {
    let cm = tempEditor("foo\nbar")
    cm.domAtPos(1).node.nodeValue = "froo"
    flush(cm)
    ist(cm.state.doc.toString(), "froo\nbar")
  })

  it("handles browser enter behavior", () => {
    let cm = tempEditor("foo\nbar"), line0 = cm.domAtPos(0).node
    line0.appendChild(document.createElement("br"))
    line0.appendChild(document.createElement("br"))
    flush(cm)
    ist(cm.state.doc.toString(), "foo\n\nbar")
  })

  it("supports deleting lines", () => {
    let cm = tempEditor("1\n2\n3\n4\n5\n6")
    for (let i = 0, lineDOM = cm.domAtPos(0).node.parentNode!; i < 4; i++) lineDOM.childNodes[1].remove()
    flush(cm)
    ist(cm.state.doc.toString(), "1\n6")
  })

  it("can deal with large insertions", () => {
    let cm = tempEditor("okay")
    let node = document.createElement("div")
    node.textContent = "ayayayayayay"
    for (let i = 0, lineDOM = cm.domAtPos(0).node.parentNode!; i < 100; i++) lineDOM.appendChild(node.cloneNode(true))
    flush(cm)
    ist(cm.state.doc.toString(), "okay" + "\nayayayayayay".repeat(100))
  })

  it("properly handles selection for ambiguous backspace", () => {
    let cm = tempEditor("foo")
    cm.dispatch({selection: {anchor: 2}})
    cm.domAtPos(1).node.nodeValue = "fo"
    cm.inputState.lastKeyCode = 8
    cm.inputState.lastKeyTime = Date.now()
    flush(cm)
    ist(cm.state.selection.primary.anchor, 1)
  })

  it("notices text changes at the end of a long document", () => {
    let cm = tempEditor("foo\nbar\n".repeat(15))
    cm.domAtPos(8*15).node.textContent = "a"
    flush(cm)
    ist(cm.state.doc.toString(), "foo\nbar\n".repeat(15) + "a")
  })

  it("handles replacing a selection with a prefix of itself", () => {
    let cm = tempEditor("foo\nbar")
    cm.dispatch({selection: {anchor: 0, head: 7}})
    cm.contentDOM.textContent = "f"
    flush(cm)
    ist(cm.state.doc.toString(), "f")
  })

  it("handles replacing a selection with a suffix of itself", () => {
    let cm = tempEditor("foo\nbar")
    cm.dispatch({selection: {anchor: 0, head: 7}})
    cm.contentDOM.textContent = "r"
    flush(cm)
    ist(cm.state.doc.toString(), "r")
  })

  it("handles replacing a selection with a prefix of itself and something else", () => {
    let cm = tempEditor("foo\nbar")
    cm.dispatch({selection: {anchor: 0, head: 7}})
    cm.contentDOM.textContent = "fa"
    flush(cm)
    ist(cm.state.doc.toString(), "fa")
  })

  it("handles replacing a selection with a suffix of itself and something else", () => {
    let cm = tempEditor("foo\nbar")
    cm.dispatch({selection: {anchor: 0, head: 7}})
    cm.contentDOM.textContent = "br"
    flush(cm)
    ist(cm.state.doc.toString(), "br")
  })

  it("handles replacing a selection with new content that shares a prefix and a suffix", () => {
    let cm = tempEditor("foo\nbar")
    cm.dispatch({selection: {anchor: 1, head: 6}})
    cm.contentDOM.textContent = "fo--ar"
    flush(cm)
    ist(cm.state.doc.toString(), "fo--ar")
  })

  it("handles appending", () => {
    let cm = tempEditor("foo\nbar")
    cm.dispatch({selection: {anchor: 7}})
    cm.contentDOM.appendChild(document.createElement("div"))
    flush(cm)
    ist(cm.state.doc.toString(), "foo\nbar\n")
  })

  it("handles deleting the first line and the newline after it", () => {
    let cm = tempEditor("foo\nbar\n\nbaz")
    cm.contentDOM.innerHTML = "bar<div><br></div><div>baz</div>"
    flush(cm)
    ist(cm.state.doc.toString(), "bar\n\nbaz")
  })

  it("handles deleting a line with an empty line after it", () => {
    let cm = tempEditor("foo\nbar\n\nbaz")
    cm.contentDOM.innerHTML = "<div>foo</div><br><div>baz</div>"
    flush(cm)
    ist(cm.state.doc.toString(), "foo\n\nbaz")
  })

  it("doesn't drop collapsed text", () => {
    let field = StateField.define<DecorationSet>({
      create() { return Decoration.set(Decoration.replace({}).range(1, 3)) },
      update() { return Decoration.none },
      provide: [EditorView.decorations]
    })
    let cm = tempEditor("abcd", [field])
    cm.domAtPos(0).node.firstChild!.textContent = "x"
    flush(cm)
    ist(cm.state.doc.toString(), "xbcd")
  })

  it("preserves text nodes when edited in the middle", () => {
    let cm = tempEditor("abcd"), text = cm.domAtPos(1).node
    text.textContent = "axxd"
    flush(cm)
    ist(cm.domAtPos(1).node, text)
  })

  it("preserves text nodes when edited at the start", () => {
    let cm = tempEditor("abcd"), text = cm.domAtPos(1).node
    text.textContent = "xxcd"
    flush(cm)
    ist(cm.domAtPos(1).node, text)
  })

  it("preserves text nodes when edited at the end", () => {
    let cm = tempEditor("abcd"), text = cm.domAtPos(1).node
    text.textContent = "abxx"
    flush(cm)
    ist(cm.domAtPos(1).node, text)
  })

  it("doesn't insert newlines for block widgets", () => {
    class Widget extends WidgetType {
      toDOM() { return document.createElement("div") }
    }
    let field = StateField.define<DecorationSet>({
      create() { return Decoration.set(Decoration.widget({widget: new Widget }).range(4)) },
      update(v) { return v },
      provide: [EditorView.decorations]
    })
    let cm = tempEditor("abcd", [field])
    cm.domAtPos(0).node.appendChild(document.createTextNode("x"))
    flush(cm)
    ist(cm.state.doc.toString(), "abcdx")
  })

  it("calls input handlers", () => {
    let cm = tempEditor("abc", [EditorView.inputHandler.of((_v, from, to, insert) => {
      cm.dispatch({changes: {from, to, insert: insert.toUpperCase()}})
      return true
    })])
    cm.domAtPos(0).node.appendChild(document.createTextNode("d"))
    flush(cm)
    ist(cm.state.doc.toString(), "abcD")
  })
})
