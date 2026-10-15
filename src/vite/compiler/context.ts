import type { CompilerContext, CompilerOptions, CompilerPlugin } from "./types";

export function createCompilerContext(options: CompilerOptions = {}): CompilerContext {
  const templateMap = new Map<string, string>();
  const importedHelpers = new Set<string>();
  let templateCounter = 0;
  const delegatedEvents = new Set<string>();
  const securityHelpers = new Set<string>();
  const plugins: CompilerPlugin[] = options.plugins ?? [];

  return {
    options,
    templateMap,
    get templateCounter() {
      return templateCounter;
    },
    set templateCounter(val: number) {
      templateCounter = val;
    },
    importedHelpers,
    delegatedEvents,
    securityHelpers,
    plugins,
    registerTemplate(html: string): string {
      let id = templateMap.get(html);
      if (!id) {
        id = `_tmpl$${++templateCounter}`;
        templateMap.set(html, id);
      }
      return id;
    },
    requireHelper(name: string): void {
      importedHelpers.add(name);
    },
    requireSecurityHelper(name: string): void {
      securityHelpers.add(name);
    },
    requireDelegatedEvent(name: string): void {
      delegatedEvents.add(name);
      importedHelpers.add("delegateEvents");
    }
  };
}
