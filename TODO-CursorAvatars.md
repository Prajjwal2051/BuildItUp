# Cursor Avatar Fix TODO

## Plan Steps

1. [ ] Remove cursorCss useMemo and <style> tag in playground-editor.tsx.
2. [ ] Replace decorationsRef → widgetsRef (Map for widget ids/instances).
3. [ ] Add ContentWidget interface implementation (factory function).
4. [ ] Replace decorations useEffect with widget management useEffect.
5. [ ] Add minimal cursor line decorations (before.content for border-left).
6. [ ] Update TODO after all edits.
7. [ ] Test and complete.

**Status:** Starting content widget implementation...
