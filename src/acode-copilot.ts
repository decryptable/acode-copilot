import { configs } from "./configs";
import plugin from "../plugin.json";

const toast = acode.require("toast");
const alert = acode.require("alert");

interface CompletionResponse {
  suggestion?: string;
  error?: string;
}

class Copilot {
  private editor: AceAjax.Editor;
  private aceLines: NodeListOf<Element>;
  private currentCodeLength: number;
  private lastSuggestion: string;
  private typingTimer: number | undefined;
  private typingDelay: number = 1000;

  private page: HTMLElement;

  constructor(editor: AceAjax.Editor, page: HTMLElement) {
    this.editor = editor;
    this.page = page;
    this.currentCodeLength = this.editor.getValue().length;
    this.lastSuggestion = "";
    this.aceLines = this.getAceLines();
  }

  public async start() {
    this.editor.on("input", () => this.handleInput());
    this.editor.commands.addCommand({
      name: "acceptSuggestion",
      bindKey: { win: "Ctrl-Delete", mac: "Command-Delete" },
      exec: () => this.acceptSuggestion(),
    });

    toast(
      `✨ ${plugin.name} started. Press "Ctrl + ." to accept suggestions`,
      3000
    );
  }

  private getAceLines(): NodeListOf<Element> {
    return this.page.querySelectorAll(
      ".ace_scroller .ace_layer.ace_text-layer .ace_line"
    );
  }

  private refreshAceLines() {
    this.aceLines = this.getAceLines();
  }

  private async fetchAICodeCompletion(code: string, aceLineIdx: number) {
    try {
      const response = await fetch(configs.API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
        }),
      });

      if (!response.ok) return;

      const result: CompletionResponse = await response.json();

      if (!result.suggestion) return;

      if (result.suggestion.length === 0) return;

      this.lastSuggestion = result.suggestion;

      this.addSuggestionToAceLine(aceLineIdx, this.lastSuggestion);
    } catch (error) {
      if (error instanceof TypeError) {
        alert(plugin.name, (error as TypeError).message);
      }
    }
  }

  private async addSuggestionToAceLine(aceLineIdx: number, code: string) {
    this.clearSuggestion();
    const line = this.aceLines[aceLineIdx] as HTMLElement;
    if (!line) return;

    const oldSuggestion = line.querySelector(".ace-suggestion");
    if (oldSuggestion) oldSuggestion.remove();

    const suggestionContainer = document.createElement("pre");
    suggestionContainer.className = "ace-suggestion";
    suggestionContainer.textContent = code;

    suggestionContainer.style.cssText = `
    color: gray;
    font-style: italic;
    opacity: 0.7;
    white-space: pre-wrap;
    word-wrap: break-word;
    display: inline;
    max-width: 100%;
    word-break: break-all;
  `;

    line.appendChild(suggestionContainer);

    line.style.display = "inline-table";

    const lineGroup = line.parentElement as HTMLElement;

    lineGroup.style.display = "inline-table";

    (lineGroup.parentElement as HTMLElement).style.display =
      "inline-table";
  }

  private clearSuggestion() {
    const styleTag = document.getElementById("dynamic-styles");
    if (styleTag) styleTag.innerHTML = "";
  }

  private handleInput() {
    this.refreshAceLines();

    if (this.editor.getValue().length !== this.currentCodeLength) {
      this.currentCodeLength = this.editor.getValue().length;

      clearTimeout(this.typingTimer);
      this.typingTimer = window.setTimeout(() => {
        const lastIdx = this.aceLines.length - 1;

        this.fetchAICodeCompletion(this.editor.getValue(), lastIdx);
      }, this.typingDelay);
    }
  }

  private acceptSuggestion() {
  if (this.lastSuggestion.length > 0) {
    const currentCode = this.editor.getValue();
    const newCode = currentCode + this.lastSuggestion;

    // Save cursor position before setting value
    const cursorPosition = this.editor.getCursorPosition();

    this.editor.setValue(newCode, -1); // Use -1 to preserve history & undo stack

    // Restore cursor position
    this.editor.moveCursorToPosition(cursorPosition);
    this.editor.focus();

    this.clearSuggestion();
    this.lastSuggestion = "";
  } else {
    toast("No suggestion available to accept", 1000);
  }
}

}

export { Copilot };
