import plugin from "../plugin.json";
import { Copilot } from "./acode-copilot";

const toast = acode.require("toast");
const alert = acode.require("alert");

declare global {
  interface Window {
    Copilot: Copilot;
  }
}

class AcodePlugin {
  baseUrl!: string;
  private initialized: boolean = false;

  async init() {
    const observer = new MutationObserver(() => {
      this.checkAndLoadCopilot(observer);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const interval = setInterval(() => {
      if (editorManager.editor) {
        this.checkAndLoadCopilot(observer);
        clearInterval(interval);
      }
    }, 500);
  }

  private checkAndLoadCopilot(observer: MutationObserver) {
    const editor = editorManager.editor as AceAjax.Editor;
    if (!editor) return;

    const page = editorManager.container as HTMLElement;
    if (!page) return;

    const aceLines = page.querySelectorAll(
      ".ace_scroller .ace_layer.ace_text-layer .ace_line"
    );

    if (aceLines.length > 0) {
      if (!this.initialized) {
        this.initialized = true;

        observer.disconnect();
        new Copilot(editor, page).start();
      }
    }
  }
}

try {
  if (window.acode) {
    const acodePlugin = new AcodePlugin();
    acode.setPluginInit(
      plugin.id,
      async (
        baseUrl: string,
        $page: WCPage,
        { cacheFileUrl, cacheFile }: { cacheFileUrl: string; cacheFile: string }
      ) => {
        await acodePlugin.init();
      }
    );
  }
} catch (error) {
  console.error(error)
}
