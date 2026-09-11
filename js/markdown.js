(() => {
  const tags = ['p','br','strong','em','del','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','hr','a','table','thead','tbody','tr','th','td'];
  window.portfolioMarkdown = {
    render(container, value) {
      const source = String(value || '');
      container.classList.add('markdown-content');
      if (!window.marked || !window.DOMPurify) {
        container.textContent = source;
        container.style.whiteSpace = 'pre-wrap';
        return;
      }
      container.style.whiteSpace = '';
      const html = window.marked.parse(source, { gfm: true, breaks: true, async: false });
      const fragment = window.DOMPurify.sanitize(html, {
        ALLOWED_TAGS: tags, ALLOWED_ATTR: ['href','title','start'], RETURN_DOM_FRAGMENT: true
      });
      fragment.querySelectorAll('a').forEach(link => {
        try {
          const url = new URL(link.getAttribute('href') || '', location.href);
          if (!['https:', 'http:', 'mailto:'].includes(url.protocol) || url.username || url.password) {
            link.removeAttribute('href'); return;
          }
          if (url.origin !== location.origin) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        } catch { link.removeAttribute('href'); }
      });
      // The page already has a title; keep description headings subordinate.
      fragment.querySelectorAll('h1').forEach(heading => {
        const replacement = document.createElement('h2');
        replacement.append(...heading.childNodes); heading.replaceWith(replacement);
      });
      container.replaceChildren(fragment);
    }
  };
})();
