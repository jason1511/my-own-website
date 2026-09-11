(() => {
  const input = document.getElementById('workshopBody');
  const editor = document.querySelector('[data-markdown-editor]');
  if (!input || !editor) return;
  const preview = editor.querySelector('[data-markdown-preview]');
  const toolbar = editor.querySelector('[data-markdown-toolbar]');
  const tabs = [...editor.querySelectorAll('[data-markdown-tab]')];
  const panels = [editor.querySelector('[data-markdown-write]'), preview];
  function mode(index, focus = false) {
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    toolbar.hidden = index === 1;
    if (index === 1) {
      window.portfolioMarkdown.render(preview, input.value);
      if (!input.value.trim()) preview.textContent = 'Your formatted description will appear here.';
    }
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => mode(index));
    tab.addEventListener('keydown', event => {
      if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        event.preventDefault(); mode(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index, true);
      }
    });
  });
  function format(action) {
    const start = input.selectionStart, end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    let from = start, to = end, replacement, caretStart, caretEnd;
    if (['heading','bullet','number'].includes(action)) {
      from = input.value.lastIndexOf('\n', start - 1) + 1;
      const searchEnd = end > start && input.value[end - 1] === '\n' ? end - 1 : end;
      const next = input.value.indexOf('\n', searchEnd);
      to = next < 0 ? input.value.length : next;
      const lines = input.value.slice(from, to).split('\n');
      replacement = lines.map((line, i) => action === 'heading' ? '## ' + line.replace(/^#{1,6}\s+/, '') : action === 'bullet' ? '- ' + line.replace(/^\s*(?:[-*+] |\d+\. )/, '') : `${i + 1}. ` + line.replace(/^\s*(?:[-*+] |\d+\. )/, '')).join('\n');
      caretStart = from; caretEnd = from + replacement.length;
    } else {
      const value = selected || (action === 'link' ? 'Link text' : 'text');
      const marker = action === 'bold' ? '**' : '*';
      replacement = action === 'link' ? `[${value}](https://example.com)` : marker + value + marker;
      caretStart = start + (action === 'link' ? value.length + 3 : marker.length);
      caretEnd = action === 'link' ? start + replacement.length - 1 : caretStart + value.length;
    }
    if (input.maxLength > 0 && input.value.length - (to - from) + replacement.length > input.maxLength) return;
    input.focus(); input.setRangeText(replacement, from, to, 'end'); input.setSelectionRange(caretStart, caretEnd);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  toolbar.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => format(button.dataset.format)));
  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && ['b','i'].includes(event.key.toLowerCase())) {
      event.preventDefault(); format(event.key.toLowerCase() === 'b' ? 'bold' : 'italic');
    }
  });
  input.form.addEventListener('reset', () => mode(0));
  window.addEventListener('hashchange', () => mode(0));
  window.hobbyMarkdownEditor = { reset: () => mode(0) };
  mode(0);
})();
